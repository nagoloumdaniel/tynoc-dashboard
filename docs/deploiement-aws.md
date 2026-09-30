# Déploiement sur AWS (DynamoDB, S3)

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

## 6. Bucket des images produits (S3)

```bash
pnpm db:create -- --aws --bucket tynoc-dashboard-images-<ACCOUNT_ID>
# option : --origin https://mon-domaine.fr (site autorisé à envoyer des images)
```

Le script crée le bucket dans `<REGION>` et applique ses règles (idempotent) :

- lecture publique de `products/*` uniquement (le reste du bucket et la liste des objets restent privés) ;
- CORS : `POST` depuis `https://tynoc-dashboard.vercel.app` (ou `--origin`) ;
- blocage d'accès public : ACL bloquées, politique publique autorisée (nécessaire pour la règle ci-dessus).

Les images sont envoyées directement par le navigateur via un POST présigné (clé, type `image/jpeg|png|webp` et taille 1 o – 5 Mo imposés par la signature). Ajouter au rôle Vercel (politique en ligne `tynoc-s3-images`) :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProductImages",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::tynoc-dashboard-images-<ACCOUNT_ID>/products/*"
    },
    {
      "Sid": "ListProductImagesForCleanup",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::tynoc-dashboard-images-<ACCOUNT_ID>",
      "Condition": {
        "StringLike": { "s3:prefix": ["products/*", "products/"] }
      }
    }
  ]
}
```

`s3:ListBucket` (limité au préfixe `products/`) sert au cron hebdomadaire `/api/cron/cleanup-images`, qui efface les fichiers envoyés mais jamais rattachés à un produit depuis plus de 24 h.

Vérification : `https://<bucket>.s3.<REGION>.amazonaws.com/products/<fichier>` répond 200, toute autre clé et la racine du bucket répondent 403.

## 7. Variables d'environnement Vercel (production)

| Variable                | Valeur                                                  |
| ----------------------- | ------------------------------------------------------- |
| `AWS_ROLE_ARN`          | `arn:aws:iam::<ACCOUNT_ID>:role/tynoc-dashboard-vercel` |
| `AWS_REGION`            | `<REGION>`                                              |
| `DYNAMODB_TABLE_PREFIX` | `tynoc-`                                                |
| `S3_BUCKET`             | `tynoc-dashboard-images-<ACCOUNT_ID>`                   |
| `CRON_SECRET`           | valeur aléatoire de 16 caractères ou plus               |

Ne **pas** définir `DYNAMODB_ENDPOINT` ni `S3_ENDPOINT` en production. `S3_BUCKET` est aussi lu au build (`next.config.ts`, domaine autorisé pour `next/image`) : redéployer après l'avoir modifié.

```bash
vercel env add AWS_ROLE_ARN production
vercel env add AWS_REGION production
vercel env add DYNAMODB_TABLE_PREFIX production
vercel env add S3_BUCKET production
vercel env add CRON_SECRET production
vercel deploy --prod
```

## 8. Vérifier

```bash
E2E_BASE_URL=https://tynoc-dashboard.vercel.app \
E2E_ADMIN_EMAIL=<email du super admin> \
E2E_ADMIN_PASSWORD=<mot de passe> \
pnpm test:e2e
```

Les tests qui dépendent des comptes de test locaux (lecteur, client) sont ignorés automatiquement.

## Déploiements de preview

La politique de confiance n'autorise que la production. Sur une URL de preview, la connexion échoue avec « Connexion impossible pour le moment ». Pour tester des previews, créer des tables séparées (préfixe `tynoc-preview-`) et un second rôle dont la condition `sub` se termine par `environment:preview`.
