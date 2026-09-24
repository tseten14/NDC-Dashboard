import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search, X } from "lucide-react";
import { useCountry } from "@/context/CountryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FrameworkSelector } from "@/components/classification/FrameworkSelector";
import { SectorHierarchy } from "@/components/classification/SectorHierarchy";
import { SelectionSummary } from "@/components/classification/SelectionSummary";
import { DEFAULT_FRAMEWORK, getFramework, type ClassificationFramework, type SectorNode } from "@/data/classifications";
import { flattenSectors, matchesBranch, matchesSector, planFrameworkChange, readClassificationSelection, saveClassificationSelection, toggleCategory, type ClassificationSelection } from "@/lib/sector-classification";

function loadSelection(countryCode: string) {
  try { return { saved: readClassificationSelection(countryCode), error: "" }; }
  catch { return { saved: null, error: "Your saved selection could not be read. Browser storage may be blocked, or the saved hierarchy may no longer be supported. Your stored data has not been changed." }; }
}

export default function SectorClassification() {
  const { country } = useCountry();
  if (!country) return <p className="p-6" role="status">Choose a country to manage its sector classification.</p>;
  return <ClassificationWorkspace key={country.code} countryCode={country.code} countryName={country.name} />;
}

function ClassificationWorkspace({ countryCode, countryName }: { countryCode: string; countryName: string }) {
  const [initial] = useState(() => loadSelection(countryCode));
  const [saved, setSaved] = useState<ClassificationSelection | null>(initial.saved);
  const [loadError, setLoadError] = useState(initial.error);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [framework, setFramework] = useState(() => getFramework(initial.saved?.frameworkId) ?? DEFAULT_FRAMEWORK);
  const [selected, setSelected] = useState(() => new Set(initial.saved?.selectedCodes ?? []));
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(new Set<string>());
  const [pendingFramework, setPendingFramework] = useState<ClassificationFramework | null>(null);
  const [replaceUnreadable, setReplaceUnreadable] = useState(false);
  const nodes = useMemo(() => flattenSectors(framework.hierarchy), [framework]);
  const search = query.trim();
  const matches = search ? nodes.filter((node) => matchesSector(node, search)).length : 0;
  const dirty = saved ? framework.id !== saved.frameworkId || selected.size !== saved.selectedCodes.length
    || saved.selectedCodes.some((code) => !selected.has(code)) : selected.size > 0 || framework.id !== DEFAULT_FRAMEWORK.id;
  const migration = pendingFramework ? planFrameworkChange(selected, framework, pendingFramework) : null;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const select = (node: SectorNode, include: boolean) => {
    setSelected((current) => toggleCategory(node, current, include));
    setNotice("");
  };
  const expand = (code: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });
  const restore = () => {
    const result = loadSelection(countryCode);
    setLoadError(result.error);
    if (result.error) return;
    setSaved(result.saved);
    setFramework(getFramework(result.saved?.frameworkId) ?? DEFAULT_FRAMEWORK);
    setSelected(new Set(result.saved?.selectedCodes ?? []));
    setQuery(""); setExpanded(new Set()); setSaveError(""); setNotice("Saved selection restored.");
  };
  const save = () => {
    try {
      const record = saveClassificationSelection(countryCode, framework, selected);
      setSaved(record); setSaveError(""); setNotice("Selection saved. You can return to edit it at any time.");
    } catch {
      setSaveError("Selection could not be saved. Allow browser storage or free some space, then try Save selection again. Your edits are still here.");
    }
  };
  const changeFramework = (id: string) => {
    const next = getFramework(id);
    if (!next || next.unavailableReason || next.id === framework.id) return;
    setPendingFramework(next);
  };
  const confirmFramework = () => {
    if (!pendingFramework || !migration) return;
    setFramework(pendingFramework); setSelected(new Set(migration.retained));
    setQuery(""); setExpanded(new Set()); setNotice("Framework changed. Choose categories and save to update your saved selection.");
    setPendingFramework(null);
  };

  return <div className="mx-auto flex min-h-full max-w-7xl flex-col px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
    <header className="mb-7">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Sector Classification</h1>
      <p className="mt-2 text-sm text-muted-foreground">Choose a reporting framework and the sectors you want to work with.</p>
    </header>

    {loadError && <div role="alert" className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p>{loadError}</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={restore}>Retry loading</Button><Button variant="outline" onClick={() => setReplaceUnreadable(true)}>Start a new selection</Button></div>
    </div>}
    <p role="status" aria-live="polite" className="sr-only">{notice}</p>

    <div className="grid flex-1 content-start items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
      <FrameworkSelector value={framework.id} onChange={changeFramework} />
      <section aria-labelledby="sectors-heading" className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 id="sectors-heading" className="text-xl font-semibold">Sectors</h2><p className="mt-1 text-xs text-muted-foreground">{framework.name}</p></div>
          <div className="relative w-full sm:w-64">
            <label htmlFor="sector-search" className="sr-only">Search sectors by name or code</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input id="sector-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sector or code…" className="h-11 rounded-xl pl-9 pr-11" />
            {query && <Button variant="ghost" size="icon" className="absolute right-0.5 top-0.5 h-10 w-10" aria-label="Clear search" onClick={() => { setQuery(""); document.getElementById("sector-search")?.focus(); }}><X className="h-4 w-4" /></Button>}
          </div>
        </div>
        <p className="mb-4 mt-5 text-xs leading-relaxed text-muted-foreground">Select a sector to include its categories. Use the arrow to choose individual categories.</p>
        {search && <p role="status" className="mb-3 text-xs text-primary">{matches} matching {matches === 1 ? "category" : "categories"}</p>}
        {framework.hierarchy.length === 0 ? <p role="status" className="rounded-xl bg-muted p-5 text-sm">This framework has no verified hierarchy available.</p>
          : search && !framework.hierarchy.some((node) => matchesBranch(node, search)) ? <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">No matching sectors or codes</p><p className="mt-2 text-sm text-muted-foreground">Try “Livestock”, “3.A” or “Waste”. Your selection is unchanged.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setQuery(""); document.getElementById("sector-search")?.focus(); }}>Clear search</Button>
          </div> : <SectorHierarchy nodes={framework.hierarchy} selected={selected} expanded={expanded} query={search} onExpand={expand} onSelect={select} />}
        <details className="mt-5 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
          <summary className="w-fit cursor-pointer rounded py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">About this classification</summary>
          <p className="mt-2">This selector includes sector and category levels through codes such as 3.A.1. Finer reporting detail is not included. A selection does not indicate that emissions data are available.</p>
          {framework.source && <a href={framework.source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-start gap-1.5 rounded text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{framework.source.title}<ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" /></a>}
          <p className="mt-2">{framework.source?.pages}. Codes use dots between segments; chemical formulas use subscripts.</p>
          <p className="mt-3">Time series, district review, recalculation, submission and scenarios are not connected to this selection yet.</p>
        </details>
      </section>
    </div>
    <SelectionSummary framework={framework} selected={selected} dirty={dirty} savedAt={saved?.savedAt} blocked={!!loadError} saveError={saveError}
      onSave={save} onRemove={(node) => select(node, false)} onReset={restore} onClear={() => { setSelected(new Set()); setNotice("Selection cleared. Save to update your saved selection."); }} />

    <AlertDialog open={!!pendingFramework} onOpenChange={(open) => { if (!open) setPendingFramework(null); }}>
      <AlertDialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl" onCloseAutoFocus={(event) => { event.preventDefault(); document.getElementById(`framework-${framework.id}`)?.focus(); }}>
        <AlertDialogHeader>
          <AlertDialogTitle>Switch to {pendingFramework?.name}?</AlertDialogTitle>
          <AlertDialogDescription>The categories in these frameworks cannot be matched automatically. {selected.size ? `All ${selected.size} categories below will be cleared so you can choose again.` : "The new framework starts with an empty selection."} Your saved selection stays available until you save again.</AlertDialogDescription>
        </AlertDialogHeader>
        {!!migration?.unmapped.length && <div className="max-h-60 overflow-y-auto rounded-xl border p-3"><p className="mb-2 text-sm font-semibold">Categories to remove</p><ul className="space-y-2 text-sm">{nodes.filter((node) => migration.unmapped.includes(node.code)).map((node) => <li key={node.code}><span className="mr-2 font-mono text-xs">{node.code}</span>{node.label}</li>)}</ul></div>}
        <AlertDialogFooter><AlertDialogCancel>Keep current framework</AlertDialogCancel><AlertDialogAction onClick={confirmFramework}>{selected.size ? "Remove categories and switch" : "Switch framework"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={replaceUnreadable} onOpenChange={setReplaceUnreadable}>
      <AlertDialogContent className="w-[calc(100%-2rem)] rounded-2xl">
        <AlertDialogHeader><AlertDialogTitle>Replace the unreadable selection?</AlertDialogTitle><AlertDialogDescription>Your previous selection cannot be restored here. Saving a new selection will replace its stored record for {countryName}.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { setLoadError(""); setSaved(null); }}>Start a new selection</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
