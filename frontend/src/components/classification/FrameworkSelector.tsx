import { useState } from "react";
import { CLASSIFICATION_FRAMEWORKS, getFramework } from "@/data/classifications";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export function FrameworkSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [showOptions, setShowOptions] = useState(false);
  return <section aria-labelledby="framework-heading">
    <h2 id="framework-heading" className="text-lg font-semibold">Reporting framework</h2>
    <p className="mb-4 mt-1 text-sm text-muted-foreground">Sets the sector names and reporting codes.</p>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 lg:hidden">
      <span className="text-sm font-semibold text-primary">{getFramework(value)?.name}</span>
      <Button variant="outline" className="h-10" aria-expanded={showOptions} aria-controls="framework-options" onClick={() => setShowOptions(!showOptions)}>{showOptions ? "Hide frameworks" : "Change framework"}</Button>
    </div>
    <div id="framework-options" className={cn(!showOptions && "hidden lg:block")}>
    <RadioGroup value={value} onValueChange={onChange} aria-labelledby="framework-heading" className="gap-3" orientation="vertical">
      {CLASSIFICATION_FRAMEWORKS.map((framework) => <label key={framework.id}
        className={cn("flex cursor-pointer items-start gap-3 rounded-xl border bg-card px-4 py-3 transition-colors",
          value === framework.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border",
          framework.unavailableReason && "cursor-not-allowed bg-muted/30")}>
        <RadioGroupItem id={`framework-${framework.id}`} className="mt-1 shrink-0" value={framework.id} disabled={!!framework.unavailableReason}
          aria-label={framework.name} aria-describedby={`framework-description-${framework.id}`} />
        <span className="min-w-0">
          <span className="text-sm font-semibold leading-relaxed">{framework.name}</span>
          {framework.id === "ipcc-2006" && <span className="ml-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Default</span>}
          {framework.unavailableReason && <span className="ml-2 inline-block text-[10px] text-muted-foreground">Unavailable</span>}
          <span id={`framework-description-${framework.id}`} className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">
            {framework.description}
            {framework.unavailableReason && <span className="sr-only"> {framework.unavailableReason}</span>}
          </span>
        </span>
      </label>)}
    </RadioGroup>
    <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Unavailable frameworks need a verified hierarchy. National classification also needs a verified mapping.</p>
    </div>
  </section>;
}
