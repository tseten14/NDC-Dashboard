/**
 * Keeps ownership and contact assignments unavailable until the responsible institution supplies a confirmed roster.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { DataUnavailable } from "@/components/DataUnavailable";

export default function OwnershipFocals() {
  return <DataUnavailable title="Ownership & Focal Points" description="A confirmed focal-point roster has not been provided. The prototype contact assignments have been removed." href="/documents" action="View source documents" />;
}
