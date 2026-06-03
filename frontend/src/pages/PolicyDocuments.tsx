import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { documentsApi } from "@/lib/api";
import type { PolicyDocument } from "@/lib/policy-documents";
import { PolicyPathwayDiagram } from "@/components/PolicyPathwayDiagram";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, FileText, Scale, Search, Workflow, Library } from "lucide-react";

const CATEGORY_ORDER = ["UN Submissions", "Executive", "Legislative", "MCF", "Reports"];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function DocumentRow({ doc }: { doc: PolicyDocument }) {
  return (
    <div className="border-b border-border px-3 py-2.5 hover:bg-muted/20 transition-colors">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground leading-snug">{doc.title}</p>
          {doc.familyName && doc.familyName !== doc.title && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{doc.familyName}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5">
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              {doc.category}
            </Badge>
            {doc.source && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                {doc.source}
              </Badge>
            )}
            {doc.documentType && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1 font-normal">
                {doc.documentType}
              </Badge>
            )}
            <span className="text-[9px] text-muted-foreground self-center">{formatDate(doc.familyDate)}</span>
          </div>
          {doc.familySummary && (
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{doc.familySummary}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {doc.documentUrl && (
            <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
              <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                CPR
              </a>
            </Button>
          )}
          {doc.contentUrl && (
            <Button size="sm" variant="default" className="h-7 text-[10px]" asChild>
              <a href={doc.contentUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="h-3 w-3 mr-1" />
                PDF
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PolicyDocuments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam === "pathway" ? "pathway" : "browse");
  const initialCategory = searchParams.get("category") ?? "";
  const [category, setCategory] = useState(initialCategory);
  const [qInput, setQInput] = useState(searchParams.get("q") ?? "");
  const [q, setQ] = useState(qInput);
  const [page, setPage] = useState(0);
  const limit = 40;

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(0);
  }, [category, q]);

  useEffect(() => {
    const sp = new URLSearchParams();
    if (activeTab === "pathway") sp.set("tab", "pathway");
    if (category) sp.set("category", category);
    if (q) sp.set("q", q);
    setSearchParams(sp, { replace: true });
  }, [activeTab, category, q, setSearchParams]);

  const handleFindDocuments = (hints: string[]) => {
    setActiveTab("browse");
    setCategory("");
    setQInput(hints[0] ?? "");
    setQ(hints[0] ?? "");
    setPage(0);
  };

  const metaQuery = useQuery({
    queryKey: ["documents", "meta"],
    queryFn: () => documentsApi.meta(),
    staleTime: 1000 * 60 * 60,
  });

  const listQuery = useQuery({
    queryKey: ["documents", "list", category, q, page],
    queryFn: () =>
      documentsApi.list({
        category: category || undefined,
        q: q || undefined,
        limit,
        offset: page * limit,
      }),
    staleTime: 1000 * 60 * 30,
  });

  const categories = useMemo(() => {
    const counts = metaQuery.data?.categories ?? {};
    return CATEGORY_ORDER.filter((c) => counts[c]).concat(
      Object.keys(counts).filter((c) => !CATEGORY_ORDER.includes(c)),
    );
  }, [metaQuery.data]);

  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b border-border px-4 py-3 bg-card/50">
        <div className="flex items-start gap-2 max-w-5xl">
          <Scale className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Policy documents</h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Evidence corpus plus an intervention pathway model linking policy instruments to intended
              outcomes. Measured emissions stay on the Dashboard.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3 max-w-5xl">
          <TabsList className="h-8">
            <TabsTrigger value="browse" className="text-[11px] gap-1 h-7">
              <Library className="h-3 w-3" />
              Document library
            </TabsTrigger>
            <TabsTrigger value="pathway" className="text-[11px] gap-1 h-7">
              <Workflow className="h-3 w-3" />
              Intervention pathway
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 max-w-5xl">
          {activeTab === "pathway" ? (
            <PolicyPathwayDiagram onFindDocuments={handleFindDocuments} />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search title or summary…"
                    value={qInput}
                    onChange={(e) => setQInput(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {metaQuery.data?.count ?? "—"} documents
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                <Button
                  size="sm"
                  variant={category === "" ? "default" : "outline"}
                  className="h-7 text-[10px]"
                  onClick={() => setCategory("")}
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={category === cat ? "default" : "outline"}
                    className="h-7 text-[10px]"
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                    {metaQuery.data?.categories[cat] != null && (
                      <span className="ml-1 opacity-70">({metaQuery.data.categories[cat]})</span>
                    )}
                  </Button>
                ))}
              </div>

              <Card>
                <CardContent className="p-0">
                  {listQuery.isLoading && (
                    <p className="p-4 text-xs text-muted-foreground">Loading documents…</p>
                  )}
                  {listQuery.isError && (
                    <p className="p-4 text-xs text-destructive">
                      Could not load documents. Ensure the API is running (`npm run start:api`).
                    </p>
                  )}
                  {!listQuery.isLoading && !listQuery.isError && listQuery.data?.documents.length === 0 && (
                    <p className="p-4 text-xs text-muted-foreground">No documents match your filters.</p>
                  )}
                  {listQuery.data?.documents.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} />
                  ))}
                </CardContent>
              </Card>

              {total > limit && (
                <div className="flex items-center justify-between mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px]"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-[10px] text-muted-foreground">
                    Page {page + 1} of {totalPages} ({total} total)
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px]"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
