import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAppState, AppStateContext } from "@/hooks/use-app-state";
import { CockpitProvider } from "@/hooks/use-cockpit";
import NotFound from "./pages/NotFound.tsx";

// Primary cockpit
import ExecutiveOverview from "./pages/ExecutiveOverview.tsx";
import DeliveryAccountability from "./pages/DeliveryAccountability.tsx";
import EvidenceMRV from "./pages/EvidenceMRV.tsx";
import FinanceInvestment from "./pages/FinanceInvestment.tsx";
import DataIngestion from "./pages/DataIngestion.tsx";

// Advanced (legacy) — kept under /advanced sub-IA
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
import Indicators from "./pages/Indicators.tsx";
import Interlinkages from "./pages/Interlinkages.tsx";
import CausalChains from "./pages/CausalChains.tsx";
import ProjectCheck from "./pages/ProjectCheck.tsx";

const queryClient = new QueryClient();

function AppLayout() {
  const state = useAppState();
  return (
    <AppStateContext.Provider value={state}>
      <CockpitProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center border-b border-border bg-card px-2 h-8">
                <SidebarTrigger />
              </div>
              <main className="flex-1 overflow-hidden">
                <Routes>
                  {/* Cockpit */}
                  <Route path="/" element={<ExecutiveOverview />} />
                  <Route path="/delivery" element={<DeliveryAccountability />} />
                  <Route path="/evidence" element={<EvidenceMRV />} />
                  <Route path="/finance" element={<FinanceInvestment />} />
                  <Route path="/ingest" element={<DataIngestion />} />

                  {/* Advanced (legacy) */}
                  <Route path="/legacy-overview" element={<Overview />} />
                  <Route path="/ndc" element={<NDCLayer />} />
                  <Route path="/indicators" element={<Indicators />} />
                  <Route path="/interlinkages" element={<Interlinkages />} />
                  <Route path="/causal-chains" element={<CausalChains />} />
                  <Route path="/project-check" element={<ProjectCheck />} />
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
      </CockpitProvider>
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
