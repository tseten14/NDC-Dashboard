#!/usr/bin/env node
/**
 * Checks that no secret ended up in the JavaScript sent to browsers.
 *
 * This exists because it already happened. The passphrase guarding the import
 * endpoints was configured as VITE_INGEST_API_KEY, and anything with that
 * prefix is compiled into the public bundle by design — so the secret was
 * printed in the page source of every deployment while appearing, in the
 * source code, to be properly guarded.
 *
 * Reading the code would not have caught it; only reading the build output
 * would. So that is what this does. It runs against the built files and fails
 * the build if it finds either the literal value of a secret from .env, or
 * anything shaped like a credential.
 *
 * Run after a build:  npm run build && npm run scan:secrets
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Vite's root is the frontend directory, so its default output lands in
 * frontend/dist rather than the repo root. Both are checked so this keeps
 * working if the build config moves.
 */
function resolveBuildDir() {
  if (process.argv[2]) return path.resolve(process.argv[2]);
  for (const candidate of [path.join(repoRoot, "frontend", "dist"), path.join(repoRoot, "dist")]) {
    if (existsSync(candidate)) return candidate;
  }
  return path.join(repoRoot, "frontend", "dist");
}

const buildDir = resolveBuildDir();

/**
 * Environment names that are *supposed* to reach the browser.
 *
 * Everything else in .env is treated as a secret whose value must not appear in
 * the output. VITE_API_BASE_URL is a public address, not a credential.
 */
const PUBLIC_PREFIXES = ["VITE_API_BASE_URL", "VITE_APP_", "NODE_ENV", "MODE"];

/**
 * Shapes that identify a credential regardless of which variable held it.
 * Catches a key pasted directly into source, which no .env comparison would.
 */
const CREDENTIAL_PATTERNS = [
  { name: "OpenAI key", re: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { name: "Anthropic key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}/ },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/ },
  { name: "Supabase service-role key", re: /\bsb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "Postgres connection string with password", re: /postgres(?:ql)?:\/\/[^\s:@/"']+:[^\s:@/"']+@/ },
  { name: "JSON Web Token", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\./ },
];

function readEnvSecrets() {
  const envPath = path.join(repoRoot, ".env");
  if (!existsSync(envPath)) return [];
  const secrets = [];
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (PUBLIC_PREFIXES.some((p) => key.startsWith(p))) continue;
    // Short values produce false positives ("true", "8787", "info").
    if (value.length < 12) continue;
    secrets.push({ key, value });
  }
  return secrets;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function main() {
  if (!existsSync(buildDir)) {
    console.error(`No build output at ${buildDir}. Run "npm run build" first.`);
    process.exit(1);
  }

  const files = walk(buildDir).filter((f) => /\.(js|mjs|cjs|css|html|json|map)$/.test(f));
  const secrets = readEnvSecrets();
  const findings = [];

  for (const file of files) {
    let contents;
    try {
      contents = readFileSync(file, "utf8");
    } catch {
      continue; // binary asset
    }
    const rel = path.relative(repoRoot, file);

    for (const { key, value } of secrets) {
      if (contents.includes(value)) {
        findings.push(`${rel}: contains the value of ${key} from .env`);
      }
    }
    for (const { name, re } of CREDENTIAL_PATTERNS) {
      if (re.test(contents)) {
        findings.push(`${rel}: contains something shaped like a ${name}`);
      }
    }
  }

  console.log(`Scanned ${files.length} build files in ${path.relative(repoRoot, buildDir) || "."}`);
  if (secrets.length === 0) {
    console.log("No local .env found (or no secret-shaped values in it) — pattern checks only.");
  } else {
    console.log(`Compared against ${secrets.length} server-side value(s) from .env.`);
  }

  if (findings.length) {
    // Deliberately reports the variable name and file, never the value — this
    // output goes to CI logs, which are usually more widely readable than .env.
    console.error("\nSECRET EXPOSED IN BUILD OUTPUT:");
    for (const f of new Set(findings)) console.error(`  - ${f}`);
    console.error(
      "\nAnything with a VITE_ prefix is compiled into the public bundle. Move the value to a\n" +
        "server-side variable and read it in the API instead. See SECURITY.md.",
    );
    process.exit(1);
  }

  console.log("No secrets found in build output.");
}

main();
