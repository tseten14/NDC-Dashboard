/**
 * Provides the shared, accessible empty state used when a screen lacks verified evidence and points users to a supported alternative.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { Link } from "react-router-dom";

/** A missing source is not evidence of a zero value or a completed programme. */
export function DataUnavailable({ title, description, href = "/dashboard", action = "View Climate TRACE emissions" }: {
  title: string;
  description: string;
  href?: string;
  action?: string;
}) {
  return <section className="mx-auto max-w-5xl space-y-4 p-4 sm:p-8">
    <h1 className="text-2xl font-bold">{title}</h1>
    <div className="space-y-3 rounded-sm border bg-card p-5">
      <h2 className="text-lg font-semibold">Data unavailable</h2>
      <p className="text-muted-foreground">{description}</p>
      <p>No figures are shown until a source can support them.</p>
      <Link className="inline-block font-semibold text-primary underline" to={href}>{action}</Link>
    </div>
  </section>;
}
