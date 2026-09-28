/**
 * Summarises the selected reporting categories before a classification exercise is saved or used.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ClassificationFramework, SectorNode } from "@/data/classifications";
import { categoryCodes, codePath, flattenSectors, selectionState } from "@/lib/sector-classification";

interface Props {
  framework: ClassificationFramework;
  selected: Set<string>;
  dirty: boolean;
  savedAt?: string;
  blocked: boolean;
  saveError: string;
  onSave: () => void;
  onRemove: (node: SectorNode) => void;
  onReset: () => void;
  onClear: () => void;
}

function selectedBranches(nodes: SectorNode[], selected: Set<string>): SectorNode[] {
  return nodes.flatMap((node) => selectionState(node, selected) === true
    ? [node] : selectedBranches(node.children, selected));
}

export function SelectionSummary({ framework, selected, dirty, savedAt, blocked, saveError, onSave, onRemove, onReset, onClear }: Props) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const groups = framework.hierarchy.filter((node) => categoryCodes(node).some((code) => selected.has(code)));
  const branches = selectedBranches(framework.hierarchy, selected);
  const label = (node: SectorNode) => node.code === "3" ? "AFOLU" : node.code === "2" ? "IPPU" : node.label;
  return <section id="selection-summary" aria-label="Selection and saving" className="sticky bottom-0 z-20 mt-6 border-t bg-background/95 py-4 ">
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-xs text-muted-foreground">Selected · {framework.name}</p>
        <p className="mt-1 text-sm font-medium leading-relaxed">
          {branches.length ? branches.slice(0, 3).map((node) => `${node.code} ${label(node)}`).join(" · ") + (branches.length > 3 ? ` · +${branches.length - 3} more` : "") : "No sectors selected. Choose a sector to get started."}
        </p>
        <p role="status" className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {!dirty && savedAt && <Check className="h-3 w-3 text-primary" />}
          {dirty ? "Unsaved changes" : savedAt ? "Saved on this device" : "Selections are saved in this browser."}
        </p>
      </div>
      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogTrigger asChild><Button variant="ghost" className="h-11 px-3" disabled={!selected.size && !savedAt}>Review selection{selected.size > 0 ? ` (${selected.size})` : ""}</Button></DialogTrigger>
          <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl">
            <DialogHeader><DialogTitle>Your selection</DialogTitle><DialogDescription>{framework.name} · {groups.length} {groups.length === 1 ? "sector" : "sectors"} · {selected.size} selected {selected.size === 1 ? "category" : "categories"}</DialogDescription></DialogHeader>
            {groups.length === 0 && <p className="text-sm text-muted-foreground">No sectors selected.</p>}
            {groups.map((group) => {
              const leaves = flattenSectors([group]).filter((node) => !node.children.length && selected.has(node.code));
              return <div key={group.code}>
                <h3 className="text-sm font-semibold">{group.code} — {group.label}</h3>
                <p className="mb-3 mt-1 text-xs text-muted-foreground">{leaves.length === categoryCodes(group).length ? "All categories included" : `${leaves.length} of ${categoryCodes(group).length} categories included`}</p>
                <ul className="space-y-2">{leaves.map((node) => <li key={node.code} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                  <div className="min-w-0 flex-1"><p className="text-sm"><span className="mr-2 font-mono text-xs text-primary">{node.code}</span>{node.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{codePath(node.code, framework.hierarchy).map((parent) => parent.code).join(" › ")}</p></div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => onRemove(node)} aria-label={`Remove ${node.code} ${node.label}`}><X className="h-4 w-4" /></Button>
                </li>)}</ul>
              </div>;
            })}
            <p className="text-xs leading-relaxed text-muted-foreground">Saved for this country in this browser. Save your edits before leaving. Clearing browser data removes saved choices.{savedAt && <> Last saved <time dateTime={savedAt}>{new Date(savedAt).toLocaleString()}</time>.</>}</p>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="flex flex-wrap gap-1">
                {dirty && savedAt && <Button variant="ghost" onClick={() => { onReset(); setReviewOpen(false); }}>Restore saved selection</Button>}
                <Button variant="ghost" disabled={!selected.size} onClick={onClear}>Clear selection</Button>
              </div>
              <Button variant="outline" onClick={() => setReviewOpen(false)}>Done</Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button onClick={onSave} disabled={blocked || (!dirty && !!savedAt) || (!savedAt && selected.size === 0)} className="h-11 flex-1 rounded-xl px-6 sm:flex-none">Save selection</Button>
      </div>
    </div>
    {saveError && <p role="alert" className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">{saveError}</p>}
  </section>;
}
