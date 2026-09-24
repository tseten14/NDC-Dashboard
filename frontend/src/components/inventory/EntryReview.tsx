import { number, seriesColors } from '@/lib/inventory-presentation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { areaKey, entriesFor, entryKey, yearsIn, type SourceId } from '@/lib/inventory-workspace';
import { Badge, Footer, Panel, Select, type WorkspaceProps } from './shared';

export function EntryReview({ exercise, update, district, onBack }: WorkspaceProps & { district: string; onBack: () => void }) {
  const category = exercise.activeCategory;
  const [year, setYear] = useState(exercise.end);
  const [candidate, setCandidate] = useState<SourceId>(exercise.sources.some(s => s.id === 'a') ? 'a' : exercise.sources.some(s => s.id === 'b') ? 'b' : 'collected');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [gaps, setGaps] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const entries = entriesFor(exercise, category, district);
  const sources = exercise.sources.filter(s => s.id !== 'surrogate');
  const valueFor = (id: string, entry: string) => sources.find(s => s.id === id)?.rows.find(r => r.category === category && r.district === district && r.year === year && r.entryId === entry)?.value;
  const rows = entries.map(entry => ({ ...entry, collected: valueFor('collected', entry.id), candidate: valueFor(candidate, entry.id), decision: exercise.decisions[entryKey(category, district, entry.id)] }));
  const shown = rows.filter(r => (!gaps || r.collected == null || r.candidate == null) && `${r.id} ${r.name}`.toLowerCase().includes(query.toLowerCase()));
  const both = rows.filter(r => r.collected != null && r.candidate != null).length;
  const refOnly = rows.filter(r => r.collected != null && r.candidate == null).length;
  const candidateOnly = rows.filter(r => r.collected == null && r.candidate != null).length;
  const missing = rows.length - both - refOnly - candidateOnly;
  const decided = rows.filter(r => !!r.decision).length;
  const setDecisions = (ids: string[], decision: SourceId | 'exclude') => {
    setError('');
    const invalid = decision !== 'exclude' && ids.some(id => !sources.find(s => s.id === decision)?.rows.some(r => r.category === category && r.district === district && r.entryId === id));
    if (invalid) { setError('That source has no observations for one or more selected entries. Choose another source or exclude the entry.'); return; }
    const decisions = { ...exercise.decisions };
    ids.forEach(id => { decisions[entryKey(category, district, id)] = decision; });
    update({ decisions }, `${category} · ${district}: ${ids.length} entry decisions set to ${decision}`);
  };
  return <>
    <div className="mb-6"><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Inspect the evidence</p><h2 className="font-display text-3xl font-semibold">What’s inside each series</h2><p className="mt-2 text-sm text-muted-foreground">{category} · {district} · Match entries by their imported ID, choose the basis and record your reasoning.</p></div>
    <Panel className="mb-4"><div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="font-semibold">{district}</h3><p className="mt-1 text-xs text-muted-foreground">Decisions apply to every year in this exercise. The year filter only changes the preview.</p></div><div className="flex max-w-full gap-3"><Select label="Compare source" value={candidate} onChange={e => setCandidate(e.target.value as SourceId)}>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select><Select label="Preview year" value={year} onChange={e => setYear(Number(e.target.value))}>{yearsIn(exercise.start, exercise.end).map(y => <option key={y}>{y}</option>)}</Select></div></div></Panel>
    <Panel className="mb-4"><div className="flex flex-wrap justify-between gap-3"><h3 className="text-sm font-semibold">{both} of {both + refOnly} collected entries matched in {year}</h3><div className="flex flex-wrap gap-3 text-xs text-muted-foreground"><span>In both · {both}</span><span>Candidate only · {candidateOnly}</span><span>Collected only · {refOnly}</span>{missing > 0 && <span>No data this year · {missing}</span>}</div></div><div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-muted" aria-label="Entry overlap">{[{ count: both, color: 'bg-primary' }, { count: candidateOnly, color: 'bg-violet-500' }, { count: refOnly, color: 'bg-amber-700' }].map((s, i) => <span key={i} className={s.color} style={{ width: `${rows.length ? s.count / rows.length * 100 : 0}%` }} />)}</div></Panel>
    <Panel><div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label="Select all visible entries" checked={!!shown.length && shown.every(r => selected.has(r.id))} onChange={e => setSelected(e.target.checked ? new Set(shown.map(r => r.id)) : new Set())} />Select all · {selected.size} selected</label><div className="flex flex-wrap items-center gap-2">{sources.map(s => <Button key={s.id} variant="outline" size="sm" disabled={!selected.size} onClick={() => setDecisions([...selected], s.id as SourceId)}>{s.id === 'collected' ? 'Collected' : `Series ${s.id.toUpperCase()}`}</Button>)}<Button variant="outline" size="sm" disabled={!selected.size} onClick={() => setDecisions([...selected], 'exclude')}>Exclude</Button><label className="ml-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={gaps} onChange={e => { setGaps(e.target.checked); setSelected(new Set()); }} />Only gaps</label></div></div><Input aria-label="Search entries" placeholder="Search entry name or ID…" className="mb-4 max-w-sm" value={query} onChange={e => { setQuery(e.target.value); setSelected(new Set()); }} />
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted-foreground"><tr>{['', 'Match', 'Facility / entry', 'Collected', 'Candidate', 'Δ', 'Use', 'Officer note'].map((label, i) => <th key={i} className="px-2 py-3 font-medium" scope="col">{label}</th>)}</tr></thead><tbody>{shown.map(row => {
        const key = entryKey(category, district, row.id);
        const delta = row.collected != null && row.collected !== 0 && row.candidate != null ? 100 * (row.candidate - row.collected) / Math.abs(row.collected) : null;
        return <tr className="border-b last:border-0" key={row.id}><td className="px-2 py-4"><input type="checkbox" aria-label={`Select ${row.name}`} checked={selected.has(row.id)} onChange={e => setSelected(current => { const next = new Set(current); if (e.target.checked) next.add(row.id); else next.delete(row.id); return next; })} /></td><td className="px-2"><Badge tone={row.collected != null && row.candidate != null ? 'good' : 'warn'}>{row.collected != null ? row.candidate != null ? 'In both' : 'Collected only' : row.candidate != null ? 'Candidate only' : 'No data'}</Badge></td><td className="px-2"><span className="font-medium">{row.name}</span><span className="mt-1 block font-mono text-xs text-muted-foreground">{row.id}</span></td><td className="px-2 font-mono text-xs">{number(row.collected)}</td><td className="px-2 font-mono text-xs">{number(row.candidate)}</td><td className="px-2 font-mono text-xs">{delta == null ? '—' : `${number(delta, 1)}%`}</td><td className="min-w-40 px-2"><Select label={`Source for ${row.name}`} value={row.decision ?? ''} onChange={e => setDecisions([row.id], e.target.value as SourceId | 'exclude')}><option value="" disabled>Decide…</option>{sources.map(s => <option key={s.id} value={s.id}>{s.id === 'collected' ? 'Collected' : `Series ${s.id.toUpperCase()}`}</option>)}<option value="exclude">Exclude</option></Select></td><td className="min-w-56 px-2"><Input aria-label={`Note for ${row.name}`} placeholder="Add an officer note…" value={exercise.notes[key] ?? ''} onChange={e => update({ notes: { ...exercise.notes, [key]: e.target.value } })} /></td></tr>;
      })}</tbody></table></div>{!shown.length && <p className="py-6 text-sm text-muted-foreground">No entries match your filters.</p>}<p className="mt-4 text-xs text-muted-foreground">Values in {sources[0]?.unit ?? 'imported units'}. Matching IDs do not verify that source boundaries agree; check the source methodology before combining entries.</p>
    </Panel>
    <Panel className="mt-4"><label className="text-sm font-semibold">General note on {district} · {category}<textarea className="mt-3 min-h-24 w-full rounded-xl border bg-background p-3 text-sm font-normal" placeholder="What will be used, what is missing, and what to collect next round…" value={exercise.notes[areaKey(category, district)] ?? ''} onChange={e => update({ notes: { ...exercise.notes, [areaKey(category, district)]: e.target.value } })} /></label><p className="mt-2 text-xs text-muted-foreground">Notes and entry decisions save with this exercise.</p></Panel>
    <Footer back="District comparison" onBack={onBack} next={`Use this mix for ${district}`} disabled={!entries.length || decided !== entries.length} onNext={() => { update({ assignments: { ...exercise.assignments, [areaKey(category, district)]: 'mix' } }, `${category} · ${district}: applied entry-level source mix`); onBack(); }}>{decided} of {entries.length} entries decided</Footer>
  </>;
}
