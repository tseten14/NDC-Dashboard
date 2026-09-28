/**
 * Keeps institutional assignments unavailable until an authoritative responsibility and focal-point roster is supplied.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { DataUnavailable } from "@/components/DataUnavailable";

export default function InstitutionalMap() {
  return <DataUnavailable title="Institutional Alignment" description="Confirmed institutional responsibilities have not been provided. The prototype assignments and inferred mandate overlaps have been removed." href="/documents" action="View source documents" />;
}
