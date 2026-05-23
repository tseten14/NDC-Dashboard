// Data Ingestion — three modes: Files, GIS, Connections (client-side).
import { useState } from "react";
import { CockpitBar } from "@/components/CockpitBar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload } from "lucide-react";
import { FilesIngest } from "@/components/ingest/FilesIngest";
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
            <p className="text-xs text-muted-foreground">Auto-scan files for instant profiling and NDC keyword reporting, or stage structured imports via the Files / GIS / Connections wizards.</p>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-8">
              <TabsTrigger value="scan" className="text-[11px]">Auto-scan &amp; report</TabsTrigger>
              <TabsTrigger value="files" className="text-[11px]">Structured import</TabsTrigger>
              <TabsTrigger value="gis" className="text-[11px]">Upload GIS</TabsTrigger>
              <TabsTrigger value="conn" className="text-[11px]">Connect data sources</TabsTrigger>
            </TabsList>
            <TabsContent value="scan" className="mt-3">
              <Card><CardContent className="p-3"><ScanReportIngest /></CardContent></Card>
            </TabsContent>
            <TabsContent value="files" className="mt-3">
              <Card><CardContent className="p-3"><FilesIngest /></CardContent></Card>
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
