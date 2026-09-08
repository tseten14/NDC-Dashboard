/** User-facing copy for dashboard / policy AI HTTP errors. */
export function aiRequestErrorMessage(
  status: number,
  err: { error?: string; message?: string; retry_after_seconds?: number },
  fallback: string,
): string {
  if (typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }
  if (status === 429) {
    const wait = err.retry_after_seconds;
    return wait
      ? `The AI assistant hit a usage limit. Try again in ${wait} seconds.`
      : "The AI assistant hit a usage limit. Please wait a moment and try again.";
  }
  if (status === 503) {
    return "NDC AI is unavailable — set OPENAI_API_KEY on the API server.";
  }
  if (status === 404) {
    return "NDC AI endpoint not found. Restart the API server (npm run start:api) or redeploy the latest backend.";
  }
  return err.error || fallback;
}
