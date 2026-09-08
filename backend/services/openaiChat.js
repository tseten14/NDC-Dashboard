/**
 * Shared OpenAI Chat Completions caller for dashboard and policy assistants.
 *
 * Defaults to a small, fast model so the chatbot stays within typical TPM
 * quotas. OPENAI_MODEL can still select a larger model; on 429 we retry once
 * then fall back to OPENAI_FALLBACK_MODEL.
 */
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
export const OPENAI_FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL || "gpt-4o-mini";

const DEFAULT_TIMEOUT_MS = 28_000;
const DEFAULT_MAX_TOKENS = 900;

export class QuotaError extends Error {
  constructor(message, { retryable = true, retryAfterMs = 800 } = {}) {
    super(message);
    this.name = "QuotaError";
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function usesCompletionTokenCap(model) {
  return /^gpt-5/i.test(model) || /sol/i.test(model);
}

function tokenFields(model, maxTokens) {
  if (usesCompletionTokenCap(model)) {
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens };
}

function parseRetryAfterMs(res) {
  const header = res.headers.get("retry-after");
  if (!header) return 800;
  const asNumber = Number(header);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return Math.min(asNumber * 1000, 2_000);
  }
  const when = Date.parse(header);
  if (Number.isFinite(when)) {
    return Math.min(Math.max(0, when - Date.now()), 2_000);
  }
  return 800;
}

async function postCompletion({ apiKey, model, messages, maxTokens, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        ...tokenFields(model, maxTokens),
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody?.error?.message ?? `HTTP ${res.status}`;
      const code = errBody?.error?.code ?? "";
      if (res.status === 429) {
        const insufficient = code === "insufficient_quota" || /quota/i.test(msg);
        throw new QuotaError(
          insufficient
            ? "The AI service quota has been reached. Please try again later."
            : "The AI service rate limit has been reached. Please wait a moment and try again.",
          {
            retryable: !insufficient,
            retryAfterMs: parseRetryAfterMs(res),
          },
        );
      }
      throw new Error(`OpenAI ${res.status}: ${msg}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @returns {Promise<string>} assistant message content
 */
export async function completeChat({
  apiKey,
  systemText,
  userText,
  maxTokens = DEFAULT_MAX_TOKENS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const messages = [
    { role: "system", content: systemText },
    { role: "user", content: userText },
  ];

  const models = [OPENAI_MODEL];
  if (OPENAI_FALLBACK_MODEL && OPENAI_FALLBACK_MODEL !== OPENAI_MODEL) {
    models.push(OPENAI_FALLBACK_MODEL);
  }

  let lastError;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      return await postCompletion({ apiKey, model, messages, maxTokens, timeoutMs });
    } catch (err) {
      lastError = err;
      if (err.name !== "QuotaError") throw err;

      if (err.retryable) {
        try {
          await sleep(err.retryAfterMs ?? 600);
          return await postCompletion({ apiKey, model, messages, maxTokens, timeoutMs });
        } catch (retryErr) {
          lastError = retryErr;
          if (retryErr.name !== "QuotaError") throw retryErr;
        }
      }
    }
  }

  throw lastError;
}
