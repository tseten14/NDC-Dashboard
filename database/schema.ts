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

/* ===========================================================================
 * My Work — delivery activities ("tickets") workflow
 *
 * Server-side home for the activities currently held in browser localStorage
 * (frontend/src/lib/activities-store.ts). Moving these here lets tickets from
 * many officers land in one shared, SQL-queryable store that scales past a
 * single browser. Workflow + approval columns mirror the client types.
 * ===========================================================================*/

export const activityStatusEnum = pgEnum("activity_status", ["planned", "active", "completed"]);

export const workflowStateEnum = pgEnum("workflow_state", [
  "Draft",
  "Submitted",
  "Pending",
  "Approved",
  "Declined",
  "Returned",
]);

export const approvalStatusEnum = pgEnum("approval_status", ["Pending", "Approved", "Rejected"]);

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  organization: text("organization"),
  ministry: text("ministry"),
  districts: text("districts").array(),
  timeframeStart: date("timeframe_start"),
  timeframeEnd: date("timeframe_end"),
  status: activityStatusEnum("status").notNull().default("planned"),
  workflowState: workflowStateEnum("workflow_state").notNull().default("Draft"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityTargetLinks = pgTable("activity_target_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id")
    .notNull()
    .references(() => activities.id, { onDelete: "cascade" }),
  strategy: text("strategy").notNull(),
  targetId: text("target_id").notNull(),
  relationshipType: text("relationship_type").notNull(),
  expectedContribution: text("expected_contribution"),
  approvalStatus: approvalStatusEnum("approval_status").notNull().default("Pending"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
});

export const activityOutputs = pgTable("activity_outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id")
    .notNull()
    .references(() => activities.id, { onDelete: "cascade" }),
  metricName: text("metric_name").notNull(),
  unit: text("unit").notNull(),
  value: numeric("value", { precision: 18, scale: 4 }).notNull(),
  outputDate: date("output_date").notNull(),
  method: text("method"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityEvidence = pgTable("activity_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id")
    .notNull()
    .references(() => activities.id, { onDelete: "cascade" }),
  evidenceType: text("evidence_type").notNull(),
  linkOrFileRef: text("link_or_file_ref").notNull(),
  notes: text("notes"),
  submittedBy: text("submitted_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityValidations = pgTable("activity_validations", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  status: text("status").notNull(),
  notes: text("notes"),
  validatedBy: text("validated_by").notNull(),
  validatedAt: timestamp("validated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ===========================================================================
 * Policy document corpus (Climate Policy Radar export) — scales to thousands
 * of documents and tens of thousands of passages, queryable with SQL.
 * Full-text search is added as GIN tsvector indexes in the migration so the
 * corpus stays fast without loading the whole JSON into memory.
 * ===========================================================================*/

export const policyDocuments = pgTable("policy_documents", {
  id: text("id").primaryKey(), // CPR document id
  title: text("title").notNull(),
  familyName: text("family_name"),
  familySummary: text("family_summary"),
  familyDate: timestamp("family_date", { withTimezone: true }),
  familyUrl: text("family_url"),
  documentUrl: text("document_url"),
  contentUrl: text("content_url"),
  documentType: text("document_type"),
  category: text("category"),
  source: text("source"),
  geographies: text("geographies").array(),
  languages: text("languages").array(),
  collectionName: text("collection_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Per-document passage metadata (counts, slug, CPR linkage).
export const policyPassageDocuments = pgTable("policy_passage_documents", {
  cprDocumentId: text("cpr_document_id").primaryKey(),
  slug: text("slug"),
  title: text("title").notNull(),
  familyId: text("family_id"),
  familySummary: text("family_summary"),
  cprUrl: text("cpr_url"),
  catalogId: text("catalog_id"),
  passageCount: integer("passage_count").notNull().default(0),
  taggedPassageCount: integer("tagged_passage_count").notNull().default(0),
});

// Passage-level text — the bulk of the corpus (FTS happens here).
export const policyPassages = pgTable("policy_passages", {
  id: text("id").primaryKey(),
  cprDocumentId: text("cpr_document_id")
    .notNull()
    .references(() => policyPassageDocuments.cprDocumentId, { onDelete: "cascade" }),
  passageIndex: integer("passage_index").notNull(),
  textBlockId: text("text_block_id"),
  text: text("text").notNull(),
  passageType: text("passage_type"),
  language: text("language"),
  topicIds: text("topic_ids").array(),
  topicLabels: text("topic_labels").array(),
});
