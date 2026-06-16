/** Browser localStorage persistence for delivery activities (no remote database). */

const STORAGE_KEY = "uganda-ndc-activities-v1";

export type WorkflowState = "Draft" | "Submitted" | "Approved" | "Returned" | "Declined" | "Pending";

export interface StoredActivity {
  id: string;
  title: string;
  description: string | null;
  organization: string | null;
  ministry: string | null;
  districts: string[];
  timeframe_start: string | null;
  timeframe_end: string | null;
  status: "planned" | "active" | "completed";
  workflow_state: WorkflowState;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityTargetLink {
  id: string;
  activity_id: string;
  strategy: string;
  target_id: string;
  relationship_type: string;
  expected_contribution: string | null;
  approval_status: "Pending" | "Approved" | "Rejected";
  approved_by: string | null;
  approved_at: string | null;
}

export interface OutputRecord {
  id: string;
  activity_id: string;
  metric_name: string;
  unit: string;
  value: number;
  output_date: string;
  method: string | null;
  created_by: string;
  created_at: string;
}

export interface EvidenceItem {
  id: string;
  activity_id: string;
  evidence_type: string;
  link_or_file_ref: string;
  notes: string | null;
  submitted_by: string;
  created_at: string;
}

export interface ValidationRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  status: string;
  notes: string | null;
  validated_by: string;
  validated_at: string;
}

export interface AuditEntry {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  diff_summary: string | null;
  created_at: string;
}

interface Store {
  activities: StoredActivity[];
  links: ActivityTargetLink[];
  outputs: OutputRecord[];
  evidence: EvidenceItem[];
  validations: ValidationRecord[];
  audit: AuditEntry[];
}

function uid() {
  return crypto.randomUUID();
}

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activities: [], links: [], outputs: [], evidence: [], validations: [], audit: [] };
    return JSON.parse(raw) as Store;
  } catch {
    return { activities: [], links: [], outputs: [], evidence: [], validations: [], audit: [] };
  }
}

