# Déploiement de la base DynamoDB sur AWS

Ce guide relie le site Vercel `tynoc-dashboard` à DynamoDB dans ton compte AWS, **sans clé AWS stockée** : Vercel obtient des identifiants temporaires en présentant un jeton OIDC à un rôle IAM.

Remplace dans tout le guide :

| Valeur         | Exemple                                 |
| -------------- | --------------------------------------- |
| `<ACCOUNT_ID>` | identifiant à 12 chiffres du compte AWS |
| `<REGION>`     | `eu-west-3` (Paris)                     |

## 1. Créer les tables depuis ton poste

Il faut un utilisateur ou un profil AWS CLI ayant le droit de créer des tables (administrateur du compte par exemple), utilisé **uniquement depuis ton poste**.

```bash
aws configure            # région : <REGION>
pnpm db:create -- --aws  # crée les 10 tables tynoc-* et active le TTL
```

La commande est idempotente : la relancer ne recrée rien.

## 2. Créer le premier super administrateur

```bash
pnpm admin:create -- --aws
```

Saisis l'email, le nom et un mot de passe d'au moins 12 caractères (il ne s'affiche pas). La même commande avec un email existant réinitialise le mot de passe et ferme les sessions ouvertes.

## 3. Activer OIDC sur le projet Vercel

Vercel → projet `tynoc-dashboard` → **Settings → Security → Secure backend access with OIDC federation** → activer, mode **Team** (émetteur `https://oidc.vercel.com/nagoloum`).

## 4. Déclarer Vercel comme fournisseur d'identité dans IAM

AWS → IAM → **Identity providers → Add provider** :

- type : **OpenID Connect**
- URL du fournisseur : `https://oidc.vercel.com/nagoloum`
- audience : `https://vercel.com/nagoloum`

## 5. Créer le rôle assumé par Vercel

IAM → **Roles → Create role → Web identity**, fournisseur `oidc.vercel.com/nagoloum`, audience `https://vercel.com/nagoloum`. Nom : `tynoc-dashboard-vercel`.

Politique de confiance (onglet _Trust relationships_), limitée à la **production** de ce projet :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/oidc.vercel.com/nagoloum"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.vercel.com/nagoloum:aud": "https://vercel.com/nagoloum",
          "oidc.vercel.com/nagoloum:sub": "owner:nagoloum:project:tynoc-dashboard:environment:production"
        }
      }
    }
  ]
}
```

Politique d'accès (inline, nommée `tynoc-dynamodb`) : lecture et écriture de données uniquement, sur les tables `tynoc-*` et leurs index. Aucune action d'administration (création ou suppression de table).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:BatchGetItem",
        "dynamodb:Query",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:ConditionCheckItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:<REGION>:<ACCOUNT_ID>:table/tynoc-*",
        "arn:aws:dynamodb:<REGION>:<ACCOUNT_ID>:table/tynoc-*/index/*"
      ]
    }
  ]
}
```

Les transactions (`TransactWriteItems`) sont autorisées par les actions individuelles qu'elles contiennent (`PutItem`, `UpdateItem`, `ConditionCheckItem`).

## 6. Variables d'environnement Vercel (production)

| Variable                | Valeur                                                  |
| ----------------------- | ------------------------------------------------------- |
| `AWS_ROLE_ARN`          | `arn:aws:iam::<ACCOUNT_ID>:role/tynoc-dashboard-vercel` |
| `AWS_REGION`            | `<REGION>`                                              |
| `DYNAMODB_TABLE_PREFIX` | `tynoc-`                                                |

Ne **pas** définir `DYNAMODB_ENDPOINT` en production.

```bash
vercel env add AWS_ROLE_ARN production
vercel env add AWS_REGION production
vercel env add DYNAMODB_TABLE_PREFIX production
vercel deploy --prod
```

## 7. Vérifier

```bash
E2E_BASE_URL=https://tynoc-dashboard.vercel.app \
E2E_ADMIN_EMAIL=<email du super admin> \
E2E_ADMIN_PASSWORD=<mot de passe> \
pnpm test:e2e
```

Les tests qui dépendent des comptes de test locaux (lecteur, client) sont ignorés automatiquement.

## Déploiements de preview

La politique de confiance n'autorise que la production. Sur une URL de preview, la connexion échoue avec « Connexion impossible pour le moment ». Pour tester des previews, créer des tables séparées (préfixe `tynoc-preview-`) et un second rôle dont la condition `sub` se termine par `environment:preview`.
