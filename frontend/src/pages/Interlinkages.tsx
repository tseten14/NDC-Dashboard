import { DataUnavailable } from "@/components/DataUnavailable";

export default function Interlinkages() {
  return <DataUnavailable
    title="Interlinkage Explorer"
    description="No reviewed cross-sector relationship dataset is connected. The application will not assign evidence strength to inferred indicator relationships."
    href="/documents"
    action="Review source documents"
  />;
}
