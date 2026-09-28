/**
 * Checks that maintained source files explain their purpose and that the live
 * Documentation page covers every registered browser route.
 *
 * Machine-generated data, dependency locks, caches, and binary assets are
 * excluded because adding comments would invalidate or corrupt those formats.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const SOURCE_EXTENSIONS = new Set([
  ".css", ".html", ".ini", ".js", ".mako", ".mjs", ".py", ".sh", ".sql",
  ".tex", ".toml", ".ts", ".tsx",
]);
const EXCLUDED_PREFIXES = [
  ".git/", ".agents/", "backend/fastapi/.mypy_cache/", "backend/fastapi/venv/",
  "frontend/dist/", "node_modules/", "public/",
];

function trackedAndNewFiles() {
  return execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: ROOT, encoding: "utf8" },
  ).trim().split("\n").filter(Boolean);
}

function extension(path) {
  const match = path.match(/(\.[^./]+)$/);
  return match?.[1] ?? "";
}

function firstMeaningfulText(path) {
  return readFileSync(new URL(path, ROOT), "utf8")
    .replace(/^#![^\n]*\n/, "")
    .trimStart();
}

function hasPurposeHeader(path) {
  const source = firstMeaningfulText(path);
  let header = "";
  if (path.endsWith(".py") || path.endsWith(".mako")) {
    header = source.match(/^(?:[rubf]*)?(?:"""([\s\S]*?)"""|'''([\s\S]*?)''')/i)?.slice(1).find(Boolean) ?? "";
  } else if (path.endsWith(".sql")) {
    header = source.match(/^((?:--[^\n]*(?:\n|$))+)|^\/\*([\s\S]*?)\*\//)?.slice(1).find(Boolean) ?? "";
  } else if (path.endsWith(".html")) {
    header = source.match(/^<!--([\s\S]*?)-->/)?.[1] ?? "";
  } else if (path.endsWith(".ini") || path.endsWith(".toml")) {
    header = source.match(/^((?:#[^\n]*(?:\n|$))+)/)?.[1] ?? "";
  } else if (path.endsWith(".tex")) {
    header = source.match(/^((?:%[^\n]*(?:\n|$))+)/)?.[1] ?? "";
  } else {
    header = source.match(/^\/\*\*?([\s\S]*?)\*\/|^((?:\/\/[^\n]*(?:\n|$))+)/)?.slice(1).find(Boolean) ?? "";
  }
  const words = header.replace(/[*#/-]/g, " ").trim().split(/\s+/).filter(Boolean);
  return words.length >= 8;
}

function documentedRoutes() {
  const source = readFileSync(new URL("frontend/src/data/route-directory.ts", ROOT), "utf8");
  return new Set([...source.matchAll(/\bpath:\s*"([^"]+)"/g)].map((match) => match[1]));
}

function registeredRoutes() {
  const source = readFileSync(new URL("frontend/src/App.tsx", ROOT), "utf8");
  return [...source.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => path !== "*" && path !== "/*")
    .map((path) => path.startsWith("/") ? path : `/risk/${path}`);
}

const sourceFiles = trackedAndNewFiles().filter((path) =>
  SOURCE_EXTENSIONS.has(extension(path))
  && !EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix)),
);
const missingHeaders = sourceFiles.filter((path) => !hasPurposeHeader(path));
const routeDirectory = documentedRoutes();
const missingRoutes = registeredRoutes().filter((path) => !routeDirectory.has(path));

if (missingHeaders.length || missingRoutes.length) {
  if (missingHeaders.length) {
    console.error("Maintained source files without a plain-language purpose header:");
    missingHeaders.forEach((path) => console.error(`  - ${path}`));
  }
  if (missingRoutes.length) {
    console.error("Registered routes missing from the live Documentation directory:");
    missingRoutes.forEach((path) => console.error(`  - ${path}`));
  }
  process.exit(1);
}

console.log(`Documentation verified: ${sourceFiles.length} source files and ${routeDirectory.size} route entries.`);
