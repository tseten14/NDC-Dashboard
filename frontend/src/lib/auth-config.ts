/**
 * Defines the temporary open-workspace authentication mode and local identity.
 *
 * This switch affects browsing only. It does not grant access to operator actions,
 * which remain protected by the server-issued operator session.
 */
export const LOGIN_AUTH_ENABLED = false;

/** Stable browser-local identity for personal records while site login is off. */

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
