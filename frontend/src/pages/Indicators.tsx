/**
 * Keeps the legacy indicator route unavailable until a confirmed registry and sourced observations are connected.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { DataUnavailable } from "@/components/DataUnavailable";

export default function Indicators() {
  return <DataUnavailable
    title="Indicator Catalogue"
    description="A confirmed cross-strategy indicator catalogue, including data owners, update frequencies and evidence ratings, has not been provided. The earlier inferred catalogue has been removed."
    href="/documents"
    action="Review source documents"
  />;
}
