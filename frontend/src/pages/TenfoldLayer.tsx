/**
 * Keeps the Tenfold programme-delivery view unavailable until sourced readiness and implementation records are connected.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { DataUnavailable } from "@/components/DataUnavailable";

export default function TenfoldLayer() {
  return <DataUnavailable title="Tenfold Growth Strategy" description="Programme delivery and investment readiness records have not been connected. Policy commitments remain available in the strategy library." href="/library" action="View sourced strategy targets" />;
}
