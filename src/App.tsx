import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopContextBar } from "@/components/TopContextBar";
import { useAppState, AppStateContext } from "@/hooks/use-app-state";
import NotFound from "./pages/NotFound.tsx";
import Overview from "./pages/Overview.tsx";
import NDCLayer from "./pages/NDCLayer.tsx";
import TenfoldLayer from "./pages/TenfoldLayer.tsx";
import NDPIVLayer from "./pages/NDPIVLayer.tsx";
import Vision2040 from "./pages/Vision2040.tsx";
import AFOLUmrv from "./pages/AFOLUmrv.tsx";
import KPIsProxies from "./pages/KPIsProxies.tsx";
import OwnershipFocals from "./pages/OwnershipFocals.tsx";
import Projections from "./pages/Projections.tsx";
import InvestmentTemplates from "./pages/InvestmentTemplates.tsx";
import ExportsAPI from "./pages/ExportsAPI.tsx";
import Admin from "./pages/Admin.tsx";

const queryClient = new QueryClient();

function AppLayout() {
  const state = useAppState();
  return (
    <AppStateContext.Provider value={state}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center border-b border-border bg-card px-2 h-8">
              <SidebarTrigger />
            </div>
            <TopContextBar />
            <main className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/ndc" element={<NDCLayer />} />
                <Route path="/tenfold" element={<TenfoldLayer />} />
                <Route path="/ndp-iv" element={<NDPIVLayer />} />
                <Route path="/vision-2040" element={<Vision2040 />} />
                <Route path="/afolu-mrv" element={<AFOLUmrv />} />
                <Route path="/kpis" element={<KPIsProxies />} />
                <Route path="/ownership" element={<OwnershipFocals />} />
                <Route path="/projections" element={<Projections />} />
                <Route path="/investment" element={<InvestmentTemplates />} />
                <Route path="/exports" element={<ExportsAPI />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AppStateContext.Provider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
