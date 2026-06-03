import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmissionsDataProvider } from "@/context/EmissionsDataContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAppState, AppStateContext } from "@/hooks/use-app-state";
import { CockpitProvider } from "@/hooks/use-cockpit";
import { CurrentRoleProvider } from "@/hooks/use-current-role";
import { AuthGate } from "@/components/AuthGate";
import { CountryGate } from "@/components/CountryGate";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { CountryProvider, useCountry } from "@/context/CountryContext";
import NotFound from "./pages/NotFound.tsx";
import CountrySelect from "./pages/CountrySelect.tsx";

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
import Ai2030Prediction from "./pages/Ai2030Prediction.tsx";
import ClimateFinance from "./pages/ClimateFinance.tsx";
import PolicyDocuments from "./pages/PolicyDocuments.tsx";
import Documentation from "./pages/Documentation.tsx";
import MapExplorer from "./pages/MapExplorer.tsx";
import Home from "./pages/Home.tsx";
import InvestmentTemplates from "./pages/InvestmentTemplates.tsx";
import ExportsAPI from "./pages/ExportsAPI.tsx";
import Admin from "./pages/Admin.tsx";
import Indicators from "./pages/Indicators.tsx";
import Interlinkages from "./pages/Interlinkages.tsx";
import CausalChains from "./pages/CausalChains.tsx";
import ProjectCheck from "./pages/ProjectCheck.tsx";

const queryClient = new QueryClient();

function ShellHeader() {
  const { country, clearCountry } = useCountry();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-2 h-10 gap-2">
      <SidebarTrigger />
      <div className="flex items-center gap-2 min-w-0">
        {country && (
          <span className="hidden sm:inline text-xs text-muted-foreground truncate">
            {country.flag} {country.name}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 shrink-0"
          onClick={() => {
            clearCountry();
            navigate("/select-country");
          }}
        >
          <Globe2 className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Change country</span>
        </Button>
        <RoleSwitcher />
      </div>
    </div>
  );
}

function ProtectedShell() {
  const state = useAppState();
  return (
    <AppStateContext.Provider value={state}>
      <EmissionsDataProvider>
      <CockpitProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <ShellHeader />
              <main className="flex-1 min-h-0 overflow-hidden">
                <Routes>
                  {/* Main */}
                  <Route path="/" element={<Home />} />
                  <Route path="/dashboard" element={<NDCLayer />} />
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
                  <Route path="/ai-2030" element={<Ai2030Prediction />} />
                  <Route path="/climate-finance" element={<ClimateFinance />} />
                  <Route path="/documents" element={<PolicyDocuments />} />
                  <Route path="/map" element={<MapExplorer />} />
                  <Route path="/docs" element={<Documentation />} />

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
      </EmissionsDataProvider>
    </AppStateContext.Provider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CountryProvider>
        <BrowserRouter>
          <CurrentRoleProvider>
            <Routes>
              <Route
                path="/select-country"
                element={
                  <AuthGate>
                    <CountrySelect />
                  </AuthGate>
                }
              />
              <Route
                path="/*"
                element={
                  <AuthGate>
                    <CountryGate>
                      <ProtectedShell />
                    </CountryGate>
                  </AuthGate>
                }
              />
            </Routes>
          </CurrentRoleProvider>
        </BrowserRouter>
      </CountryProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
