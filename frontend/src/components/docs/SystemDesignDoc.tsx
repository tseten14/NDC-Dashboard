import systemDesignMarkdown from "../../../../docs/dev/system-design.md?raw";
import { MarkdownDocument } from "./MarkdownDocument";

export function SystemDesignDoc() {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-6 lg:p-8 shadow-sm min-w-0 overflow-x-hidden">
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
        Technical architecture and data flows for developers and integrators. This page mirrors{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">docs/dev/system-design.md</code> in the
        repository — update that file to change what appears here.
      </p>
      <MarkdownDocument source={systemDesignMarkdown} />
    </div>
  );
}
