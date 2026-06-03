import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api";
import { matchDocumentsForSector } from "@/lib/policy-document-match";
import type { SectorId } from "@/data/uganda-ndc-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Landmark } from "lucide-react";

interface McfDocumentsPanelProps {
  sectorId: SectorId;
}

export function McfDocumentsPanel({ sectorId }: McfDocumentsPanelProps) {
  const mcfQuery = useQuery({
    queryKey: ["documents", "mcf", sectorId],
    queryFn: async () => {
      const res = await documentsApi.list({ category: "MCF", limit: 200 });
      return matchDocumentsForSector(res.documents, sectorId, 8);
    },
    staleTime: 1000 * 60 * 60,
  });

  const docs = mcfQuery.data ?? [];

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <Landmark className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-foreground">Funded projects & proposals (MCF)</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Multilateral climate fund documents from the national corpus — metadata and links only, not investment advice.
            </p>
          </div>
        </div>
        {mcfQuery.isLoading && <p className="text-[10px] text-muted-foreground">Loading fund documents…</p>}
        {mcfQuery.isError && (
          <p className="text-[10px] text-muted-foreground">Could not load MCF documents. Check API connection.</p>
        )}
        {!mcfQuery.isLoading && docs.length === 0 && (
          <p className="text-[10px] text-muted-foreground">No MCF documents matched this sector. Browse all in Policy documents.</p>
        )}
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="rounded-md border border-border/60 px-2 py-1.5">
              <p className="text-[10px] font-medium text-foreground leading-snug">{doc.title}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {doc.source && (
                  <Badge variant="outline" className="text-[8px] h-4">
                    {doc.source}
                  </Badge>
                )}
                {doc.documentType && (
                  <Badge variant="secondary" className="text-[8px] h-4 font-normal">
                    {doc.documentType}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1 mt-1.5">
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
          <Link to="/documents?category=MCF">Browse all MCF documents →</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
