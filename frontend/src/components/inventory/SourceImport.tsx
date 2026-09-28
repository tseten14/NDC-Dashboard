/**
 * Imports candidate inventory series into a browser-local exercise and records source metadata supplied by the user.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CSV_TEMPLATE, downloadFile, parseSourceCsv, type InventorySource } from '@/lib/inventory-workspace';
import { Select, type WorkspaceProps } from './shared';
export function SourceImport({ exercise, update, open, onOpenChange }: WorkspaceProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [id, setId] = useState<InventorySource['id']>('collected');
  const [name, setName] = useState('Collected National Data');
  const [version, setVersion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState(false);
  const existing = exercise.sources.some(s => s.id === id);
  async function upload() {
    setError(''); setBusy(true);
    try {
      if (!file) throw new Error('Choose a CSV file.');
      if (file.size > 10 * 1024 * 1024) throw new Error('Choose a CSV smaller than 10 MB.');
      const source = parseSourceCsv(await file.text(), { id, name, version }, exercise);
      update({ sources: [...exercise.sources.filter(s => s.id !== id), source] }, `Imported ${source.name} · ${source.version} · ${source.rows.length} observations`);
      onOpenChange(false); setFile(null); setReplace(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Import failed.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Import a data source</DialogTitle><DialogDescription>Compare annual estimates on the same unit, gas and GWP basis. Each upload belongs only to this exercise.</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2"><Select label="Source slot" value={id} onChange={e => { const value = e.target.value as InventorySource['id']; setId(value); setName(value === 'collected' ? 'Collected National Data' : value === 'surrogate' ? 'Surrogate indicator' : `Series ${value.toUpperCase()}`); setReplace(false); }}><option value="collected">Collected reference</option><option value="a">Candidate A</option><option value="b">Candidate B</option><option value="surrogate">Surrogate indicator</option></Select>
    <label className="text-sm">Source name<Input className="mt-1.5" value={name} onChange={e => setName(e.target.value)} /></label></div>
    <label className="text-sm">Release / survey version<Input className="mt-1.5" placeholder="e.g. National survey 2024, revision 2" value={version} onChange={e => setVersion(e.target.value)} /></label>
    <div className="rounded-xl bg-muted/50 p-4 text-xs leading-relaxed text-muted-foreground"><p className="font-medium text-foreground">One row per category, district, entry and year</p><p className="mt-2 break-words font-mono">category, district, entry_id, entry_name, year, value, unit, basis</p><p className="mt-2">Use the selected terminal category codes. Use “National” for national-only data. Keep entry IDs stable across sources to identify matches; missing rows remain gaps. Include detail entries or totals, never both. Put gas and GWP convention in basis. Upload emissions estimates separately from activity data.</p><Button variant="link" className="h-auto px-0 pt-3 text-xs" onClick={() => downloadFile('inventory-import-template.csv', CSV_TEMPLATE, 'text/csv')}><Download className="mr-2 h-3 w-3" />Download CSV template</Button></div>
    <label className="rounded-xl border border-dashed p-5 text-sm"><Upload className="mb-3 h-5 w-5 text-primary" />CSV file<Input aria-label="CSV file" type="file" accept=".csv,text/csv" className="mt-2" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
    {existing && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} className="mt-1 accent-primary" />Replace this source’s observations. Calculations must be reviewed and applied again.</label>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button disabled={busy || !file || !name.trim() || !version.trim() || (existing && !replace)} onClick={upload}>{busy ? 'Validating…' : 'Validate and import'}</Button>
  </DialogContent></Dialog>;
}
