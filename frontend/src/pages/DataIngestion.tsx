// Data Ingestion — two modes: Data Pipeline and Quick scan.
import { useState } from "react";
import { CockpitBar } from "@/components/CockpitBar";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Zap, ShieldCheck } from "lucide-react";
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
                <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Fast · first look</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Drop in any file and get a plain-language summary of what it contains, what climate topics it touches,
                and how you might use it. Good for a quick first review — not a final verified report.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setTab("files")}
              className={`text-left rounded-lg border p-3 transition-colors ${tab === "files" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Data Pipeline</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">Saved to database</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Upload a spreadsheet — policy catalogs get sensible defaults. Clean, download a filtered CSV, or save to the database.
              </p>
            </button>
          </div>

          <div className="mt-1">
            {tab === "files" && (
              <Card><CardContent className="p-3"><FilesIngest /></CardContent></Card>
            )}
            {tab === "scan" && (
              <Card><CardContent className="p-3"><ScanReportIngest /></CardContent></Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
