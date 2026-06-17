import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api";
import type { SectorId } from "@/data/uganda-ndc-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Landmark } from "lucide-react";

const SECTOR_MCF_QUERY: Record<SectorId, string> = {
  "economy-wide": "national climate",
  afolu: "forest wetland",
  energy: "energy renewable power",
  transport: "transport road",
  ippu: "industrial manufacturing",
  agriculture: "agriculture agroforestry",
  waste: "waste sanitation",
};

interface McfDocumentsPanelProps {
  sectorId: SectorId;
}

export function McfDocumentsPanel({ sectorId }: McfDocumentsPanelProps) {
  const sectorQuery = SECTOR_MCF_QUERY[sectorId] ?? "climate";

  const mcfQuery = useQuery({
    queryKey: ["documents", "mcf-sector-panel", sectorId],
    queryFn: () =>
      documentsApi.searchMcfProjects({
        sector: sectorId,
        q: sectorQuery,
        limit: 8,
      }),
    staleTime: 1000 * 60 * 60,
  });

  const projects = mcfQuery.data?.projects ?? [];
  const searchHref = `/documents?tab=mcf&sector=${encodeURIComponent(sectorId)}&q=${encodeURIComponent(sectorQuery)}`;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <Landmark className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-foreground">Funded projects & proposals (MCF)</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Multilateral climate fund documents matched to this sector — summary text and indicative amounts from the CPR export snapshot, not investment advice.
            </p>
          </div>
        </div>
        {mcfQuery.isLoading && <p className="text-[10px] text-muted-foreground">Loading fund documents…</p>}
        {mcfQuery.isError && (
          <p className="text-[10px] text-muted-foreground">Could not load MCF documents. Check API connection.</p>
        )}
        {!mcfQuery.isLoading && projects.length === 0 && (
          <p className="text-[10px] text-muted-foreground">No MCF documents matched this sector. Browse all in Policy documents.</p>
        )}
        <ul className="space-y-2">
          {projects.map((doc) => (
            <li key={doc.id} className="rounded-md border border-border/60 px-2 py-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] font-medium text-foreground leading-snug">{doc.title}</p>
                {doc.amountUsd != null && (
                  <Badge variant="secondary" className="text-[8px] h-4 shrink-0">
                    ~${doc.amountUsd}m
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {doc.funder && (
                  <Badge variant="outline" className="text-[8px] h-4">
                    {doc.funder}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                <Button size="sm" variant="default" className="h-6 text-[9px]" asChild>
                  <Link to={`/documents/view?catalogId=${encodeURIComponent(doc.catalogId)}`}>
                    Analyse
                  </Link>
                </Button>
                {doc.documentUrl && (
                  <Button size="sm" variant="outline" className="h-6 text-[9px]" asChild>
                    <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-2.5 w-2.5 mr-0.5" />
                      CPR
                    </a>
                  </Button>
                )}
                {doc.contentUrl && (
                  <Button size="sm" variant="ghost" className="h-6 text-[9px]" asChild>
                    <a href={doc.contentUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="h-2.5 w-2.5 mr-0.5" />
                      PDF
                    </a>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <Button variant="link" className="h-auto p-0 mt-2 text-[10px]" asChild>
          <Link to={searchHref}>Search fund documents for this sector →</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
