import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge, Panel, Select } from '@/components/inventory/shared';
import { number } from '@/lib/inventory-presentation';
import { yearsIn } from '@/lib/inventory-workspace';
import { affectedEntries, calculateScenario, uptakeAt, type ScenarioAction } from '@/lib/scenario-analysis';
import type { ScenarioProps } from './shared';
import { replaceAction } from '@/lib/scenario-analysis';

function Timeline({ start, base, end, ramp }: { start: number; base: number; end: number; ramp: number }) {
  const span = end - base + 1;
  return <div role="img" aria-label={`Starts ${start}; full uptake ${start + ramp - 1 > end ? 'after the horizon' : start + ramp - 1}`} className="relative h-3 min-w-40 overflow-hidden rounded-sm bg-muted"><span className="absolute inset-y-0 right-0 rounded-sm bg-primary" style={{ left: `${(start - base) / span * 100}%` }} /><span className="absolute inset-y-0 bg-primary-foreground/25" style={{ left: `${(start - base) / span * 100}%`, width: `${Math.min(ramp - 1, end - start + 1) / span * 100}%` }} /></div>;
}
export function ScenarioTiming({ scenario: s, update }: ScenarioProps) {
  const actions = s.actions.filter(a => a.selected);
  const [expanded, setExpanded] = useState<string[]>(actions.slice(0, 1).map(a => a.id));
  const [showAll, setShowAll] = useState<string[]>([]);
  const [bulk, setBulk] = useState<Record<string, number>>({});
  const result = calculateScenario(s);
  const options = yearsIn(s.basis.year + 1, s.horizon).map(y => <option key={y}>{y}</option>);
  const commit = (action: ScenarioAction, event: string) => update({ actions: replaceAction(s, { ...action, policy: { ...action.policy, reviewed: false } }) }, event);
  return <>
    <header className="mb-6"><h2 className="font-display text-3xl font-semibold">When does each action start?</h2><p className="mt-2 text-sm text-muted-foreground">Set one start year for sector-wide actions, or a different year at each site. Ramp-up controls how quickly the full effect is reached.</p></header>
    <div className="space-y-4">{actions.map(action => {
      const entries = affectedEntries(s, action);
      const open = expanded.includes(action.id);
      const first = action.scope === 'whole' || !entries.length ? action.start : Math.min(...entries.map(e => action.starts[e.id] ?? action.start));
      const bulkYear = bulk[action.id] ?? action.start;
      return <Panel key={action.id}><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold">{action.title}</h3><Badge>{action.scope === 'whole' ? 'Whole sector' : `Per facility · ${entries.length} entries`}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{s.basis.district} · {action.reductionPct == null ? 'Reduction estimate needed' : `${action.reductionPct}% at full uptake`}</p></div><div className="flex flex-wrap items-end gap-3">{action.scope === 'whole' ? <Select label={`Starts: ${action.title}`} value={action.start} onChange={e => commit({ ...action, start: Number(e.target.value) }, `${action.title}: starts ${e.target.value}`)}>{options}</Select> : <Button variant="outline" onClick={() => setExpanded(open ? expanded.filter(id => id !== action.id) : [...expanded, action.id])}>{open ? 'Hide sites' : 'Set each site'}</Button>}<Select label={`Uptake: ${action.title}`} value={action.uptake} onChange={e => commit({ ...action, uptake: e.target.value as ScenarioAction['uptake'] }, `${action.title}: ${e.target.value} uptake`)}><option value="immediate">Immediate</option><option value="gradual">Gradual</option></Select>{action.uptake === 'gradual' && <Select label={`Ramp years: ${action.title}`} value={action.rampYears} onChange={e => commit({ ...action, rampYears: Number(e.target.value) }, `${action.title}: ${e.target.value}-year ramp`)}>{yearsIn(1, 30).map(y => <option key={y}>{y}</option>)}</Select>}</div></div>
        {action.scope === 'facilities' && open ? <><div className="my-5 flex flex-wrap items-end justify-end gap-2"><Select label={`Set all to: ${action.title}`} value={bulkYear} onChange={e => setBulk({ ...bulk, [action.id]: Number(e.target.value) })}>{options}</Select><Button variant="outline" onClick={() => commit({ ...action, start: bulkYear, starts: Object.fromEntries(entries.map(entry => [entry.id, bulkYear])) }, `${action.title}: all sites start ${bulkYear}`)}>Apply to all sites</Button><Button variant="outline" disabled={bulkYear + entries.length - 1 > s.horizon} onClick={() => commit({ ...action, start: bulkYear, starts: Object.fromEntries(entries.map((entry, index) => [entry.id, bulkYear + index])) }, `${action.title}: staggered one year per site from ${bulkYear}`)}>Stagger by one year</Button></div>{bulkYear + entries.length - 1 > s.horizon && <p className="mb-3 text-xs text-muted-foreground">Choose an earlier bulk start year to fit every staggered site within the horizon.</p>}
          <div className="overflow-x-auto"><table className="w-full min-w-[630px] text-left text-sm"><thead className="border-b text-xs uppercase text-muted-foreground"><tr><th className="py-3 font-medium">Facility / inventory entry</th><th className="px-3 font-medium">Starts</th><th className="w-1/3 px-3 font-medium">Active years to {s.horizon}</th><th className="text-right font-medium">{s.horizon} standalone effect</th></tr></thead><tbody>{entries.slice(0, showAll.includes(action.id) ? undefined : 4).map(entry => {
            const start = action.starts[entry.id] ?? action.start;
            const effect = action.reductionPct == null ? null : entry.value * (1 + s.annualGrowthPct / 100) ** (s.horizon - s.basis.year) * action.reductionPct / 100 * uptakeAt(action, entry.id, s.horizon);
            return <tr className="border-b last:border-0" key={entry.id}><td className="py-4"><p className="font-medium">{entry.name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{entry.id} · {entry.source}</p></td><td className="px-3"><Select label={`Start ${entry.name}: ${action.title}`} value={start} onChange={e => commit({ ...action, starts: { ...action.starts, [entry.id]: Number(e.target.value) } }, `${action.title}: ${entry.name} starts ${e.target.value}`)}>{options}</Select></td><td className="px-3"><Timeline start={start} base={s.basis.year} end={s.horizon} ramp={action.uptake === 'gradual' ? action.rampYears : 1} /></td><td className="text-right font-mono text-xs">{effect == null ? '—' : `−${number(effect)}`} {s.basis.unit}</td></tr>;
          })}</tbody></table></div><div className="mt-3 flex items-center justify-between text-xs text-muted-foreground"><span>{s.basis.year} → {s.horizon}</span>{entries.length > 4 && <Button variant="link" size="sm" onClick={() => setShowAll(showAll.includes(action.id) ? showAll.filter(id => id !== action.id) : [...showAll, action.id])}>{showAll.includes(action.id) ? 'Show fewer sites' : `Show the other ${entries.length - 4} sites`}</Button>}</div></> : <div className="mt-5 grid items-center gap-4 sm:grid-cols-[1fr_auto]"><Timeline start={first} base={s.basis.year} end={s.horizon} ramp={action.uptake === 'gradual' ? action.rampYears : 1} /><span className="font-mono text-sm">−{number(result.effects[action.id]?.annual)} {s.basis.unit} allocated in {s.horizon}</span></div>}
      </Panel>;
    })}</div>
    {!actions.length && <Panel>Select actions in the first step to set their timing.</Panel>}
    <Panel className="mt-5 border-primary/20 bg-primary/5"><p className="text-sm">{result.overlapCount} inventory {result.overlapCount === 1 ? 'entry carries' : 'entries carry'} more than one action.</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Combined effects multiply the emissions remaining after each action, so reductions cannot exceed an entry’s BAU emissions. This assumes independent effects; resolve measures targeting the same mechanism in your action assumptions. Standalone site effects are shown above; results allocate the combined saving without counting it twice.</p></Panel>
  </>;
}
