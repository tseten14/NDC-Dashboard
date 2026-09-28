/**
 * Provides small presentation controls and types reused by the inventory workflow without duplicating behavior.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { useEffect, useState } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFramework } from '@/data/classifications';
import { flattenSectors } from '@/lib/sector-classification';
import type { Exercise } from '@/lib/inventory-workspace';
export type WorkspaceProps = { exercise: Exercise; update: (patch: Partial<Exercise>, action?: string) => void };
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`rounded-2xl border bg-card p-5  sm:p-6 ${className}`}>{children}</section>; }
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone === 'good' ? 'bg-primary/10 text-primary' : tone === 'warn' ? 'bg-muted text-at-risk' : 'bg-muted text-muted-foreground'}`}>{children}</span>; }
export function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) { return <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-muted-foreground">{label}<select {...props} className={`h-10 min-w-0 max-w-full rounded-lg border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${props.className ?? ''}`}>{children}</select></label>; }
export function CategoryPicker({ exercise, update }: WorkspaceProps) {
  const nodes = flattenSectors(getFramework(exercise.selection.frameworkId)!.hierarchy);
  return <Select label="Reporting category" value={exercise.activeCategory} onChange={e => update({ activeCategory: e.target.value })}>{exercise.selection.selectedCodes.map(code => <option value={code} key={code}>{code} · {nodes.find(n => n.code === code)?.label}</option>)}</Select>;
}
export function Footer({ back, onBack, next, onNext, disabled = false, children }: { back: string; onBack: () => void; next: string; onNext: () => void; disabled?: boolean; children?: ReactNode }) {
  return <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-4 sm:p-5"><Button variant="ghost" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />{back}</Button><div className="flex flex-wrap items-center gap-4"><span className="text-xs text-muted-foreground">{children}</span><Button className="h-11" onClick={onNext} disabled={disabled}>{next}<ArrowRight className="ml-2 h-4 w-4" /></Button></div></footer>;
}

/** Keep partial keystrokes local, so a year can be typed without mutating the calculation mid-edit. */
export function NumberField({ label, value, min, max, onCommit }: { label: string; value: number; min: number; max: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState('');
  useEffect(() => { setDraft(String(value)); setError(''); }, [value]);
  const commit = () => {
    const next = Number(draft);
    if (!draft.trim() || !Number.isInteger(next) || next < min || next > max) { setDraft(String(value)); setError(`Use ${min}–${max}.`); return; }
    setError(''); if (next !== value) onCommit(next);
  };
  return <label className="text-xs text-muted-foreground">{label}<input aria-label={label} type="number" min={min} max={max} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} className="mt-1.5 h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />{error && <span role="status" className="mt-1 block text-xs text-destructive">{error}</span>}</label>;
}
