/**
 * Directs users to sourced strategy material after unsupported draft programme mappings were removed.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { DataUnavailable } from "@/components/DataUnavailable";

export default function NDPIVLayer() {
  return <DataUnavailable title="NDP IV" description="The previous programme mapping mixed draft labels with assumed targets. Use the strategy library and source documents for the published plan; delivery observations remain unavailable." href="/library" action="View sourced strategy targets" />;
}
