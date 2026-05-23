/** Local demo identity (no remote auth). */

export const DEMO_USER = {
  id: "demo-user",
  email: "demo@ndc-explorer.local",
};

export const DEMO_ROLES = [
  "ProjectDeveloper",
  "FieldOfficer",
  "MinistryDeliveryOfficer",
  "MRVOfficer",
  "SeniorDecisionMaker",
  "Admin",
] as const;
