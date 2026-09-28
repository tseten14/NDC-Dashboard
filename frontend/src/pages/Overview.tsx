import { DataUnavailable } from "@/components/DataUnavailable";

export default function Overview() {
  return <DataUnavailable title="Overview" description="This legacy view has no connected source for programme delivery, spending or validation records." href="/library" action="View sourced strategy targets" />;
}
