import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAppState, AppStateContext } from "@/hooks/use-app-state";
import { CockpitProvider } from "@/hooks/use-cockpit";
import { CurrentRoleProvider } from "@/hooks/use-current-role";
import { AuthGate } from "@/components/AuthGate";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import NotFound from "./pages/NotFound.tsx";

// Auth + new role-based pages
import Auth from "./pages/Auth.tsx";
import MyWork from "./pages/MyWork.tsx";
import ActivityForm from "./pages/ActivityForm.tsx";
import ActivityDetail from "./pages/ActivityDetail.tsx";

// Primary cockpit
import ExecutiveOverview from "./pages/ExecutiveOverview.tsx";
import DeliveryAccountability from "./pages/DeliveryAccountability.tsx";
import EvidenceMRV from "./pages/EvidenceMRV.tsx";
import FinanceInvestment from "./pages/FinanceInvestment.tsx";
import DataIngestion from "./pages/DataIngestion.tsx";
import StrategyLibrary from "./pages/StrategyLibrary.tsx";

// Climate Risk & Vulnerability module
import RiskLayout from "./pages/risk/RiskLayout.tsx";
import RiskOverview from "./pages/risk/RiskOverview.tsx";
import RiskMap from "./pages/risk/RiskMap.tsx";
import RiskScreening from "./pages/risk/RiskScreening.tsx";
import RiskDrilldown from "./pages/risk/RiskDrilldown.tsx";

// Advanced (legacy)
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

function ProtectedShell() {
  const state = useAppState();
  return (
    <AppStateContext.Provider value={state}>
      <CockpitProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between border-b border-border bg-card px-2 h-10">
                <SidebarTrigger />
                <RoleSwitcher />
              </div>
              <main className="flex-1 overflow-hidden">
                <Routes>
                  {/* Main */}
                  <Route path="/" element={<NDCLayer />} />
                  <Route path="/library" element={<StrategyLibrary />} />
                  <Route path="/my-work" element={<MyWork />} />
                  <Route path="/activities/new" element={<ActivityForm />} />
                  <Route path="/activities/:id/edit" element={<ActivityForm />} />
                  <Route path="/activities/:id" element={<ActivityDetail />} />

                  {/* Cockpit / Advanced */}
                  <Route path="/executive" element={<ExecutiveOverview />} />
                  <Route path="/delivery" element={<DeliveryAccountability />} />
                  <Route path="/evidence" element={<EvidenceMRV />} />
                  <Route path="/finance" element={<FinanceInvestment />} />
                  <Route path="/ingest" element={<DataIngestion />} />

                  {/* Climate Risk & Vulnerability */}
                  <Route path="/risk" element={<RiskLayout />}>
                    <Route index element={<RiskOverview />} />
                    <Route path="map" element={<RiskMap />} />
                    <Route path="screening" element={<RiskScreening />} />
                    <Route path="drilldown" element={<RiskDrilldown />} />
                  </Route>

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
        <CurrentRoleProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/*" element={<AuthGate><ProtectedShell /></AuthGate>} />
          </Routes>
        </CurrentRoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
