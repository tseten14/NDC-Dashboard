import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const metricTypeEnum = pgEnum("metric_type", [
  "emissions_reduction",
  "rising_share",
  "absolute_level",
]);

export const ingestFileTypeEnum = pgEnum("ingest_file_type", ["pdf", "csv", "json"]);

export const ingestJobStatusEnum = pgEnum("ingest_job_status", [
  "pending",
  "processing",
  "complete",
  "failed",
]);

export const targets = pgTable("targets", {
  id: uuid("id").primaryKey(),
  sector: text("sector").notNull(),
  baselineYear: integer("baseline_year").notNull(),
  targetYear: integer("target_year").notNull(),
  metricType: metricTypeEnum("metric_type").notNull(),
  baselineValue: numeric("baseline_value", { precision: 18, scale: 4 }).notNull(),
  targetValue: numeric("target_value", { precision: 18, scale: 4 }).notNull(),
  unit: text("unit").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const observations = pgTable("observations", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetId: uuid("target_id")
    .notNull()
    .references(() => targets.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  value: numeric("value", { precision: 18, scale: 4 }).notNull(),
  source: text("source").notNull(),
  asOf: date("as_of").notNull(),
  isEstimated: boolean("is_estimated").notNull().default(false),
  isValidated: boolean("is_validated").notNull().default(false),
  qaqcStatus: text("qaqc_status").notNull().default("ok"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ingestJobs = pgTable("ingest_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  fileType: ingestFileTypeEnum("file_type").notNull(),
  status: ingestJobStatusEnum("status").notNull().default("pending"),
  rowCount: integer("row_count"),
  errorMessage: text("error_message"),
  createdBy: text("created_by").notNull().default("system"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  performedBy: text("performed_by").notNull(),
  performedAt: timestamp("performed_at", { withTimezone: true }).notNull().defaultNow(),
});
