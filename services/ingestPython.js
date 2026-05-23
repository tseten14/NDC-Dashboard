/**
 * Spawn scripts/ingest_analyze.py for accurate pandas-based tabular analysis.
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "..", "scripts", "ingest_analyze.py");
const TIMEOUT_MS = 45_000;

let pythonCheckCache = null;

export function getIngestScriptPath() {
  return SCRIPT;
}

/**
 * @returns {Promise<{ available: boolean, version?: string, error?: string }>}
 */
export async function checkPythonIngest() {
  if (pythonCheckCache) return pythonCheckCache;

  if (process.env.VERCEL) {
    pythonCheckCache = {
      available: false,
      error: "pandas ingest runs on Node hosts with Python installed; Vercel uses JavaScript charts",
    };
    return pythonCheckCache;
  }

  const result = await new Promise((resolve) => {
    const proc = spawn("python3", ["-c", "import pandas, numpy; print(pandas.__version__)"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => {
      out += d;
    });
    proc.stderr.on("data", (d) => {
      err += d;
    });
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({ available: false, error: "python3 check timed out" });
    }, 8000);
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ available: true, version: out.trim() });
      } else {
        resolve({
          available: false,
          error: (err || out || "pandas not installed").trim().slice(0, 200),
        });
      }
    });
    proc.on("error", (e) => {
      clearTimeout(timer);
      resolve({ available: false, error: e.message });
    });
  });

  pythonCheckCache = result;
  return result;
}

/**
 * @param {{ csvText?: string, rows?: object[], filename: string }} input
 * @returns {Promise<object|null>} Parsed result or null if Python unavailable/failed
 */
export async function analyzeTabularWithPython(input) {
  const check = await checkPythonIngest();
  if (!check.available) return null;

  const payload = {
    filename: input.filename,
    ...(input.csvText != null ? { csv_text: input.csvText } : {}),
    ...(input.rows != null ? { rows: input.rows } : {}),
  };

  return new Promise((resolve) => {
    const proc = spawn("python3", [SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => {
      stdout += d;
    });
    proc.stderr.on("data", (d) => {
      stderr += d;
    });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      console.warn("[ingestPython] timed out for", input.filename);
      resolve(null);
    }, TIMEOUT_MS);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        console.warn("[ingestPython] exit", code, stderr.slice(0, 300));
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        if (!parsed.ok) {
          console.warn("[ingestPython]", parsed.error);
          resolve(null);
          return;
        }
        resolve(parsed);
      } catch (e) {
        console.warn("[ingestPython] invalid JSON:", e.message);
        resolve(null);
      }
    });

    proc.on("error", (e) => {
      clearTimeout(timer);
      console.warn("[ingestPython]", e.message);
      resolve(null);
    });

    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}
