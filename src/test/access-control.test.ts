import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Server Actions and Route Handlers are public endpoints: each exported
// function must check who is calling before doing anything.

const ROOT = join(__dirname, "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

/** Exported functions of a module with the text of their body. */
function exportedFunctions(path: string) {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  return source.statements.flatMap((node) =>
    ts.isFunctionDeclaration(node) &&
    node.name &&
    node.body &&
    node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      ? [{ name: node.name.text, body: node.body.getText(source) }]
      : [],
  );
}

const isServerActionModule = (path: string) =>
  /\.tsx?$/.test(path) &&
  !/\.test\.tsx?$/.test(path) &&
  /^\s*["']use server["']/.test(readFileSync(path, "utf8"));

// Endpoints that legitimately run without an admin session, and why.
const PUBLIC: Record<string, RegExp> = {
  // Anyone may try to sign in: rate-limited, audited on success.
  "features/auth/actions.ts#login": /authenticate\(/,
  // Signs out whoever is signed in; nothing to protect.
  "features/auth/actions.ts#logout": /getSession\(/,
  // A temporary password must be replaceable before requireAdmin passes.
  "features/auth/actions.ts#changePasswordAction": /getSession\(/,
  // Vercel Cron, authenticated by the shared secret.
  "app/api/cron/snapshot/route.ts#GET": /CRON_SECRET/,
  // JSON 401 for the polling bell instead of a redirect.
  "app/api/notifications/route.ts#GET": /getSession\(\)[\s\S]*status: 401/,
};

const endpoints = [
  ...files(ROOT).filter(isServerActionModule),
  ...files(join(ROOT, "app", "api")).filter((p) => p.endsWith("route.ts")),
].flatMap((path) =>
  exportedFunctions(path).map((fn) => ({
    id: `${relative(ROOT, path).replaceAll("\\", "/")}#${fn.name}`,
    body: fn.body,
  })),
);

describe("access control", () => {
  it("finds the endpoints to check", () => {
    expect(endpoints.length).toBeGreaterThan(20);
  });

  it.each(endpoints.map((e) => [e.id, e.body] as const))(
    "%s checks the caller",
    (id, body) => {
      const rule = PUBLIC[id];
      if (rule) expect(body).toMatch(rule);
      else expect(body).toMatch(/await requireAdmin\(/);
    },
  );

  // requireAdmin() alone only means "any admin, read-only included".
  const READ_ONLY = new Set([
    "features/activity/actions.ts#loadMoreActivityAction",
    // The reader's own position in the feed, not shared data.
    "features/notifications/actions.ts#markNotificationsReadAction",
  ]);

  it.each(
    endpoints
      .filter((e) => /await requireAdmin\(\)/.test(e.body))
      .map((e) => [e.id] as const),
  )("%s may run for read-only admins", (id) => {
    expect(READ_ONLY.has(id)).toBe(true);
  });

  it("lists no public endpoint that no longer exists", () => {
    const ids = new Set(endpoints.map((e) => e.id));
    expect(Object.keys(PUBLIC).filter((id) => !ids.has(id))).toEqual([]);
  });
});
