/**
 * Screen: the policy document library.
 *
 * Browse and search Uganda's climate policy documents — national strategies,
 * plans and climate-fund project papers. Searching looks inside the documents,
 * returning the specific passage that matches rather than just a file name.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { documentsApi } from "@/lib/api";
import { useCurrentRole } from "@/hooks/use-current-role";
import type { PolicyDocument, PolicyPassageDocument } from "@/lib/policy-documents";
import { groupPassagesByDocument, uniqueTopicLabels } from "@/lib/policy-documents";
import { PolicyPathwayDiagram } from "@/components/PolicyPathwayDiagram";
import { ClimatePolicyRadarBadge } from "@/components/ClimatePolicyRadarBadge";
import { CPR_PASSAGE_ATTRIBUTION, resolveCprLink } from "@/lib/policy-lineage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ExternalLink, FileText, Scale, Search, Workflow, Library, Sparkles, BookOpen, Tags,
  Coins,
} from "lucide-react";

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
  const navigate = useNavigate();
  const cprLink = resolveCprLink(doc);

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
            {doc.hasPassages && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                Passages
              </Badge>
            )}
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
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] gap-1"
            onClick={() =>
              navigate(`/documents/view?catalogId=${encodeURIComponent(doc.id)}`, { state: { doc } })
            }
          >
            <Sparkles className="h-3 w-3" />
            Analyse
          </Button>
          {cprLink && (
            <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
              <a href={cprLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                View on CPR
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

const PASSAGE_PREVIEW_PER_DOC = 3;

function PassageCorpusTab() {
  const navigate = useNavigate();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [topicId, setTopicId] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const hasActiveFilter = q.trim().length > 0 || topicId !== "";

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(0);
  }, [q, topicId]);

  const corpusQuery = useQuery({
    queryKey: ["documents", "passage-corpus"],
    queryFn: () => documentsApi.passageCorpusMeta(),
    staleTime: 1000 * 60 * 60,
  });

  const topicsQuery = useQuery({
    queryKey: ["documents", "topics"],
    queryFn: () => documentsApi.listTopics(),
    staleTime: 1000 * 60 * 60,
  });

  const searchQuery = useQuery({
    queryKey: ["documents", "passages-search", q, topicId, page],
    queryFn: () =>
      documentsApi.searchPassages({
        q: q || undefined,
        topicId: topicId || undefined,
        limit,
        offset: page * limit,
      }),
    enabled: hasActiveFilter,
    staleTime: 1000 * 60 * 5,
  });

  const topTopics = useMemo(
    () => (topicsQuery.data?.topics ?? []).slice(0, 20),
    [topicsQuery.data],
  );

  const passageGroups = useMemo(
    () => groupPassagesByDocument(searchQuery.data?.passages ?? []),
    [searchQuery.data?.passages],
  );

  const total = searchQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const openPassageDoc = (pDoc: PolicyPassageDocument) => {
    const params = new URLSearchParams();
    if (pDoc.catalogId) params.set("catalogId", pDoc.catalogId);
    params.set("cprDocumentId", pDoc.cprDocumentId);
    navigate(`/documents/view?${params.toString()}`);
  };

  const openGroupDocument = (group: ReturnType<typeof groupPassagesByDocument>[number]) => {
    const params = new URLSearchParams();
    if (group.catalogId) params.set("catalogId", group.catalogId);
    params.set("cprDocumentId", group.cprDocumentId);
    navigate(`/documents/view?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground leading-snug">{CPR_PASSAGE_ATTRIBUTION}</p>

      {corpusQuery.data && (
        <div className="flex flex-wrap gap-2">
          {corpusQuery.data.documents.map((d) => (
            <button
              key={d.cprDocumentId}
              type="button"
              onClick={() => openPassageDoc(d)}
              className="text-left rounded-md border border-border bg-card px-2.5 py-2 hover:border-primary/40 hover:bg-primary/5 transition-colors max-w-xs"
            >
              <p className="text-[11px] font-semibold text-foreground line-clamp-2">{d.title}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                {d.passageCount} passages · {d.taggedPassageCount} with topics
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search passage text or topics…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      {topTopics.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
            <Tags className="h-3 w-3" /> Topics
          </p>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={topicId === "" ? "default" : "outline"}
              className="h-6 text-[9px]"
              onClick={() => setTopicId("")}
            >
              All
            </Button>
            {topTopics.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={topicId === t.id ? "default" : "outline"}
                className="h-6 text-[9px]"
                onClick={() => setTopicId(t.id)}
              >
                {t.label} ({t.passageCount})
              </Button>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {!hasActiveFilter && (
            <p className="p-4 text-xs text-muted-foreground leading-relaxed">
              Search passage text or pick a topic above to see matching excerpts grouped by document.
            </p>
          )}
          {hasActiveFilter && searchQuery.isLoading && (
            <p className="p-4 text-xs text-muted-foreground">Searching passages…</p>
          )}
          {hasActiveFilter && searchQuery.isError && (
            <p className="p-4 text-xs text-destructive">Could not search passages.</p>
          )}
          {hasActiveFilter && !searchQuery.isLoading && searchQuery.data?.passages.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground">No passages match your filters.</p>
          )}
          {hasActiveFilter &&
            passageGroups.map((group) => {
              const preview = group.passages.slice(0, PASSAGE_PREVIEW_PER_DOC);
              const remaining = group.passages.length - preview.length;
              return (
                <div key={group.cprDocumentId} className="border-b border-border px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[11px] font-semibold text-foreground line-clamp-2">
                      {group.documentTitle}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] text-muted-foreground">
                        {group.passages.length} hit{group.passages.length === 1 ? "" : "s"}
                      </span>
                      {group.cprUrl && (
                        <a
                          href={group.cprUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-primary hover:underline"
                        >
                          CPR ↗
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {preview.map((p) => (
                      <div key={p.id}>
                        <p className="text-[10px] text-muted-foreground line-clamp-3 leading-relaxed">
                          {p.text}
                        </p>
                        {p.topicLabels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {uniqueTopicLabels(p.topicLabels).map((tl) => (
                              <Badge
                                key={`${p.id}-${tl.id}`}
                                variant="outline"
                                className="text-[8px] h-4 px-1"
                              >
                                {tl.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {(remaining > 0 || group.passages.length > 0) && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 mt-2 text-[10px]"
                      onClick={() => openGroupDocument(group)}
                    >
                      {remaining > 0
                        ? `See all ${group.passages.length} passages in document →`
                        : "Open document →"}
                    </Button>
                  )}
                </div>
              );
            })}
        </CardContent>
      </Card>

      {hasActiveFilter && total > limit && (
        <div className="flex items-center justify-between">
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
            Page {page + 1} of {totalPages} ({total} passages)
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
    </div>
  );
}

function McfProjectsTab() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialFunder = searchParams.get("funder") ?? "";
  const initialSector = searchParams.get("sector") ?? "";
  const initialMinAmount = searchParams.get("minAmount") ?? "";

  const [qInput, setQInput] = useState(initialQ);
  const [q, setQ] = useState(initialQ);
  const [funder, setFunder] = useState(initialFunder);
  const [sector, setSector] = useState(initialSector);
  const [minAmount, setMinAmount] = useState(initialMinAmount);
  const [page, setPage] = useState(0);
  const limit = 20;

  const hasActiveFilter =
    q.trim().length > 0 || funder !== "" || sector !== "" || minAmount.trim() !== "";

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    setPage(0);
  }, [q, funder, sector, minAmount]);

  const metaQuery = useQuery({
    queryKey: ["documents", "mcf-meta"],
    queryFn: () => documentsApi.mcfMeta(),
    staleTime: 1000 * 60 * 60,
  });

  const searchQuery = useQuery({
    queryKey: ["documents", "mcf-search", q, funder, sector, minAmount, page],
    queryFn: () =>
      documentsApi.searchMcfProjects({
        q: q || undefined,
        funder: funder || undefined,
        sector: sector || undefined,
        minAmount: minAmount ? Number(minAmount) : undefined,
        limit,
        offset: page * limit,
      }),
    enabled: hasActiveFilter,
    staleTime: 1000 * 60 * 5,
  });

  const funders = useMemo(
    () => Object.keys(metaQuery.data?.funders ?? {}).sort(),
    [metaQuery.data?.funders],
  );

  const total = searchQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-muted-foreground leading-snug">
        {metaQuery.data?.attribution ??
          "Multilateral climate fund projects — search summary text and metadata."}
      </p>
      {metaQuery.data && (
        <p className="text-[10px] text-muted-foreground">
          {metaQuery.data.count} projects · {metaQuery.data.withAmount} with parsed amounts (USD m, indicative)
        </p>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search fund projects…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 max-w-md">
        <Input
          placeholder="Min amount (USD m)"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
          className="h-7 text-[10px] w-32"
          inputMode="decimal"
        />
        {sector && (
          <Badge variant="secondary" className="text-[9px] h-5">
            Sector: {sector}
            <button
              type="button"
              className="ml-1 opacity-70 hover:opacity-100"
              onClick={() => setSector("")}
              aria-label="Clear sector filter"
            >
              ×
            </button>
          </Badge>
        )}
      </div>

      {funders.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant={funder === "" ? "default" : "outline"}
            className="h-6 text-[9px]"
            onClick={() => setFunder("")}
          >
            All funders
          </Button>
          {funders.slice(0, 12).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={funder === f ? "default" : "outline"}
              className="h-6 text-[9px]"
              onClick={() => setFunder(f)}
            >
              {f} ({metaQuery.data?.funders[f]})
            </Button>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {!hasActiveFilter && (
            <p className="p-4 text-xs text-muted-foreground">
              Search project text or select a funder to see multilateral climate fund documents.
            </p>
          )}
          {hasActiveFilter && searchQuery.isLoading && (
            <p className="p-4 text-xs text-muted-foreground">Searching projects…</p>
          )}
          {hasActiveFilter && !searchQuery.isLoading && searchQuery.data?.projects.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground">No projects match your filters.</p>
          )}
          {hasActiveFilter &&
            searchQuery.data?.projects.map((p) => (
              <div key={p.id} className="border-b border-border px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold text-foreground leading-snug">{p.title}</p>
                  {p.amountUsd != null && (
                    <Badge variant="secondary" className="text-[8px] h-4 shrink-0">
                      ~${p.amountUsd}m
                    </Badge>
                  )}
                </div>
                {p.funder && (
                  <Badge variant="outline" className="text-[8px] h-4 mt-1">
                    {p.funder}
                  </Badge>
                )}
                <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">
                  {p.snippet ?? p.searchableText}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[9px]"
                    onClick={() => navigate(`/documents/view?catalogId=${encodeURIComponent(p.catalogId)}`)}
                  >
                    Analyse
                  </Button>
                  {p.contentUrl && (
                    <Button size="sm" variant="ghost" className="h-6 text-[9px]" asChild>
                      <a href={p.contentUrl} target="_blank" rel="noopener noreferrer">
                        PDF ↗
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {hasActiveFilter && total > limit && (
        <div className="flex items-center justify-between">
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
            Page {page + 1} of {totalPages} ({total} projects)
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
    </div>
  );
}

export default function PolicyDocuments() {
  const { getDocumentsDefaultCategory, getDocumentsDefaultTab, activeRole } = useCurrentRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam === "pathway"
      ? "pathway"
      : tabParam === "passages"
        ? "passages"
        : tabParam === "mcf"
          ? "mcf"
          : "browse",
  );
  const initialCategory = searchParams.get("category") ?? "";
  const [category, setCategory] = useState(initialCategory);
  const [roleDefaultsApplied, setRoleDefaultsApplied] = useState(false);

  useEffect(() => {
    if (roleDefaultsApplied) return;
    if (searchParams.has("category") || searchParams.has("tab")) {
      setRoleDefaultsApplied(true);
      return;
    }
    const defaultCat = getDocumentsDefaultCategory();
    const defaultTab = getDocumentsDefaultTab();
    if (defaultCat) setCategory(defaultCat);
    if (defaultTab === "pathway") setActiveTab("pathway");
    setRoleDefaultsApplied(true);
  }, [activeRole, getDocumentsDefaultCategory, getDocumentsDefaultTab, roleDefaultsApplied, searchParams]);
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
    else if (activeTab === "passages") sp.set("tab", "passages");
    else if (activeTab === "mcf") sp.set("tab", "mcf");
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
        <div className="flex items-start justify-between gap-3 max-w-5xl">
          <div className="flex items-start gap-2 min-w-0">
            <Scale className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Policy documents</h1>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
                Evidence corpus plus an intervention pathway model linking policy instruments to intended
                outcomes. Measured emissions stay on the Dashboard.
              </p>
            </div>
          </div>
          <ClimatePolicyRadarBadge />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3 max-w-5xl">
          <TabsList className="h-8">
            <TabsTrigger value="browse" className="text-[11px] gap-1 h-7">
              <Library className="h-3 w-3" />
              Document library
            </TabsTrigger>
            <TabsTrigger value="passages" className="text-[11px] gap-1 h-7">
              <BookOpen className="h-3 w-3" />
              Key documents (CPR)
            </TabsTrigger>
            <TabsTrigger value="mcf" className="text-[11px] gap-1 h-7">
              <Coins className="h-3 w-3" />
              Climate fund projects
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
          ) : activeTab === "passages" ? (
            <PassageCorpusTab />
          ) : activeTab === "mcf" ? (
            <McfProjectsTab />
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
