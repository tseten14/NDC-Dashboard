import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, FlaskConical, FolderOpen, GitBranch, Plus, Settings2 } from 'lucide-react';
import { useCountry } from '@/context/CountryContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge, Footer, Panel, Select } from '@/components/inventory/shared';
import { downloadFile, readExercises, reviewCategory, type Exercise } from '@/lib/inventory-workspace';
import { affectedEntries, calculateScenario, createSampleScenario, createScenario, inventoryBasisChanged, pinInventoryBasis, readScenarios, reviseScenario, scenarioExport, scenarioKey, scenarioReadiness, validateScenario, writeScenarios, type Scenario } from '@/lib/scenario-analysis';
import { ScenarioActions } from '@/components/scenario/ScenarioActions';
import { ScenarioTiming } from '@/components/scenario/ScenarioTiming';
import { ScenarioPolicy } from '@/components/scenario/ScenarioPolicy';
import { ScenarioAssumptions, ScenarioResult } from '@/components/scenario/ScenarioResult';
import './scenario-analysis.css';

export default function ScenarioAnalysis() {
  const { country } = useCountry();
  if (!country) return <p role="status" className="p-6">Choose a country to build a scenario.</p>;
  return <ScenarioWorkspace key={country.code} countryCode={country.code} countryName={country.name} />;
}
function loadWorkspace(country: string) {
  let exercises: Exercise[] = [], scenarios: Scenario[] = [], inventoryError = '', storageError = '', snapshot: string | null = null;
  try { exercises = readExercises(country); } catch { inventoryError = 'Inventory exercises could not be read. Your existing scenarios retain their pinned basis. Restore inventory storage access to create a scenario from an exercise.'; }
  try { scenarios = readScenarios(country); snapshot = localStorage.getItem(scenarioKey(country)); } catch { storageError = 'Saved scenarios could not be read. No records have been changed. Restore browser storage access and reload to retry.'; }
  return { exercises, scenarios, snapshot, inventoryError, storageError };
}
function ScenarioWorkspace({ countryCode, countryName }: { countryCode: string; countryName: string }) {
  const [params, setParams] = useSearchParams();
  const [initial] = useState(() => loadWorkspace(countryCode));
  const [scenarios, setScenarios] = useState(initial.scenarios);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [query, setQuery] = useState('');
  const [settings, setSettings] = useState(false);
  const [newOpen, setNewOpen] = useState(!!params.get('exercise') && !initial.storageError);
  const [name, setName] = useState('');
  const [exerciseId, setExerciseId] = useState(params.get('exercise') ?? initial.exercises[0]?.id ?? '');
  const selectedExercise = initial.exercises.find(e => e.id === exerciseId);
  const [category, setCategory] = useState('');
  const selectedCategory = selectedExercise?.selection.selectedCodes.includes(category) ? category : selectedExercise?.selection.selectedCodes.find(c => reviewCategory(selectedExercise, c).complete) ?? selectedExercise?.selection.selectedCodes[0] ?? '';
  const review = selectedExercise && selectedCategory ? reviewCategory(selectedExercise, selectedCategory) : null;
  const [district, setDistrict] = useState('');
  const selectedDistrict = review?.districts.includes(district) ? district : review?.districts[0] ?? '';
  const [createError, setCreateError] = useState('');
  const lastStored = useRef(initial.snapshot);
  const active = scenarios.find(s => s.id === activeId);
  useEffect(() => { document.getElementById('main-content')?.scrollTo({ top: 0 }); }, [activeId, active?.step]);
  useEffect(() => {
    if (!saveError) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [saveError]);
  function persist(next: Scenario[]) {
    if (initial.storageError) return false;
    setScenarios(next);
    try {
      if (localStorage.getItem(scenarioKey(countryCode)) !== lastStored.current) { setSaveError('Scenarios changed in another tab. Export your unsaved work, then reload. Stored scenarios have not been overwritten.'); return false; }
      writeScenarios(countryCode, next); lastStored.current = localStorage.getItem(scenarioKey(countryCode)); setSaveError(''); return true;
    } catch { setSaveError('Browser storage could not save these changes. Your edits are still here. Free storage or allow access, then retry; export a backup before leaving.'); return false; }
  }
  function update(patch: Partial<Scenario>, event?: string) {
    if (!active) return;
    const next = reviseScenario(active, patch, event);
    persist(scenarios.map(s => s.id === active.id ? next : s));
  }
  function add(scenario: Scenario) { if (initial.storageError) return; persist([scenario, ...scenarios]); setActiveId(scenario.id); setNewOpen(false); setName(''); setCreateError(''); if (params.has('exercise')) setParams({}, { replace: true }); }
  async function restore(file?: File) {
    if (!file || initial.storageError) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Choose a backup smaller than 20 MB.');
      const raw = JSON.parse(await file.text());
      const restored = (Array.isArray(raw) ? raw : [raw]).map(value => { const s = validateScenario(value, countryCode); return reviseScenario({ ...s, id: crypto.randomUUID(), name: `${s.name} · restored` }, {}, 'Restored from scenario backup'); });
      if (!restored.length) throw new Error('The backup contains no scenarios.');
      persist([...restored, ...scenarios]); setRestoreError('');
    } catch (error) { setRestoreError(error instanceof Error ? error.message : 'Backup could not be restored.'); }
  }
  const steps = ['Actions', 'Timing', 'Policy check', 'Result'];
  const selected = active?.actions.filter(a => a.selected) ?? [];
  const covered = active ? new Set(selected.flatMap(a => affectedEntries(active, a).map(e => e.id))).size : 0;
  const numericalIssues = active ? calculateScenario(active).issues : [];
  const readiness = active ? scenarioReadiness(active) : [];
  const currentInventory = active ? initial.exercises.find(e => e.id === active.basis.exerciseId) : null;
  const basisChanged = currentInventory && inventoryBasisChanged(active, currentInventory);
  return <div className="scenario-workspace mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><GitBranch className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Scenario Analysis</p><p className="mt-1 text-xs text-muted-foreground">{countryName} · mitigation planning</p></div>{active && <Badge>{active.basis.sample ? 'Sample scenario' : active.savedAt ? 'Saved scenario' : 'Draft scenario'}</Badge>}</div><div className="flex flex-wrap items-center gap-2">{active && <><Button variant="ghost" size="sm" onClick={() => setActiveId(null)}><FolderOpen className="mr-2 h-4 w-4" />All scenarios</Button><Button variant="outline" size="sm" onClick={() => setSettings(true)}><Settings2 className="mr-2 h-4 w-4" />Assumptions</Button></>}<span className="text-xs text-muted-foreground">{saveError ? 'Unsaved changes' : 'Stored on this device'}</span></div></div>
    {(initial.storageError || initial.inventoryError) && <Panel className="mb-4"><p role="alert" className="text-sm">{initial.storageError || initial.inventoryError}</p><Button className="mt-3" variant="outline" onClick={() => window.location.reload()}>Retry loading</Button></Panel>}
    {saveError && <Panel className="mb-4 border-destructive/40"><p role="alert" className="text-sm">{saveError}</p><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={() => persist(scenarios)}>Retry save</Button><Button variant="outline" onClick={() => downloadFile('scenario-backup.json', JSON.stringify(scenarios, null, 2))}>Export unsaved backup</Button></div></Panel>}
    {active ? <>
      <nav aria-label="Scenario progress" className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border bg-card p-3 md:grid-cols-4">{steps.map((step, index) => <button key={step} aria-current={active.step === index + 1 ? 'step' : undefined} onClick={() => update({ step: index + 1 })} className={`flex items-center gap-3 rounded-lg px-2 py-2 text-left text-sm ${active.step === index + 1 ? 'font-semibold' : 'text-muted-foreground'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${active.step === index + 1 ? 'border-primary bg-primary text-primary-foreground' : 'bg-muted/40'}`}>{index + 1}</span>{step}</button>)}</nav>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"><div><p className="text-sm font-medium">{active.basis.category} · {active.basis.categoryName} · {active.basis.district}</p><p className="mt-1 text-xs text-muted-foreground">{active.basis.exerciseName} · {active.basis.year} inventory basis · {active.basis.entries.length} entries · horizon {active.horizon}</p></div><Button variant="link" size="sm" onClick={() => { setNewOpen(true); setCreateError(''); }}>Use a different inventory basis</Button></div>
      {active.basis.sample && <p role="note" className="mb-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground"><FlaskConical className="h-4 w-4 shrink-0 text-amber-600" /><span><strong className="text-foreground">Sample values.</strong> Inventory, effects, costs, target and example policy passages are synthetic training inputs, not official or provider estimates.</span></p>}
      {basisChanged && <p role="status" className="mb-4 rounded-lg border border-amber-500/30 p-3 text-xs">The inventory exercise has changed since this scenario was created. This scenario keeps its original snapshot; create a new scenario to use the revised basis.</p>}
      {active.step === 1 && <ScenarioActions scenario={active} update={update} />}
      {active.step === 2 && <ScenarioTiming scenario={active} update={update} />}
      {active.step === 3 && <ScenarioPolicy scenario={active} update={update} />}
      {active.step === 4 && <ScenarioResult scenario={active} update={update} onSettings={() => setSettings(true)} />}
      <Footer back={active.step === 1 ? 'All scenarios' : steps[active.step - 2]} onBack={() => active.step === 1 ? setActiveId(null) : update({ step: active.step - 1 })} next={['Set the timing', 'Check the policies', 'See the result', active.savedAt ? 'Scenario saved' : 'Save scenario'][active.step - 1]} onNext={() => active.step === 4 ? update({ savedAt: new Date().toISOString() }, 'Scenario result saved after assumption and policy checks') : update({ step: active.step + 1 })} disabled={active.step === 4 ? readiness.length > 0 || !!active.savedAt : active.step < 3 ? numericalIssues.length > 0 : !selected.length}>{active.step === 1 ? `${selected.length} actions · ${covered} of ${active.basis.entries.length} entries` : active.step === 4 ? readiness.length ? `${readiness.length} open items` : 'Ready for planning review' : `${active.basis.year + 1}–${active.horizon} · ${selected.length} actions`}</Footer>
      <div className="mt-5 flex flex-wrap justify-between gap-3"><Button asChild variant="link" size="sm"><Link to="/sector-classification"><ArrowLeft className="mr-2 h-3 w-3" />Inventory basis</Link></Button><Button variant="link" size="sm" onClick={() => downloadFile('scenario-backup.json', JSON.stringify(scenarioExport(active), null, 2))}>Export scenario backup</Button></div>
      {settings && <ScenarioAssumptions key={active.id} scenario={active} update={update} open={settings} onClose={() => setSettings(false)} />}
    </> : <>
      <header className="mb-8 pt-3"><p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-primary">From inventory to action</p><h1 className="font-display text-4xl font-semibold">Scenario Analysis</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Choose mitigation actions, plan when they start, check the policy evidence, and see how far they take you toward your target.</p></header>
      <div className="grid items-stretch gap-6 lg:grid-cols-[.85fr_1.65fr]"><Panel className="flex flex-col !p-7"><span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><GitBranch className="h-7 w-7" /></span><h2 className="text-xl font-semibold">Build an inventory-based scenario</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Start with a reviewed category and reporting area from Sector Classification. Each scenario keeps a snapshot of the emissions basis it uses.</p><ul className="my-6 space-y-4 text-sm text-muted-foreground">{['Select sector-wide or facility-level actions', 'Set start years and gradual uptake', 'Record policy support, constraints and gaps', 'Compare emissions, costs and the target gap'].map(item => <li className="flex items-start gap-3" key={item}><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}</ul><Button className="mt-auto h-12" disabled={!!initial.storageError} onClick={() => setNewOpen(true)}><Plus className="mr-2 h-4 w-4" />New scenario</Button><Button className="mt-3 h-11" variant="outline" disabled={!!initial.storageError} onClick={() => add(createSampleScenario(countryCode))}><FlaskConical className="mr-2 h-4 w-4" />Explore a sample scenario</Button></Panel>
        <Panel className="!p-7"><div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Your scenarios</h2><p className="mt-2 text-sm text-muted-foreground">Continue a draft or revisit a saved result.</p></div><Input aria-label="Search scenarios" placeholder="Search scenarios…" className="w-full sm:w-56" value={query} onChange={e => setQuery(e.target.value)} /></div><div className="space-y-3">{scenarios.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(s => <button key={s.id} onClick={() => setActiveId(s.id)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/50 p-5 text-left hover:border-primary/40 hover:bg-primary/5"><span><span className="block font-semibold">{s.name}</span><span className="mt-2 block text-xs text-muted-foreground">{s.basis.category} · {s.basis.district} · {s.horizon} horizon · {new Date(s.updatedAt).toLocaleDateString()}</span></span><span className="flex items-center gap-3"><Badge tone={s.savedAt ? 'good' : 'neutral'}>{s.basis.sample ? 'Sample · ' : ''}{s.savedAt ? 'Saved result' : `Draft · step ${s.step}`}</Badge><ArrowRight className="h-4 w-4 text-muted-foreground" /></span></button>)}</div>{!scenarios.some(s => s.name.toLowerCase().includes(query.toLowerCase())) && <div className="my-7 rounded-xl border border-dashed p-8 text-center"><FolderOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" /><p className="text-sm font-medium">{query ? 'No scenarios match your search' : 'Explore what could change'}</p><p className="mt-2 text-xs text-muted-foreground">Start from a reviewed inventory, or try the sample workflow.</p></div>}<div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 text-xs text-muted-foreground">{steps.map((step, i) => <span key={step} className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">{i + 1}</span>{step}</span>)}</div></Panel></div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><label className="cursor-pointer rounded-lg border bg-card px-4 py-2 text-xs font-medium">Restore scenario backup<input type="file" accept=".json,application/json" aria-label="Restore scenario backup" className="sr-only" disabled={!!initial.storageError} onChange={e => { void restore(e.target.files?.[0]); e.target.value = ''; }} /></label><p className="text-xs text-muted-foreground">Scenarios save in this browser. Export a backup to move between devices.</p></div>{restoreError && <p role="alert" className="mt-3 text-sm text-destructive">{restoreError}</p>}
    </>}
    <Dialog open={newOpen} onOpenChange={open => { setNewOpen(open); if (!open && params.has('exercise')) setParams({}, { replace: true }); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Choose your inventory basis</DialogTitle><DialogDescription>Create a separate scenario from a reviewed category. Existing scenarios keep their original basis and decisions.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={e => { e.preventDefault(); try { if (!name.trim() || !selectedExercise) throw new Error('Name the scenario and select an inventory exercise.'); add(createScenario(countryCode, name, pinInventoryBasis(selectedExercise, selectedCategory, selectedDistrict))); } catch (error) { setCreateError(error instanceof Error ? error.message : 'Could not create scenario.'); } }}><label className="block text-sm">Scenario name<Input className="mt-1.5" placeholder="e.g. Livestock transition 2035" value={name} maxLength={120} onChange={e => setName(e.target.value)} required /></label><Select label="Inventory exercise" value={exerciseId} onChange={e => { setExerciseId(e.target.value); setCategory(''); setDistrict(''); }}><option value="" disabled>Choose an exercise</option>{initial.exercises.map(e => <option key={e.id} value={e.id}>{e.name}{e.sample ? ' · sample' : ''}</option>)}</Select>{selectedExercise && <><Select label="Inventory category" value={selectedCategory} onChange={e => { setCategory(e.target.value); setDistrict(''); }}>{selectedExercise.selection.selectedCodes.map(code => <option key={code} value={code}>{code} · {reviewCategory(selectedExercise, code).complete ? 'Reviewed' : 'Review incomplete'}</option>)}</Select><Select label="Reporting area" value={selectedDistrict} onChange={e => setDistrict(e.target.value)}>{review?.districts.map(d => <option key={d}>{d}</option>)}</Select></>}{!review?.complete && <div className="rounded-xl border bg-muted/30 p-4 text-sm"><p>{initial.exercises.length ? 'Complete the source choices, calculation and focal point for this category before modelling.' : 'No inventory exercises are available yet. Create one in Sector Classification, or explore a sample scenario.'}</p><Button asChild variant="link" className="mt-2 px-0"><Link to="/sector-classification">Open Sector Classification →</Link></Button></div>}{createError && <p role="alert" className="text-sm text-destructive">{createError}</p>}<Button type="submit" className="w-full" disabled={!review?.complete || !selectedDistrict || !name.trim() || !!initial.storageError}>Create scenario</Button></form></DialogContent></Dialog>
  </div>;
}
