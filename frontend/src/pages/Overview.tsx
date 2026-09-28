/**
 * Keeps the legacy overview unavailable because no connected source supports its former delivery and spending claims.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { DataUnavailable } from "@/components/DataUnavailable";

export default function Overview() {
  return <DataUnavailable title="Overview" description="This legacy view has no connected source for programme delivery, spending or validation records." href="/library" action="View sourced strategy targets" />;
}
