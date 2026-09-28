import { createHash } from "node:crypto";

// Exact fingerprints of the five former bundled demonstration pitches. This
// hides unchanged copies created by an older seed without deleting database rows
// or hiding a user's edited submission merely because it shares an old ID.
const LEGACY_EXAMPLE_HASHES = new Set([
  "b83200b68546899aaa035d7c811792234d6252dcfb3562bc1ee67134b6360dce",
  "352d5bee525335accb57700758ed12446025570f7c8d3376c4405b4803425e85",
  "3e7a66172c6367064565d9514e110d5a41da2aa92bd42d334f94feb23989c832",
  "a041ac63896a23a81a8725c8e59315a3d51b5142efaf2a2ca4b36c409a21c3ac",
  "6dd728e571ab4665ae539700a361a28d8ba53454f4053abcacbe66b32d8fd6e9",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function isLegacyExampleDeal(deal) {
  const payload = { ...deal };
  delete payload.createdAt;
  delete payload.updatedAt;
  const fingerprint = createHash("sha256").update(JSON.stringify(stable(payload))).digest("hex");
  return LEGACY_EXAMPLE_HASHES.has(fingerprint);
}
