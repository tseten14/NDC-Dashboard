import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api";
import type { SectorId } from "@/data/uganda-ndc-data";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalLink, ChevronDown, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfficialSourcesPanelProps {
  sectorId: SectorId;
  className?: string;
}

export function OfficialSourcesPanel({ sectorId, className }: OfficialSourcesPanelProps) {
  const curatedQuery = useQuery({
    queryKey: ["documents", "curated", "dashboard", sectorId],
    queryFn: () => documentsApi.curated(sectorId, "dashboard"),
    staleTime: 1000 * 60 * 60,
  });

  const docs = curatedQuery.data?.documents ?? [];

  return (
    <Collapsible defaultOpen className={cn("rounded-md border border-border bg-card/80", className)}>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-2.5 py-2 text-left hover:bg-muted/30 transition-colors">
        <span className="text-[10px] font-semibold text-foreground flex items-center gap-1.5">
          <Scale className="h-3 w-3 text-primary" />
          Official sources
        </span>
        <ChevronDown className="h-3 w-3 text-muted-foreground collapsible-chevron transition-transform [[data-state=open]_&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-2.5 pb-2 space-y-1.5">
        <p className="text-[9px] text-muted-foreground leading-snug">
          Laws, NDC submissions, and national plans (Climate Policy Radar export). Evidence only — not MRV.
        </p>
        {curatedQuery.isLoading && (
          <p className="text-[9px] text-muted-foreground">Loading…</p>
        )}
        {curatedQuery.isError && (
          <p className="text-[9px] text-muted-foreground">Sources unavailable (API offline).</p>
        )}
        <ul className="space-y-1">
          {docs.map((doc) => (
            <li key={doc.id} className="text-[10px] leading-snug">
              <a
                href={doc.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-start gap-1"
              >
                <span className="line-clamp-2">{doc.title}</span>
                <ExternalLink className="h-2.5 w-2.5 shrink-0 mt-0.5" />
              </a>
              <span className="text-[9px] text-muted-foreground ml-0.5"> · {doc.category}</span>
            </li>
          ))}
        </ul>
        <Button variant="link" className="h-auto p-0 text-[10px]" asChild>
          <Link to="/documents">View all policy documents →</Link>
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
