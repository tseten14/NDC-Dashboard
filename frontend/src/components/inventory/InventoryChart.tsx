/**
 * Plots user-provided inventory series while keeping missing years distinct from zero values.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesPoint } from '@/lib/inventory-workspace';

export function InventoryChart({ series, compact = false, mode = 'series', change, unit }: {
  series: { id: string; name: string; color: string; points: SeriesPoint[] }[];
  compact?: boolean; mode?: 'series' | 'residuals' | 'scatter'; change?: number; unit?: string;
}) {
  const reference = series[0]?.points ?? [];
  const rows = reference.map(p => Object.fromEntries([['year', p.year], ...series.map(s => {
    const value = s.points.find(v => v.year === p.year)?.value ?? null;
    return [s.id, mode === 'residuals' ? value !== null && p.value !== null ? value - p.value : null : value];
  })]));
  return <div className={compact ? 'h-24 w-full min-w-0' : 'h-72 w-full min-w-0'} role="img" aria-label={`${mode === 'residuals' ? 'Difference from collected' : mode === 'scatter' ? 'Candidate versus collected' : 'Annual time series'} chart${unit ? ` in ${unit}` : ''}`}>
    <ResponsiveContainer width="100%" height="100%">
      {mode === 'scatter' ? <ScatterChart margin={{ top: 16, right: 24, bottom: 24, left: 8 }}>
        <CartesianGrid stroke="currentColor" opacity={.1} /><XAxis type="number" dataKey="reference" name="Collected" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} /><YAxis type="number" dataKey="candidate" name="Candidate" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip cursor={{ strokeDasharray: '3 3' }} /><Legend />
        {series.slice(1).map(s => <Scatter key={s.id} name={s.name} fill={s.color} data={reference.flatMap(p => { const v = s.points.find(t => t.year === p.year)?.value; return p.value !== null && v != null ? [{ reference: p.value, candidate: v, year: p.year }] : []; })} />)}
      </ScatterChart> : <LineChart data={rows} margin={{ top: 12, right: compact ? 3 : 18, left: compact ? 0 : 0, bottom: 4 }}>
        {!compact && <CartesianGrid vertical={false} stroke="currentColor" opacity={.1} />}
        <XAxis dataKey="year" hide={compact} minTickGap={30} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
        <YAxis hide={compact} width={55} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(v)} tickLine={false} axisLine={false} />
        {!compact && <Tooltip contentStyle={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => [Number(v).toLocaleString(undefined, { maximumFractionDigits: 3 }), undefined]} />}
        {!compact && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />}
        {mode === 'residuals' && <ReferenceLine y={0} stroke="currentColor" opacity={.3} />}
        {change && <ReferenceLine x={change} stroke="#a4643b" strokeDasharray="4 4" label={{ value: 'Source change', position: 'insideTopRight', fontSize: 11 }} />}
        {series.filter((s, i) => mode !== 'residuals' || i > 0).map(s => <Line key={s.id} type="linear" dataKey={s.id} name={s.name} stroke={s.color} strokeWidth={compact ? 1.8 : 2.5} strokeDasharray={s.id === 'b' ? '5 4' : undefined} dot={false} activeDot={compact ? false : { r: 4 }} connectNulls={false} isAnimationActive={false} />)}
      </LineChart>}
    </ResponsiveContainer>
  </div>;
}
