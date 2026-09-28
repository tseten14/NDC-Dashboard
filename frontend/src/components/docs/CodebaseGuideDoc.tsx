/**
 * Presents the repository onboarding guide inside the live Documentation page.
 *
 * The Markdown file remains the canonical copy so the same explanation serves
 * developers browsing the repository and technical users browsing the app.
 */
import codebaseGuideMarkdown from "../../../../docs/dev/codebase-guide.md?raw";
import { MarkdownDocument } from "./MarkdownDocument";

export function CodebaseGuideDoc() {
  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden rounded-lg border border-border bg-card p-4 sm:p-6 lg:p-8">
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
        Start here when maintaining or integrating the application. This page mirrors{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/dev/codebase-guide.md</code> in the
        repository.
      </p>
      <MarkdownDocument source={codebaseGuideMarkdown} />
    </div>
  );
}
