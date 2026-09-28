/**
 * Renders the expandable reporting-category tree and manages accessible category selection.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { SectorNode } from "@/data/classifications";
import { categoryCodes, matchesBranch, matchesSector, selectionState } from "@/lib/sector-classification";
import { cn } from "@/lib/utils";

interface Props {
  nodes: SectorNode[];
  selected: Set<string>;
  expanded: Set<string>;
  query: string;
  onExpand: (code: string) => void;
  onSelect: (node: SectorNode, include: boolean) => void;
  ancestorMatch?: boolean;
  depth?: number;
}

/** Separate disclosure and selection actions with native Tab/Space navigation. */
export function SectorHierarchy({ nodes, selected, expanded, query, onExpand, onSelect, ancestorMatch = false, depth = 0 }: Props) {
  return <ul className={cn("space-y-2", depth > 0 && "ml-3 border-l border-border pl-2 sm:ml-5 sm:pl-3")}>
    {nodes.filter((node) => !query || ancestorMatch || matchesBranch(node, query)).map((node) => {
      const match = !!query && matchesSector(node, query);
      const open = !!query || expanded.has(node.code);
      const state = selectionState(node, selected);
      const codes = categoryCodes(node);
      const count = codes.filter((code) => selected.has(code)).length;
      const status = node.children.length ? state === true ? "All included" : state === "indeterminate" ? `${count} of ${codes.length} included` : `${node.children.length} subcategories` : state ? "Included" : "Not selected";
      const childrenId = `sector-children-${node.code}`;
      return <li key={node.code}>
        <div className={cn("flex items-center gap-1 rounded-xl border px-3 py-1 ",
          state ? "border-primary/30 bg-primary/5" : "border-border bg-card", match && "ring-2 ring-primary/40")}>
          <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2">
            <Checkbox checked={state} onCheckedChange={(checked) => onSelect(node, checked === true)}
              aria-label={`${node.code} ${node.label}`} aria-describedby={`sector-status-${node.code}`}
              className="h-5 w-5 data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground" />
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{node.code}</span>
            <span className="min-w-0 flex-1 text-sm leading-relaxed">
              <span className={cn(depth === 0 ? "font-semibold" : "font-normal")}>{node.label}</span>
              {match && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Match</span>}
              <span className={cn("mt-0.5 block text-[11px] text-muted-foreground sm:hidden", !node.children.length && "sr-only")}>{status}</span>
            </span>
          </label>
          <span id={`sector-status-${node.code}`} className={cn("ml-2 shrink-0 text-xs text-muted-foreground", node.children.length ? "hidden sm:block" : "sr-only")}>{status}</span>
          {node.children.length > 0 && <Button variant="ghost" size="icon" className="h-11 w-8 shrink-0"
            aria-label={`${open ? "Collapse" : "Expand"} ${node.code} ${node.label}`}
            aria-expanded={open} aria-controls={childrenId}
            disabled={!!query} onClick={() => onExpand(node.code)}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>}
        </div>
        {node.children.length > 0 && <div id={childrenId} hidden={!open} className="mt-2">
          {open && <SectorHierarchy nodes={node.children} selected={selected} expanded={expanded} query={query}
            onExpand={onExpand} onSelect={onSelect} depth={depth + 1} ancestorMatch={ancestorMatch || match} />}
        </div>}
      </li>;
    })}
  </ul>;
}
