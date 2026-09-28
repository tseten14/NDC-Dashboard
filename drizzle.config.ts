/**
 * Connects Drizzle migration tooling to the PostgreSQL schema and server-only database URL.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./database/schema.ts",
  out: "./database/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/ndc_explorer",
  },
});
