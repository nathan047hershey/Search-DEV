/**
 * Deploy this app to Vercel from the CLI.
 *
 * Usage:
 *   node scripts/deploy-vercel.mjs
 *
 * Requires: `npx vercel login` once (device auth in the browser).
 * Reads non-empty keys from `.env.local` and upserts them as Production env vars.
 * Never prints secret values.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const ENV_KEYS = [
  "GITHUB_TOKEN",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "GITHUB_ID",
  "GITHUB_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "RESEND_REPLY_TO",
  "EMAIL_SEND_GAP_MINUTES",
  "MINIMAX_API_KEY",
  "MINIMAX_MODEL",
  "MINIMAX_BASE_URL",
  "HUNTER_API_KEY",
];

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    shell: true,
    stdio: opts.input != null ? ["pipe", "pipe", "pipe"] : "inherit",
    input: opts.input,
    env: process.env,
  });
  if (result.status !== 0 && !opts.allowFail) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(err || `${cmd} ${args.join(" ")} failed (${result.status})`);
  }
  return result;
}

function parseEnvLocal(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function vercel(args, opts = {}) {
  return run("npx", ["--yes", "vercel@latest", ...args], opts);
}

console.log("Checking Vercel auth…");
const who = run("npx", ["--yes", "vercel@latest", "whoami"], { allowFail: true });
if (who.status !== 0) {
  console.error(
    "Not logged in. Run: npx vercel login\nThen re-run: node scripts/deploy-vercel.mjs"
  );
  process.exit(1);
}
console.log("Logged in as:", (who.stdout || "").trim());

console.log("Linking / deploying project…");
vercel([
  "deploy",
  "--prod",
  "--yes",
  "--name",
  "search-dev-github",
]);

const local = parseEnvLocal(path.join(root, ".env.local"));
const setKeys = [];
for (const key of ENV_KEYS) {
  const value = local[key];
  if (value == null || !String(value).trim()) continue;
  // Skip obvious placeholders
  if (/^your_|^replace_with_/i.test(value)) continue;

  // Remove existing production value (ignore failure), then add
  run(
    "npx",
    ["--yes", "vercel@latest", "env", "rm", key, "production", "--yes"],
    { allowFail: true }
  );
  const add = run(
    "npx",
    ["--yes", "vercel@latest", "env", "add", key, "production", "--force"],
    { input: `${value}\n`, allowFail: true }
  );
  if (add.status === 0) setKeys.push(key);
  else console.warn(`Could not set ${key} (set it in the Vercel dashboard).`);
}

console.log(
  setKeys.length
    ? `Set ${setKeys.length} production env keys: ${setKeys.join(", ")}`
    : "No .env.local keys were uploaded (file missing or empty)."
);

// Redeploy so env vars apply
console.log("Redeploying production with env vars…");
const redeploy = vercel(["deploy", "--prod", "--yes"], { allowFail: true });
if (redeploy.status !== 0) {
  console.warn("Redeploy failed — trigger Redeploy in the Vercel dashboard once.");
}

console.log("Done. Open the Production URL from the deploy output above.");
console.log(
  "Then set NEXTAUTH_URL to that https://….vercel.app URL and redeploy if auth redirects fail."
);
