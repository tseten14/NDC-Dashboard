import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileStack, FlaskConical, FolderOpen, Plus, Search } from 'lucide-react';
import { useCountry } from '@/context/CountryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClassificationWorkspace } from '@/components/classification/ClassificationWorkspace';
import { getFramework } from '@/data/classifications';
import { readClassificationSelection, type ClassificationSelection } from '@/lib/sector-classification';
import { createExercise, createSampleExercise, downloadFile, exerciseKey, exportPackage, readExercises, reviseExercise, writeExercises, validateExercise, type Exercise } from '@/lib/inventory-workspace';
import { Badge, Panel } from '@/components/inventory/shared';
import { TimeSeries } from '@/components/inventory/TimeSeries';
import { Recalculation } from '@/components/inventory/Recalculation';
import { InventoryReview } from '@/components/inventory/InventoryReview';

export default function SectorClassification() {
  const { country } = useCountry();
  if (!country) return <p role="status" className="p-6">Choose a country to manage inventory exercises.</p>;
  return <InventoryWorkspace key={country.code} countryCode={country.code} countryName={country.name} />;
}
function InventoryWorkspace({ countryCode, countryName }: { countryCode: string; countryName: string }) {
  const [initial] = useState(() => { try { return { exercises: readExercises(countryCode), snapshot: localStorage.getItem(exerciseKey(countryCode)), error: '' }; } catch { return { exercises: [] as Exercise[], snapshot: null, error: 'Saved exercises could not be read. Your stored data has not been changed. Restore browser storage access and reload to retry.' }; } });
  const lastStored = useRef(initial.snapshot);
  const [exercises, setExercises] = useState(initial.exercises);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [inherit, setInherit] = useState(false);
  const [selectionReset, setSelectionReset] = useState<ClassificationSelection | null>(null);
  const [savedSelection] = useState(() => { try { return readClassificationSelection(countryCode); } catch { return null; } });
  const active = exercises.find(e => e.id === activeId);
  useEffect(() => { document.getElementById('main-content')?.scrollTo({ top: 0 }); }, [activeId, active?.step]);
  const persist = (next: Exercise[]) => {
    setExercises(next);
    try {
      if (localStorage.getItem(exerciseKey(countryCode)) !== lastStored.current) {
        setSaveError('Exercises changed in another tab. Export your unsaved work as a backup, then reload to load the latest records. No stored exercises were overwritten.');
        return false;
      }
      writeExercises(countryCode, next); lastStored.current = localStorage.getItem(exerciseKey(countryCode)); setSaveError(''); return true;
    }
    catch { setSaveError('Changes are still here, but browser storage could not save them. Free storage or allow access, then retry. Export a backup before leaving.'); return false; }
  };
  useEffect(() => {
    if (!saveError) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [saveError]);
  const update = (patch: Partial<Exercise>, action?: string) => {
    if (!active || initial.error) return false;
    const next = reviseExercise(active, patch, action);
    return persist(exercises.map(e => e.id === active.id ? next : e));
  };
  const add = (exercise: Exercise) => { if (initial.error) return; persist([exercise, ...exercises]); setActiveId(exercise.id); setNewOpen(false); setName(''); };
  const restoreBackup = async (file?: File) => {
    if (!file || initial.error) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Choose a backup smaller than 20 MB.');
      const raw = JSON.parse(await file.text());
      const restored = (Array.isArray(raw) ? raw : [raw]).map(value => {
        const record = validateExercise(value, countryCode);
        return reviseExercise({ ...record, id: crypto.randomUUID(), name: `${record.name} · restored` }, {}, 'Restored from exported backup');
      });
      if (!restored.length) throw new Error('The backup contains no exercises.');
      persist([...restored, ...exercises]); setRestoreError('');
    } catch (err) { setRestoreError(err instanceof Error ? err.message : 'Backup could not be restored.'); }
  };
  const selectScope = (selection: ClassificationSelection, step = 2) => {
    const changed = active.selection.frameworkId !== selection.frameworkId || [...active.selection.selectedCodes].sort().join() !== [...selection.selectedCodes].sort().join();
    if (changed && active.sources.length) { setSelectionReset(selection); return false; }
    return update({ ...(changed ? { selection } : {}), activeCategory: selection.selectedCodes.includes(active.activeCategory) ? active.activeCategory : selection.selectedCodes[0] ?? '', step }, 'Classification scope saved');
  };
  const steps = ['Classification & sector', 'Time series', 'Recalculation', 'Review & submit'];
  const filtered = exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3"><div className="flex flex-wrap items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/5 text-primary"><FileStack className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Sector Classification</p><p className="mt-0.5 text-xs text-muted-foreground">{countryName} · inventory workspace</p></div>{active && <Badge>{active.name}</Badge>}</div><div className="flex items-center gap-3">{active && <Button variant="ghost" size="sm" onClick={() => setActiveId(null)}><FolderOpen className="mr-2 h-4 w-4" />All exercises</Button>}<span className="text-xs text-muted-foreground">{saveError ? 'Unsaved changes' : 'Stored on this device'}</span></div></div>
    {initial.error && <Panel className="mb-5 border-destructive/40"><p role="alert" className="text-sm">{initial.error}</p><Button variant="outline" className="mt-3" onClick={() => window.location.reload()}>Retry loading</Button></Panel>}
    {saveError && <Panel className="mb-5 border-destructive/40"><p role="alert" className="text-sm">{saveError}</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={() => persist(exercises)}>Retry save</Button><Button variant="outline" onClick={() => downloadFile('inventory-exercises-backup.json', JSON.stringify(exercises, null, 2))}>Export backup</Button></div></Panel>}
    {active ? <>
      <nav aria-label="Exercise progress" className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border bg-card p-3 lg:grid-cols-4">{steps.map((step, index) => <button key={step} aria-current={active.step === index + 1 ? 'step' : undefined} disabled={index > 0 && !active.selection.selectedCodes.length} onClick={() => update({ step: index + 1 })} className={`flex items-center gap-3 rounded-lg px-2 py-2 text-left text-xs sm:text-sm ${active.step === index + 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'} disabled:opacity-40`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${active.step === index + 1 ? 'border-primary bg-primary text-primary-foreground' : 'bg-muted/40'}`}>{index + 1}</span>{step}</button>)}</nav>
      {active.sample && <div role="note" className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-muted p-2.5 text-xs text-muted-foreground"><FlaskConical className="h-4 w-4 shrink-0 text-at-risk" /><p><strong className="text-foreground">Sample exercise.</strong> All observations are synthetic training data for eight illustrative districts. These are not official inventory or Climate TRACE figures.</p></div>}
      {active.step === 1 && <ClassificationWorkspace key={`${active.id}-${active.selection.frameworkId}`} countryCode={countryCode} countryName={countryName} selection={active.selection} onContinue={selectScope} onSaveSelection={selection => selectScope(selection, 1)} />}
      {active.step === 2 && <TimeSeries key={`${active.id}-${active.activeCategory}`} exercise={active} update={update} />}
      {active.step === 3 && <Recalculation exercise={active} update={update} />}
      {active.step === 4 && <InventoryReview exercise={active} update={update} />}
    </> : <>
      <header className="mb-8 pt-3"><p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-primary">From selection to submission</p><h1 className="font-display text-4xl font-semibold tracking-tight">Exercises</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Open a new data collection round, or pick up an exercise already in progress. Compare evidence, choose your sources, and document every decision.</p></header>
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(280px,.85fr)_minmax(0,1.65fr)]"><Panel className="flex flex-col !p-7"><span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Plus className="h-7 w-7" /></span><h2 className="text-xl font-semibold">Start a new exercise</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">Choose a classification and sector, compare candidate time series against collected data, then build a consistent inventory for review.</p><ul className="mb-8 mt-6 space-y-4 text-sm text-muted-foreground">{['Import your reference and candidate datasets', 'Choose a source for each district or entry', 'Recalculate historical estimates with lineage', 'Export a complete package for your reviewer'].map(item => <li className="flex items-start gap-3" key={item}><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul><Button className="mt-auto h-12 w-full" disabled={!!initial.error} onClick={() => setNewOpen(true)}>New exercise<ArrowRight className="ml-2 h-4 w-4" /></Button><Button className="mt-3 h-11" variant="outline" disabled={!!initial.error} onClick={() => add(createSampleExercise(countryCode))}><FlaskConical className="mr-2 h-4 w-4" />Explore a sample exercise</Button></Panel>
        <Panel className="!p-7"><div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Continue a previous exercise</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Reopen at the step where you left off. Exercises here belong to {countryName} and this browser.</p></div><div className="relative w-full sm:w-48"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search exercises" className="pl-9" placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} /></div></div>
          <div className="space-y-3">{filtered.slice(0, showAll ? undefined : 4).map(exercise => <button className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/50 p-5 text-left   " key={exercise.id} onClick={() => setActiveId(exercise.id)}><span className="min-w-0"><span className="block font-semibold">{exercise.name}</span><span className="mt-2 block text-xs text-muted-foreground">{getFramework(exercise.selection.frameworkId)?.name} · {exercise.selection.selectedCodes.length} categories · Edited {new Date(exercise.updatedAt).toLocaleDateString()}</span></span><span className="flex items-center gap-3"><Badge tone={exercise.status === 'ready' ? 'good' : 'neutral'}>{exercise.sample ? 'Sample · ' : ''}{exercise.status === 'ready' ? 'Ready for sign-off' : `In progress · step ${exercise.step}`}</Badge><ArrowRight className="h-4 w-4 text-muted-foreground" /></span></button>)}</div>
          {!filtered.length && <div className="my-8 rounded-xl border border-dashed p-8 text-center"><FolderOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" /><h3 className="text-sm font-medium">{query ? 'No exercises match your search' : 'Your next inventory starts here'}</h3><p className="mt-2 text-xs text-muted-foreground">{query ? 'Try a different exercise name.' : 'Start with your own data, or explore the sample to see the full workflow.'}</p></div>}
          {filtered.length > 4 && <div className="mt-5 flex justify-end border-t pt-3"><Button variant="link" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show recent exercises' : `View all ${filtered.length} exercises`}</Button></div>}
          <div className="mt-7 border-t pt-5"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">One connected workflow</p><div className="mt-4 grid grid-cols-2 gap-4 text-xs text-muted-foreground">{steps.map((s, i) => <span className="flex items-center gap-2" key={s}><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">{i + 1}</span>{s}</span>)}</div></div>
        </Panel></div>
      <div className="mt-6 flex flex-wrap items-center gap-3"><label className="cursor-pointer rounded-lg border bg-card px-4 py-2 text-xs font-medium">Restore exercise backup<input aria-label="Restore exercise backup" type="file" accept=".json,application/json" className="sr-only" disabled={!!initial.error} onChange={e => { void restoreBackup(e.target.files?.[0]); e.target.value = ''; }} /></label>{restoreError && <p role="alert" className="text-xs text-destructive">{restoreError}</p>}</div>
      <p className="mt-6 text-xs text-muted-foreground">Exercise data stays in this browser. Export a backup from an exercise before clearing browser data or moving to another device.</p>
    </>}
    {active && <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><button className="inline-flex items-center gap-2 " onClick={() => setActiveId(null)}><ArrowLeft className="h-3.5 w-3.5" />Back to exercises</button><Button variant="link" size="sm" onClick={() => downloadFile('inventory-exercise-backup.json', JSON.stringify(exportPackage(active), null, 2))}>Export exercise backup</Button></div>}
    <Dialog open={newOpen} onOpenChange={setNewOpen}><DialogContent><DialogHeader><DialogTitle>Start a new exercise</DialogTitle><DialogDescription>Name this collection round for {countryName}. You can then choose the reporting categories and import your data.</DialogDescription></DialogHeader><form onSubmit={e => { e.preventDefault(); if (name.trim()) add(createExercise(countryCode, name, inherit ? savedSelection ?? undefined : undefined)); }}><label className="text-sm">Exercise name<Input autoFocus className="mt-2" placeholder="e.g. AFOLU 2025" value={name} maxLength={120} onChange={e => setName(e.target.value)} /></label>{savedSelection?.selectedCodes.length > 0 && <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={inherit} onChange={e => setInherit(e.target.checked)} className="mt-1" />Start with my previously saved category selection ({savedSelection.selectedCodes.length} categories)</label>}<Button className="mt-5 w-full" type="submit" disabled={!name.trim()}>Create exercise</Button></form></DialogContent></Dialog>
    <Dialog open={!!selectionReset} onOpenChange={open => { if (!open) setSelectionReset(null); }}><DialogContent><DialogHeader><DialogTitle>Start a revised scope?</DialogTitle><DialogDescription>This exercise already contains source data and decisions. Create a new exercise with the revised categories so the original data and history remain available.</DialogDescription></DialogHeader><Button onClick={() => { const next = createExercise(countryCode, `${active.name} · revised scope`, selectionReset); next.step = 2; add(next); setSelectionReset(null); }}>Create exercise with revised scope</Button></DialogContent></Dialog>
  </div>;
}
