/**
 * Keeps the AFOLU monitoring route honest when verified agriculture, forestry, and land-use records have not been connected.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { DataUnavailable } from "@/components/DataUnavailable";

export default function AFOLUmrv() {
  return <DataUnavailable title="AFOLU MRV" description="Verified monitoring records for agriculture, forestry and land use have not been connected to this view. The district tool provides Climate TRACE estimates with their geographic limits." href="/district-translator" action="Explore district estimates" />;
}
