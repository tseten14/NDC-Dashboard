// Data Ingestion — three modes: Files, GIS, Connections (client-side).
import { useState } from "react";
import { CockpitBar } from "@/components/CockpitBar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Zap, ShieldCheck, Construction } from "lucide-react";
import { GisIngest } from "@/components/ingest/GisIngest";
import { ConnectionsIngest } from "@/components/ingest/ConnectionsIngest";
import { ScanReportIngest } from "@/components/ingest/ScanReportIngest";

export default function DataIngestion() {
  const [tab, setTab] = useState("scan");
  return (
    <div className="flex flex-col h-full min-h-0">
      <CockpitBar />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 pb-12 space-y-4 max-w-7xl mx-auto w-full">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2"><Upload className="h-4 w-4" /> Data Ingestion</h1>
            <p className="text-xs text-muted-foreground">Two ways to bring data in. There is a real trade-off between speed and trust — pick the path that fits how ready your data is.</p>
          </div>

          {/* Speed-vs-trust explainer: instant triage vs mapped, dashboard-ready import */}
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
            <div
              role="note"
              aria-disabled
              className="text-left rounded-lg border border-dashed border-border/80 bg-muted/25 p-3 opacity-90 cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground">Mapped import</span>
                <Badge variant="outline" className="ml-auto text-[9px] h-5 gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  <Construction className="h-3 w-3" />
                  Work in progress
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Column mapping to validated, dashboard-ready fields is coming soon. For now use{" "}
                <span className="font-medium text-foreground">Quick scan</span> to profile files, or check back when mapped import is enabled.
              </p>
            </div>
          </div>

          <Tabs
            value={tab}
            onValueChange={(v) => {
              if (v === "files") return;
              setTab(v);
            }}
          >
            <TabsList className="h-8">
              <TabsTrigger value="scan" className="text-[11px]">Quick scan (triage)</TabsTrigger>
              <TabsTrigger value="files" disabled className="text-[11px] opacity-50">
                Mapped import (coming soon)
              </TabsTrigger>
              <TabsTrigger value="gis" className="text-[11px]">Upload GIS</TabsTrigger>
              <TabsTrigger value="conn" className="text-[11px]">Connect data sources</TabsTrigger>
            </TabsList>
            <TabsContent value="scan" className="mt-3">
              <Card><CardContent className="p-3"><ScanReportIngest /></CardContent></Card>
            </TabsContent>
            <TabsContent value="files" className="mt-3">
              <Card className="border-dashed">
                <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                  <Construction className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">Mapped import — work in progress</p>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Trusted column mapping and validated publish to the dashboard are not available yet. Use Quick scan for file triage in the meantime.
                  </p>
                </CardContent>
              </Card>
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
