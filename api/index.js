/**
 * Vercel mounts this app at /api — routes in createApp() use /v1/* (→ /api/v1/*).
 * Do NOT add another /api prefix here (would become /api/api/v1).
 */
import { createApp } from "../server/createApp.js";

export default createApp();
