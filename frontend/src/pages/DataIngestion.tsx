// Data Ingestion — three modes: Files, GIS, Connections (client-side).
import { useState } from "react";
import { CockpitBar } from "@/components/CockpitBar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload } from "lucide-react";
import { FilesIngest } from "@/components/ingest/FilesIngest";
import { GisIngest } from "@/components/ingest/GisIngest";
import { ConnectionsIngest } from "@/components/ingest/ConnectionsIngest";

export default function DataIngestion() {
  const [tab, setTab] = useState("files");
  return (
    <div className="flex flex-col h-full">
      <CockpitBar />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-7xl">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2"><Upload className="h-4 w-4" /> Data Ingestion</h1>
            <p className="text-xs text-muted-foreground">Upload files, GIS layers or connect external sources. All imports are staged as Draft → Publish, with audit trail and import logs.</p>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-8">
              <TabsTrigger value="files" className="text-[11px]">Upload files</TabsTrigger>
              <TabsTrigger value="gis" className="text-[11px]">Upload GIS</TabsTrigger>
              <TabsTrigger value="conn" className="text-[11px]">Connect data sources</TabsTrigger>
            </TabsList>
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
      </ScrollArea>
    </div>
  );
}
