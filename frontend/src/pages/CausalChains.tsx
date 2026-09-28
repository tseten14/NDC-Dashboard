import { DataUnavailable } from "@/components/DataUnavailable";

export default function CausalChains() {
  return <DataUnavailable
    title="Causal Chains"
    description="No reviewed causal-chain evidence set is connected. The previous five-step pathways and confidence claims were planning examples and have been removed."
    href="/documents"
    action="Review policy evidence"
  />;
}
