/**
 * Copy Vite build into /public so Vercel serves static assets AND /api functions.
 * (outputDirectory-only deploys skip the api/ folder.)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "frontend", "dist");
const dest = path.join(root, "public");

if (!fs.existsSync(src)) {
  console.error("[prepare-vercel-public] Missing frontend/dist — run npm run build first");
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log("[prepare-vercel-public] Copied frontend/dist → public/");
