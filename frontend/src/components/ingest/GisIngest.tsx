// GIS Ingest — GeoJSON / zipped Shapefile dropzone, attribute mapping, preview.
import { useState } from "react";
import shp from "shpjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe2, CheckCircle2, MapIcon } from "lucide-react";
import { toast } from "sonner";

type Step = "drop" | "map" | "done";

interface FeatureCollection { type: "FeatureCollection"; features: { properties?: Record<string, unknown> }[]; }

export function GisIngest() {
  const [step, setStep] = useState<Step>("drop");
  const [filename, setFilename] = useState("");
  const [fc, setFc] = useState<FeatureCollection | null>(null);
  const [districtField, setDistrictField] = useState("");
  const [valueField, setValueField] = useState("");
  const [yearField, setYearField] = useState("");
  const [layerName, setLayerName] = useState("");
  const [savedLayers, setSavedLayers] = useState<{ name: string; ts: string; features: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem("gis_layers") ?? "[]"); } catch { return []; }
  });

  const handleFile = async (f: File) => {
    setFilename(f.name);
    try {
      if (f.name.endsWith(".geojson") || f.name.endsWith(".json")) {
        const text = await f.text();
        setFc(JSON.parse(text));
      } else if (f.name.endsWith(".zip")) {
        const buf = await f.arrayBuffer();
        const result = await shp(buf);
        const collection = Array.isArray(result) ? result[0] : result;
        setFc(collection as unknown as FeatureCollection);
      } else {
        toast.error("Unsupported file. Use .geojson or zipped .shp bundle.");
        return;
      }
      setLayerName(f.name.replace(/\.(geojson|json|zip)$/, ""));
      setStep("map");
    } catch (e: unknown) {
      toast.error("Failed to parse file: " + (e instanceof Error ? e.message : "unknown error"));
    }
  };

  const fields = fc ? Object.keys(fc.features[0]?.properties ?? {}) : [];

  const publish = () => {
    if (!fc) return;
    const layer = { name: layerName, ts: new Date().toISOString(), features: fc.features.length };
    const next = [layer, ...savedLayers].slice(0, 20);
    setSavedLayers(next);
    localStorage.setItem("gis_layers", JSON.stringify(next));
    toast.success(`Layer "${layerName}" published with ${fc.features.length} features.`);
    setStep("done");
  };

  const reset = () => { setStep("drop"); setFilename(""); setFc(null); setDistrictField(""); setValueField(""); setYearField(""); };

  return (
    <div className="space-y-3">
      {step === "drop" && (
        <div onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onDragOver={e => e.preventDefault()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition cursor-pointer"
          onClick={() => document.getElementById("gis-input")?.click()}>
          <Globe2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-foreground font-medium">Drop .geojson or zipped Shapefile (.zip) here</p>
          <p className="text-[10px] text-muted-foreground mt-1">Will be aligned to Uganda district layer for indicator linkage.</p>
          <input id="gis-input" type="file" accept=".geojson,.json,.zip" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {step === "map" && fc && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-foreground">{filename}</span>
            <Badge variant="outline" className="text-[10px]">{fc.features.length} features</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <FieldPick label="District attribute" value={districtField} onChange={setDistrictField} options={fields} required />
            <FieldPick label="Value attribute" value={valueField} onChange={setValueField} options={fields} />
            <FieldPick label="Year attribute" value={yearField} onChange={setYearField} options={fields} />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Layer name</label>
            <input className="w-full h-7 text-xs px-2 border border-border rounded bg-background"
              value={layerName} onChange={e => setLayerName(e.target.value)} />
          </div>

          {/* Lightweight text preview */}
          <div className="border border-border rounded p-2 max-h-40 overflow-auto">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Preview (first 8 features)</p>
            <table className="w-full text-[10px]">
              <thead><tr className="text-muted-foreground border-b border-border">{fields.map(f => <th key={f} className="text-left p-1">{f}</th>)}</tr></thead>
              <tbody>
                {fc.features.slice(0, 8).map((feat, i) => (
                  <tr key={i} className="border-b border-border/30">
                    {fields.map(f => <td key={f} className="p-1 text-foreground">{String(feat.properties?.[f] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={reset}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={publish} disabled={!districtField || !layerName}>Publish layer</Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="text-center py-6 space-y-2">
          <CheckCircle2 className="h-8 w-8 text-on-track mx-auto" />
          <p className="text-xs text-foreground font-medium">Layer registered.</p>
          <Button size="sm" className="h-7 text-xs" onClick={reset}>Import another layer</Button>
        </div>
      )}

      {savedLayers.length > 0 && (
        <div className="pt-3 border-t border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Registered layers</p>
          <table className="w-full text-[10px]">
            <thead><tr className="text-muted-foreground border-b border-border"><th className="text-left p-1">Name</th><th className="text-right p-1">Features</th><th className="text-left p-1">Imported</th></tr></thead>
            <tbody>
              {savedLayers.map((l, i) => (
                <tr key={i} className="border-b border-border/30">
                  <td className="p-1 font-medium text-foreground">{l.name}</td>
                  <td className="p-1 text-right">{l.features}</td>
                  <td className="p-1 text-muted-foreground">{l.ts.replace("T"," ").slice(0,16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FieldPick({ label, value, onChange, options, required }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}{required && " *"}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="— pick attribute —" /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
