/**
 * Redirects users away from unsupported fixed-rate legacy scenarios to forecasts based on live observed history.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { DataUnavailable } from "@/components/DataUnavailable";

export default function Projections() {
  return <DataUnavailable title="Projections" description="The previous legacy scenarios used fixed growth rates and unsupported impact claims. Use the emissions forecasting tool for projections based on Climate TRACE observations." href="/ai-2030" action="View emissions forecasts" />;
}
