/** Bounds read requests and forwards cancellation, including while response bodies are still downloading. */
export async function readJson<T>(url: string, init: RequestInit = {}, timeoutMs = 30_000): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort(init.signal?.reason);
  let timedOut = false;
  if (init.signal?.aborted) cancel();
  else init.signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`API ${response.status} ${response.statusText}: ${body || url}`);
    }
    return await response.json() as T;
  } catch (error) {
    if (timedOut) throw new Error("The data request timed out. Please try again.");
    throw error;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", cancel);
  }
}
