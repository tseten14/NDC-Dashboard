import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api";
import type { SectorId } from "@/data/uganda-ndc-data";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ExternalLink, ChevronDown } from "lucide-react";

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
    <Collapsible defaultOpen={false} className={className}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="group w-full justify-start text-xs gap-2">
          <span className="flex-1 text-left">📜 Official sources</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 rounded-md border border-border bg-card/80 px-2.5 py-2 space-y-1.5">
        <p className="text-[10px] text-muted-foreground leading-snug">
          Laws, NDC submissions, and national plans (Climate Policy Radar export). Evidence only — not MRV.
        </p>
        {curatedQuery.isLoading && (
          <p className="text-[10px] text-muted-foreground">Loading…</p>
        )}
        {curatedQuery.isError && (
          <p className="text-[10px] text-muted-foreground">Sources unavailable (API offline).</p>
        )}
        <ul className="space-y-1">
          {docs.map((doc) => (
            <li key={doc.id} className="text-xs leading-snug">
              <a
                href={doc.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-start gap-1"
              >
                <span className="line-clamp-2">{doc.title}</span>
                <ExternalLink className="h-2.5 w-2.5 shrink-0 mt-0.5" />
              </a>
              <span className="text-[10px] text-muted-foreground ml-0.5"> · {doc.category}</span>
            </li>
          ))}
        </ul>
        <Button variant="link" className="h-auto p-0 text-xs" asChild>
          <Link to="/documents">View all policy documents →</Link>
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
