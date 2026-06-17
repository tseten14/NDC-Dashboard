/** Local app identity (no remote auth). */

export const LOCAL_USER = {
  id: "local-user",
  email: "user@ndc-explorer.local",
};

export const DEFAULT_ROLES = [
  "ProjectDeveloper",
  "FieldOfficer",
  "MinistryDeliveryOfficer",
  "MRVOfficer",
  "SeniorDecisionMaker",
  "Admin",
] as const;
