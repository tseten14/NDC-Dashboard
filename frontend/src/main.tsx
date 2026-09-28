/**
 * The starting point of the front end.
 *
 * The first file the browser runs. Mounts the application into the page and
 * loads the global styles. Everything else follows from App.tsx.
 */
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reloadOnceForStaleChunk } from "./lib/chunk-recovery";

// Stale-chunk recovery: after a redeploy, a cached index.html may modulepreload
// chunk hashes that no longer exist. Vite fires `vite:preloadError`; reload once
// (guarded against a loop) to pull the fresh index.html. lazy-with-retry handles
// the React.lazy path; this covers preloads that fail before a route renders.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnceForStaleChunk()) event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);

// Remove the static loading message after the first render frame.
const splash = document.getElementById("splash");
if (splash) {
  requestAnimationFrame(() => splash.remove());
}
