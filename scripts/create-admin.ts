import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import {
  createUser,
  findUserByEmail,
  setPassword,
} from "../src/features/users/repository";
import { hashPassword } from "../src/lib/auth/password";
import { isAdminRole, ROLE_LABELS } from "../src/lib/auth/permissions";
import { deleteUserSessions } from "../src/lib/auth/session-repository";
import { getServerEnv } from "../src/lib/env";
import { getArg, prepareTarget, run } from "./lib/cli";

// pnpm admin:create                         → DynamoDB Local
// pnpm admin:create -- --aws                → AWS (local AWS CLI credentials)
// Options: --email x --name "Jane Doe" --role SUPER_ADMIN|ADMIN|VIEWER

const MIN_PASSWORD_LENGTH = 12;

// readline has no option to hide input: its echo goes through this stream,
// which drops everything while a password is typed.
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
// One interface for the whole run: several would each read ahead and lose
// the rest of piped input.
const rl = createInterface({
  input: process.stdin,
  output,
  terminal: process.stdin.isTTY ?? false,
});

// The async iterator buffers lines, so piped answers are not lost between questions.
const lines = rl[Symbol.asyncIterator]();

async function readLine(): Promise<string> {
  const { value, done } = await lines.next();
  if (done) throw new Error("Saisie interrompue.");
  return value;
}

async function ask(question: string): Promise<string> {
  output.write(question);
  return (await readLine()).trim();
}

async function askHidden(question: string): Promise<string> {
  output.write(question);
  muted = true;
  try {
    return await readLine();
  } finally {
    muted = false;
    output.write("\n");
  }
}

async function askNewPassword(): Promise<string> {
  for (;;) {
    const password = await askHidden(
      `Mot de passe (${MIN_PASSWORD_LENGTH} caractères minimum) : `,
    );
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.log("Trop court.");
      continue;
    }
    if ((await askHidden("Confirmez le mot de passe : ")) !== password) {
      console.log("Les mots de passe ne correspondent pas.");
      continue;
    }
    return password;
  }
}

run(async () => {
  try {
    await main();
  } finally {
    rl.close();
  }
});

async function main() {
  const target = prepareTarget();
  const env = getServerEnv();
  console.log(
    `Cible : ${target === "aws" ? `AWS ${env.AWS_REGION}` : env.DYNAMODB_ENDPOINT} (tables ${env.DYNAMODB_TABLE_PREFIX}*)`,
  );

  const email = getArg("email") ?? (await ask("Email : "));
  const existing = await findUserByEmail(email);

  if (existing) {
    const confirm = await ask(
      `${existing.email} existe déjà. Réinitialiser son mot de passe ? (o/N) `,
    );
    if (confirm.toLowerCase() !== "o") return;
    await setPassword(existing.id, await hashPassword(await askNewPassword()));
    const closed = await deleteUserSessions(existing.id);
    console.log(`Mot de passe changé, ${closed} session(s) fermée(s).`);
    return;
  }

  const name = getArg("name") ?? (await ask("Nom : "));
  const role = getArg("role") ?? "SUPER_ADMIN";
  if (!isAdminRole(role)) {
    throw new Error("Rôle invalide : SUPER_ADMIN, ADMIN ou VIEWER.");
  }
  const user = await createUser({
    name,
    email,
    role,
    passwordHash: await hashPassword(await askNewPassword()),
  });
  console.log(`Compte créé : ${user.email} (${ROLE_LABELS[role]}).`);
}
