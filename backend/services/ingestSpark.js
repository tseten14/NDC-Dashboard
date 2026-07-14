/**
 * Spawn backend/ml/spark_pipeline_clean.py for the PySpark data-pipeline clean/filter engine.
 * Local/dev only: Vercel's Node functions have no JVM, so this always falls back to the
 * JavaScript engine (backend/lib/ingest/pipelineClean.ts) in production. See
 * backend/routes/ingest.js `cleanRowsBestEngine` for the fallback wiring.
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../server/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "..", "ml", "spark_pipeline_clean.py");
const TIMEOUT_MS = 60_000; // Spark local-mode JVM startup is slower than a plain pandas process.

let sparkCheckCache = null;

export function getSparkScriptPath() {
  return SCRIPT;
}

/**
 * @returns {Promise<{ available: boolean, version?: string, error?: string }>}
 */
export async function checkSparkIngest() {
  if (sparkCheckCache) return sparkCheckCache;

  if (process.env.VERCEL) {
    sparkCheckCache = {
      available: false,
      error: "PySpark needs a JVM and is not available on Vercel's Node functions; the JS engine handles cleaning there.",
    };
    return sparkCheckCache;
  }

  const result = await new Promise((resolve) => {
    const proc = spawn("python3", ["-c", "import pyspark; print(pyspark.__version__)"], {
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
      resolve({ available: false, error: "python3 pyspark check timed out" });
    }, 8000);
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ available: true, version: out.trim() });
      } else {
        resolve({
          available: false,
          error: (err || out || "pyspark not installed").trim().slice(0, 200),
        });
      }
    });
    proc.on("error", (e) => {
      clearTimeout(timer);
      resolve({ available: false, error: e.message });
    });
  });

  sparkCheckCache = result;
  return result;
}

/**
 * @param {{ rows: object[], headers: string[], mapping: object, filters: object }} input
 * @returns {Promise<object|null>} Parsed PipelineScanResult-shaped result, or null if
 *   Spark is unavailable/failed (caller should fall back to the JS engine).
 */
export async function cleanRowsWithSpark(input) {
  const check = await checkSparkIngest();
  if (!check.available) return null;

  const payload = {
    rows: input.rows,
    headers: input.headers,
    mapping: input.mapping,
    filters: input.filters,
  };

  return new Promise((resolve) => {
    const proc = spawn("python3", [SCRIPT], { stdio: ["pipe", "pipe", "pipe"] });
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
      logger.warn({ event: "ingest_spark_timeout" }, "spark_pipeline_clean.py timed out");
      resolve(null);
    }, TIMEOUT_MS);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        logger.warn({ event: "ingest_spark_exit", code, stderr: stderr.slice(0, 500) }, "spark_pipeline_clean.py exited with error");
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        if (!parsed.ok) {
          logger.warn({ event: "ingest_spark_error", error: parsed.error }, "spark_pipeline_clean.py returned error");
          resolve(null);
          return;
        }
        resolve(parsed);
      } catch (e) {
        logger.warn({ event: "ingest_spark_invalid_json", error: e.message }, "spark_pipeline_clean.py returned invalid JSON");
        resolve(null);
      }
    });

    proc.on("error", (e) => {
      clearTimeout(timer);
      logger.warn({ event: "ingest_spark_spawn_error", error: e.message }, "spark_pipeline_clean.py spawn failed");
      resolve(null);
    });

    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}
