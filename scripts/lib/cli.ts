const args = process.argv.slice(2);

export function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

export function getArg(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  const value = index === -1 ? undefined : args[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

/**
 * Chooses the database a script writes to. Must run before anything reads
 * the server env. `--aws` targets real AWS with the default credential chain
 * (AWS CLI profile); otherwise DynamoDB Local is required.
 */
export function prepareTarget(): "aws" | "local" {
  if (hasFlag("aws")) {
    delete process.env.DYNAMODB_ENDPOINT;
    delete process.env.AWS_ROLE_ARN;
    return "aws";
  }
  if (!process.env.DYNAMODB_ENDPOINT) {
    throw new Error(
      "DYNAMODB_ENDPOINT manquant. Ajoutez-le à .env.local pour DynamoDB Local, ou passez --aws pour cibler AWS.",
    );
  }
  return "local";
}

export function run(main: () => Promise<void>): void {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