function save(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function listActivitiesByCreator(userId: string) {
  return load()
    .activities.filter((a) => a.created_by === userId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function listAllActivities(): StoredActivity[] {
  return load().activities.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function listActivitiesByWorkflow(state: WorkflowState) {
  return load()
    .activities.filter((a) => a.workflow_state === state)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function listOutputsWithActivityTitle() {
  const s = load();
  return s.outputs
    .map((o) => ({
      ...o,
      activities: { title: s.activities.find((a) => a.id === o.activity_id)?.title ?? "—" },
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getActivityBundle(activityId: string) {
  const s = load();
  return {
    activity: s.activities.find((a) => a.id === activityId) ?? null,
    links: s.links.filter((l) => l.activity_id === activityId),
    outputs: s.outputs.filter((o) => o.activity_id === activityId),
    evidence: s.evidence.filter((e) => e.activity_id === activityId),
    audit: s.audit
      .filter((a) => a.entity_id === activityId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 20),
    validations: s.validations,
  };
}

export function getValidationsForOutputIds(outputIds: string[]) {
  return load().validations.filter((v) => outputIds.includes(v.entity_id));
}

export function getApprovedActivitiesForTarget(targetId: string): StoredActivity[] {
  const s = load();
  const ids = s.links
    .filter((l) => l.target_id === targetId && l.approval_status === "Approved")
    .map((l) => l.activity_id);
  const unique = [...new Set(ids)];
  return unique.map((id) => s.activities.find((a) => a.id === id)).filter(Boolean) as StoredActivity[];
}

export function countApprovedLinksByTarget(): Record<string, number> {
  const s = load();
  const m: Record<string, number> = {};
  s.links
    .filter((l) => l.approval_status === "Approved")
    .forEach((l) => {
      m[l.target_id] = (m[l.target_id] ?? 0) + 1;
    });
  return m;
}

export interface SaveActivityInput {
  title: string;
  description: string | null;
  organization: string | null;
  ministry: string | null;
  districts: string[];
  timeframe_start: string | null;
  timeframe_end: string | null;
  status: "planned" | "active" | "completed";
  workflow_state: WorkflowState;
  created_by: string;
  links: {
    strategy: string;
    target_id: string;
    relationship_type: string;
    expected_contribution: string | null;
  }[];
  outputs: {
    metric_name: string;
    unit: string;
    value: number;
    output_date: string;
    method: string | null;
    created_by: string;
  }[];
  evidence: {
    evidence_type: string;
    link_or_file_ref: string;
    notes: string | null;
    submitted_by: string;
  }[];
}

export function createActivity(input: SaveActivityInput): string {
  const s = load();
  const now = new Date().toISOString();
  const activityId = uid();
  s.activities.push({
    id: activityId,
    title: input.title,
    description: input.description,
    organization: input.organization,
    ministry: input.ministry,
    districts: input.districts,
    timeframe_start: input.timeframe_start,
    timeframe_end: input.timeframe_end,
    status: input.status,
    workflow_state: input.workflow_state,
    created_by: input.created_by,
    created_at: now,
    updated_at: now,
  });
  appendChildren(s, activityId, input, now);
  save(s);
  return activityId;
}

export function updateActivity(activityId: string, input: SaveActivityInput): void {
  const s = load();
  const idx = s.activities.findIndex((a) => a.id === activityId);
  if (idx < 0) throw new Error("Activity not found");
  const now = new Date().toISOString();
  s.activities[idx] = {
    ...s.activities[idx],
    title: input.title,
    description: input.description,
    organization: input.organization,
    ministry: input.ministry,
    districts: input.districts,
    timeframe_start: input.timeframe_start,
    timeframe_end: input.timeframe_end,
    status: input.status,
    workflow_state: input.workflow_state,
    updated_at: now,
  };
  s.links = s.links.filter((l) => l.activity_id !== activityId);
  s.outputs = s.outputs.filter((o) => o.activity_id !== activityId);
  s.evidence = s.evidence.filter((e) => e.activity_id !== activityId);
  appendChildren(s, activityId, input, now);
  save(s);
}

function appendChildren(s: Store, activityId: string, input: SaveActivityInput, now: string) {
  input.links.forEach((l) => {
    s.links.push({
      id: uid(),
      activity_id: activityId,
      strategy: l.strategy,
      target_id: l.target_id,
      relationship_type: l.relationship_type,
      expected_contribution: l.expected_contribution,
      approval_status: "Pending",
      approved_by: null,
      approved_at: null,
    });
  });
  input.outputs.forEach((o) => {
    s.outputs.push({
      id: uid(),
      activity_id: activityId,
      ...o,
      created_at: now,
    });
  });
  input.evidence.forEach((e) => {
    s.evidence.push({
      id: uid(),
      activity_id: activityId,
      ...e,
      created_at: now,
    });
  });
}

export function setActivityWorkflow(activityId: string, state: WorkflowState) {
  const s = load();
  const a = s.activities.find((x) => x.id === activityId);
  if (!a) throw new Error("Activity not found");
  a.workflow_state = state;
  a.updated_at = new Date().toISOString();
  save(s);
}

export function approveTargetLink(linkId: string, userId: string) {
  const s = load();
  const link = s.links.find((l) => l.id === linkId);
  if (!link) throw new Error("Link not found");
  link.approval_status = "Approved";
  link.approved_by = userId;
  link.approved_at = new Date().toISOString();
  save(s);
}

export function addValidation(
  entityType: string,
  entityId: string,
  status: string,
  notes: string | null,
  userId: string,
) {
  const s = load();
  s.validations.push({
    id: uid(),
    entity_type: entityType,
    entity_id: entityId,
    status,
    notes,
    validated_by: userId,
    validated_at: new Date().toISOString(),
  });
  save(s);
}

export function appendAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  diffSummary?: string,
) {
  const s = load();
  s.audit.push({
    id: uid(),
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    diff_summary: diffSummary ?? null,
    created_at: new Date().toISOString(),
  });
  save(s);
}
