/**
 * The starting point of the front end.
 *
 * The first file the browser runs. Mounts the application into the page and
 * loads the global styles. Everything else follows from App.tsx.
 */
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Stale-chunk recovery: after a redeploy, a cached index.html may modulepreload
// chunk hashes that no longer exist. Vite fires `vite:preloadError`; reload once
// (guarded against a loop) to pull the fresh index.html. lazy-with-retry handles
// the React.lazy path; this covers preloads that fail before a route renders.
const RELOAD_FLAG = "ndc:chunk-reload";
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  try {
    if (window.sessionStorage?.getItem(RELOAD_FLAG) === "1") return;
    window.sessionStorage?.setItem(RELOAD_FLAG, "1");
  } catch {
    /* sessionStorage unavailable — fall through and reload once anyway */
  }
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);

// Fade out the initial-load splash once React has mounted.
const splash = document.getElementById("splash");
if (splash) {
  requestAnimationFrame(() => {
    splash.classList.add("splash-done");
    window.setTimeout(() => splash.remove(), 280);
  });
}
