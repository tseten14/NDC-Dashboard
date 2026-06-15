import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Fade out the initial-load splash once React has mounted.
const splash = document.getElementById("splash");
if (splash) {
  requestAnimationFrame(() => {
    splash.classList.add("splash-done");
    window.setTimeout(() => splash.remove(), 280);
  });
}
