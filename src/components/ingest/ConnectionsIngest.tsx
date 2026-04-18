// Connections — manage external data sources, schedules, mapping. OpenAPI doc + webhook stubs.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plug, Plus, Trash2, Webhook, Code2, Clock } from "lucide-react";
import { toast } from "sonner";

interface Connection {
  id: string;
  name: string;
  kind: "rest_api" | "postgres" | "csv_url" | "ckan" | "partner_feed";
  endpoint: string;
  schedule: "manual" | "hourly" | "daily" | "weekly";
  mapping_indicator_id: string;
  status: "Connected" | "Pending" | "Error";
}

const STORAGE = "connections_registry";

export function ConnectionsIngest() {
  const [connections, setConnections] = useState<Connection[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE) ?? "[]"); } catch { return []; }
  });
  const [showApi, setShowApi] = useState(false);
  const [draft, setDraft] = useState<Partial<Connection>>({ kind: "rest_api", schedule: "daily", status: "Pending" });

  const save = (next: Connection[]) => { setConnections(next); localStorage.setItem(STORAGE, JSON.stringify(next)); };

  const add = () => {
    if (!draft.name || !draft.endpoint) { toast.error("Name and endpoint required."); return; }
    const c: Connection = {
      id: "C-" + Date.now(),
      name: draft.name!,
      kind: draft.kind ?? "rest_api",
      endpoint: draft.endpoint!,
      schedule: draft.schedule ?? "manual",
      mapping_indicator_id: draft.mapping_indicator_id ?? "",
      status: "Pending",
    };
    save([c, ...connections]);
    setDraft({ kind: "rest_api", schedule: "daily", status: "Pending" });
    toast.success(`Connection "${c.name}" registered (Pending — credentials & schedule managed by NPA admin).`);
  };

  const remove = (id: string) => save(connections.filter(c => c.id !== id));

  return (
    <div className="space-y-4">
      {/* Add new */}
      <div className="border border-border rounded-lg p-3 space-y-2">
        <p className="text-[11px] font-bold text-foreground flex items-center gap-1"><Plus className="h-3 w-3" /> Register new connection</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input placeholder="Connection name (e.g. UBOS quarterly stats)" className="h-7 text-xs"
            value={draft.name ?? ""} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          <Select value={draft.kind} onValueChange={(v: Connection["kind"]) => setDraft(d => ({ ...d, kind: v }))}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rest_api">REST API</SelectItem>
              <SelectItem value="postgres">Postgres database</SelectItem>
              <SelectItem value="csv_url">CSV URL</SelectItem>
              <SelectItem value="ckan">CKAN portal</SelectItem>
              <SelectItem value="partner_feed">Partner feed (Planet, TRACE, etc.)</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Endpoint URL or DSN" className="h-7 text-xs md:col-span-2"
            value={draft.endpoint ?? ""} onChange={e => setDraft(d => ({ ...d, endpoint: e.target.value }))} />
          <Select value={draft.schedule} onValueChange={(v: Connection["schedule"]) => setDraft(d => ({ ...d, schedule: v }))}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual pull</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Maps to indicator_id (optional)" className="h-7 text-xs"
            value={draft.mapping_indicator_id ?? ""} onChange={e => setDraft(d => ({ ...d, mapping_indicator_id: e.target.value }))} />
        </div>
        <div className="flex justify-end">
          <Button size="sm" className="h-7 text-xs" onClick={add}>Register</Button>
        </div>
        <p className="text-[9px] text-muted-foreground italic">Credentials are not stored client-side. Backend connector to be wired via Lovable Cloud — registration here creates the contract.</p>
      </div>

      {/* List */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1"><Plug className="h-3 w-3" /> Active connections ({connections.length})</p>
        {connections.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic">No connections yet.</p>
        ) : (
          <table className="w-full text-[10px]">
            <thead><tr className="text-muted-foreground border-b border-border">
              <th className="text-left p-1">Name</th><th className="text-left p-1">Kind</th><th className="text-left p-1">Endpoint</th>
              <th className="text-left p-1">Schedule</th><th className="text-left p-1">Indicator</th><th className="text-left p-1">Status</th><th></th>
            </tr></thead>
            <tbody>
              {connections.map(c => (
                <tr key={c.id} className="border-b border-border/30">
                  <td className="p-1 font-medium text-foreground">{c.name}</td>
                  <td className="p-1">{c.kind}</td>
                  <td className="p-1 text-muted-foreground truncate max-w-[200px]">{c.endpoint}</td>
                  <td className="p-1 flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{c.schedule}</td>
                  <td className="p-1">{c.mapping_indicator_id || "—"}</td>
                  <td className="p-1"><Badge variant="outline" className="text-[9px] h-4">{c.status}</Badge></td>
                  <td className="p-1 text-right"><Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* OpenAPI + webhook */}
      <div className="pt-3 border-t border-border">
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowApi(s => !s)}>
          <Code2 className="h-3 w-3 mr-1" /> {showApi ? "Hide" : "Show"} OpenAPI & webhook stubs
        </Button>
        {showApi && (
          <div className="mt-2 space-y-2">
            <pre className="text-[9px] bg-muted/50 border border-border rounded p-2 overflow-auto whitespace-pre-wrap leading-snug">
{`openapi: 3.0.3
info:
  title: Uganda NDC Data Explorer — Ingestion API (stub)
  version: 0.1.0
servers: [ { url: https://api.ndc.gov.ug/v1 } ]
paths:
  /ingest/indicator-progress:
    post:
      summary: Push observed values for an indicator
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [indicator_id, period_end, value, source]
              properties:
                indicator_id: { type: string }
                period_end: { type: string, format: date }
                value: { type: number }
                validation_status: { type: string, enum: [Verified, Provisional, Modelled] }
                source: { type: string }
  /webhook/ubos:
    post: { summary: UBOS push webhook (HMAC-signed) }
  /webhook/npa:
    post: { summary: NPA M&E push webhook }
  /pull/ubos: { get: { summary: Trigger UBOS pull (idempotent) } }`}
            </pre>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Webhook className="h-3 w-3" /> Inbound webhooks: <code className="text-[10px] bg-muted/50 px-1">POST /webhook/{`{source}`}</code> · Pull endpoints: <code className="text-[10px] bg-muted/50 px-1">GET /pull/{`{source}`}</code></p>
          </div>
        )}
      </div>
    </div>
  );
}
