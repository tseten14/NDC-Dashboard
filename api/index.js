/**
 * Vercel serverless entry. Rewrites send /api/* here with full paths preserved.
 */
import { register } from "tsx/esm/api";
register();

import express from "express";
import { createApp } from "../server/createApp.js";

const app = express();
app.use("/api", createApp());
export default app;
