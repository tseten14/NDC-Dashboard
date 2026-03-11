import { useState, useCallback } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { OverviewPanel } from "@/components/OverviewPanel";
import { SectorDetail } from "@/components/SectorDetail";
import { sectors } from "@/data/climate-data";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { exportToExcel, exportToPDF } from "@/lib/export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [dataView, setDataView] = useState<"historical" | "projected" | "both">("both");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sector = selectedSector ? sectors.find((s) => s.id === selectedSector) : null;

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    toast.info("Fetching latest data from sector APIs...");
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Dashboard data refreshed successfully");
    }, 1500);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar selectedSector={selectedSector} onSelectSector={setSelectedSector} />

      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              {sector ? sector.name : "National NDC Overview"}
            </h2>
            {sector && (
              <Select value={dataView} onValueChange={(v) => setDataView(v as any)}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="historical">Historical Data</SelectItem>
                  <SelectItem value="projected">Projected Data</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { exportToExcel(); toast.success("Excel file exported"); }}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { exportToPDF(); toast.success("PDF exported"); }}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export Key Stats (PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {sector ? (
            <SectorDetail sector={sector} dataView={dataView} />
          ) : (
            <OverviewPanel />
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
