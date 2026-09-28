/**
 * Keeps project assessment unavailable until a verified project record and review method are connected.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { DataUnavailable } from "@/components/DataUnavailable";

export default function ProjectCheck() {
  return <DataUnavailable
    title="Project Check"
    description="Verified intervention-to-target mappings and measurement requirements have not been approved. The application will not infer project eligibility or contribution from keywords."
    href="/scenario-analysis"
    action="Build an evidence-based scenario"
  />;
}
