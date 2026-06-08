// Data Ingestion — three modes: Files, GIS, Connections (client-side).
import { useState } from "react";
import { CockpitBar } from "@/components/CockpitBar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Zap, ShieldCheck } from "lucide-react";
import { GisIngest } from "@/components/ingest/GisIngest";
import { ConnectionsIngest } from "@/components/ingest/ConnectionsIngest";
import { FilesIngest } from "@/components/ingest/FilesIngest";
import { ScanReportIngest } from "@/components/ingest/ScanReportIngest";
import { useCurrentRole } from "@/hooks/use-current-role";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function DataIngestion() {
  const [tab, setTab] = useState("files");
  const { canUseIngest } = useCurrentRole();

  if (!canUseIngest()) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <CockpitBar />
        <div className="p-6 max-w-lg mx-auto text-center space-y-3">
          <h1 className="text-lg font-bold">Data Ingestion</h1>
          <p className="text-sm text-muted-foreground">
            Your current role does not include file ingestion. Switch to MRV Officer, Ministry Delivery Officer, or Admin in the top bar.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <CockpitBar />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 pb-12 space-y-4 max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2"><Upload className="h-4 w-4" /> Data Ingestion</h1>
            <p className="text-xs text-muted-foreground">Two ways to bring data in. There is a real trade-off between speed and trust — pick the path that fits how ready your data is.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTab("scan")}
              className={`text-left rounded-lg border p-3 transition-colors ${tab === "scan" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">Quick scan</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Instant · low-confidence</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Drop in any file to profile its structure and flag NDC-related keywords. Great for triage — but it
                <span className="font-medium text-foreground"> cannot reliably interpret unformatted data</span>, so treat results as a first look, not a verified insight.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setTab("files")}
              className={`text-left rounded-lg border p-3 transition-colors ${tab === "files" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Mapped import</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Mapped · DB-backed</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Map year, value, source, and target columns, then confirm to write observation rows to the database.
                Points appear on the Dashboard for indicator targets (forest, electricity, CSA, wetlands, capacity) — not Climate TRACE emissions sectors yet.
              </p>
            </button>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-8">
              <TabsTrigger value="files" className="text-[11px]">Mapped import</TabsTrigger>
              <TabsTrigger value="scan" className="text-[11px]">Quick scan (triage)</TabsTrigger>
              <TabsTrigger value="gis" className="text-[11px]">Upload GIS</TabsTrigger>
              <TabsTrigger value="conn" className="text-[11px]">Connect data sources</TabsTrigger>
            </TabsList>
            <TabsContent value="files" className="mt-3">
              <Card><CardContent className="p-3"><FilesIngest /></CardContent></Card>
            </TabsContent>
            <TabsContent value="scan" className="mt-3">
              <Card><CardContent className="p-3"><ScanReportIngest /></CardContent></Card>
            </TabsContent>
            <TabsContent value="gis" className="mt-3">
              <Card><CardContent className="p-3"><GisIngest /></CardContent></Card>
            </TabsContent>
            <TabsContent value="conn" className="mt-3">
              <Card><CardContent className="p-3"><ConnectionsIngest /></CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
