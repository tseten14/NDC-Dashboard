#!/usr/bin/env node
/**
 * Full local dev bootstrap: env + deps + data validation + live verifications + web + API.
 *
 * Usage: npm run dev:all
 * Skip verifications (e.g. offline): SKIP_DEV_VERIFY=true npm run dev:all
 */
import "dotenv/config";
import { copyFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function run(cmd, args, { cwd = ROOT, env = process.env, label } = {}) {
  return new Promise((resolve, reject) => {
    const name = label ?? [cmd, ...args].join(" ");
    const proc = spawn(cmd, args, {
      cwd,
      env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} exited with code ${code}`));
    });
  });
}

function runCapture(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("error", reject);
    proc.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function ensureEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) {
    copyFileSync(join(ROOT, ".env.example"), envPath);
    console.log("→ Created .env from .env.example\n");
  }
}

async function ensurePythonPredictionDeps() {
  const check = await runCapture("python3", [
    "-c",
    "import numpy; import torch; print(torch.__version__)",
  ]);
  if (check.code === 0) {
    console.log(`→ Python prediction deps ready (torch ${check.stdout.trim()})\n`);
    return;
  }
  console.log("→ Installing Python prediction deps (requirements-predict.txt)…\n");
  await run("pip3", ["install", "-r", "requirements-predict.txt"]);
  console.log("");
}

async function validateBundledData() {
  console.log("→ Validating policy cases corpus…\n");
  await run("node", ["scripts/build_policy_cases.mjs"]);
  console.log("");
}

async function runVerifications() {
  if (process.env.SKIP_DEV_VERIFY === "true") {
    console.log("→ Skipping live verifications (SKIP_DEV_VERIFY=true)\n");
    return;
  }

  const quietEnv = { ...process.env, LOG_LEVEL: process.env.LOG_LEVEL ?? "warn" };

  console.log("→ Verifying Climate TRACE integration…\n");
  await run("node", ["scripts/verify_climatetrace_v7.mjs"], { env: quietEnv });

  console.log("\n→ Verifying 2030 prediction model (live CT data)…\n");
  await run("node", ["--import", "tsx", "scripts/verify_predictions.mjs"], { env: quietEnv });
  console.log("");
}

async function startDevServers() {
  console.log("→ Starting frontend + API…\n");
  await run("npx", [
    "concurrently",
    "-k",
    "-n",
    "web,api",
    "-c",
    "cyan,magenta",
    "npm run dev",
    "npm run start:api",
  ]);
}

async function main() {
  console.log("\n══ Uganda NDC Data Explorer — dev:all ══\n");

  await ensureEnv();
  await ensurePythonPredictionDeps();
  await validateBundledData();
  await runVerifications();
  await startDevServers();
}

main().catch((err) => {
  console.error("\n✗ dev:all failed:", err.message);
  process.exit(1);
});
