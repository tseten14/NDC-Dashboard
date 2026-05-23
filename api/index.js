/**
 * Vercel serverless entry — served at /api/*
 * @see https://vercel.com/docs/frameworks/backend/express
 */
import { createApp } from "../server/createApp.js";

const app = createApp();
export default app;
