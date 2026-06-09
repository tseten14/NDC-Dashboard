import { lazy, Suspense, type ReactNode } from "react";
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
import { RoleContextStrip } from "@/components/RoleContextStrip";
import { CountryProvider, useCountry } from "@/context/CountryContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound.tsx";
import CountrySelect from "./pages/CountrySelect.tsx";

import ActivityForm from "./pages/ActivityForm.tsx";
import ActivityDetail from "./pages/ActivityDetail.tsx";
import NDCLayer from "./pages/NDCLayer.tsx";
import Ai2030Prediction from "./pages/Ai2030Prediction.tsx";
import ClimateFinance from "./pages/ClimateFinance.tsx";
import PolicyDocuments from "./pages/PolicyDocuments.tsx";
import Documentation from "./pages/Documentation.tsx";
import Home from "./pages/Home.tsx";
import PolicyImpact from "./pages/PolicyImpact.tsx";

const MapExplorer = lazy(() => import("./pages/MapExplorer.tsx"));
const DataIngestion = lazy(() => import("./pages/DataIngestion.tsx"));
const MyWork = lazy(() => import("./pages/MyWork.tsx"));
const StrategyLibrary = lazy(() => import("./pages/StrategyLibrary.tsx"));
const ExecutiveOverview = lazy(() => import("./pages/ExecutiveOverview.tsx"));
const DeliveryAccountability = lazy(() => import("./pages/DeliveryAccountability.tsx"));
const EvidenceMRV = lazy(() => import("./pages/EvidenceMRV.tsx"));
const FinanceInvestment = lazy(() => import("./pages/FinanceInvestment.tsx"));
const RiskLayout = lazy(() => import("./pages/risk/RiskLayout.tsx"));
const RiskOverview = lazy(() => import("./pages/risk/RiskOverview.tsx"));
const RiskMap = lazy(() => import("./pages/risk/RiskMap.tsx"));
const RiskScreening = lazy(() => import("./pages/risk/RiskScreening.tsx"));
const RiskDrilldown = lazy(() => import("./pages/risk/RiskDrilldown.tsx"));
const Overview = lazy(() => import("./pages/Overview.tsx"));
const TenfoldLayer = lazy(() => import("./pages/TenfoldLayer.tsx"));
const NDPIVLayer = lazy(() => import("./pages/NDPIVLayer.tsx"));
const Vision2040 = lazy(() => import("./pages/Vision2040.tsx"));
const AFOLUmrv = lazy(() => import("./pages/AFOLUmrv.tsx"));
const KPIsProxies = lazy(() => import("./pages/KPIsProxies.tsx"));
const OwnershipFocals = lazy(() => import("./pages/OwnershipFocals.tsx"));
const Projections = lazy(() => import("./pages/Projections.tsx"));
const InvestmentTemplates = lazy(() => import("./pages/InvestmentTemplates.tsx"));
const ExportsAPI = lazy(() => import("./pages/ExportsAPI.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Indicators = lazy(() => import("./pages/Indicators.tsx"));
const Interlinkages = lazy(() => import("./pages/Interlinkages.tsx"));
const CausalChains = lazy(() => import("./pages/CausalChains.tsx"));
const ProjectCheck = lazy(() => import("./pages/ProjectCheck.tsx"));
const FinancialFlow = lazy(() => import("./pages/FinancialFlow.tsx"));
const CostEffectiveness = lazy(() => import("./pages/CostEffectiveness.tsx"));
const InstitutionalMap = lazy(() => import("./pages/InstitutionalMap.tsx"));
import { DemoModeProvider } from "@/hooks/use-demo-mode";
import { DemoModePanel, DemoModeToggle, DemoPresenterController } from "@/components/DemoModePanel";
import { useDemoMode } from "@/hooks/use-demo-mode";

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="flex h-full min-h-[12rem] items-center justify-center p-6 text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function ShellHeader() {
  const { country, clearCountry } = useCountry();
  const navigate = useNavigate();
  const { presenterMode } = useDemoMode();

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-2 h-10 gap-2">
      {!presenterMode && <SidebarTrigger />}
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
        <DemoModeToggle />
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
          <DemoPresenterController />
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <ShellHeader />
              <RoleContextStrip />
              <main className="flex-1 min-h-0 overflow-hidden relative">
                <DemoModePanel />
                <ErrorBoundary label="Page">
                <Routes>
                  {/* Main */}
                  <Route path="/" element={<Home />} />
                  <Route path="/dashboard" element={<NDCLayer />} />
                  <Route path="/library" element={<LazyPage><StrategyLibrary /></LazyPage>} />
                  <Route path="/my-work" element={<LazyPage><MyWork /></LazyPage>} />
                  <Route path="/activities/new" element={<ActivityForm />} />
                  <Route path="/activities/:id/edit" element={<ActivityForm />} />
                  <Route path="/activities/:id" element={<ActivityDetail />} />

                  {/* Cockpit / Advanced */}
                  <Route path="/executive" element={<LazyPage><ExecutiveOverview /></LazyPage>} />
                  <Route path="/delivery" element={<LazyPage><DeliveryAccountability /></LazyPage>} />
                  <Route path="/evidence" element={<LazyPage><EvidenceMRV /></LazyPage>} />
                  <Route path="/finance" element={<LazyPage><FinanceInvestment /></LazyPage>} />
                  <Route path="/ingest" element={<LazyPage><DataIngestion /></LazyPage>} />
                  <Route path="/ai-2030" element={<Ai2030Prediction />} />
                  <Route path="/climate-finance" element={<ClimateFinance />} />
                  <Route path="/documents" element={<PolicyDocuments />} />
                  <Route path="/policy-impact" element={<PolicyImpact />} />
                  <Route path="/map" element={<LazyPage><MapExplorer /></LazyPage>} />
                  <Route path="/docs" element={<Documentation />} />

                  {/* Climate Risk & Vulnerability */}
                  <Route path="/risk" element={<LazyPage><RiskLayout /></LazyPage>}>
                    <Route index element={<LazyPage><RiskOverview /></LazyPage>} />
                    <Route path="map" element={<LazyPage><RiskMap /></LazyPage>} />
                    <Route path="screening" element={<LazyPage><RiskScreening /></LazyPage>} />
                    <Route path="drilldown" element={<LazyPage><RiskDrilldown /></LazyPage>} />
                  </Route>

                  <Route path="/legacy-overview" element={<LazyPage><Overview /></LazyPage>} />
                  <Route path="/ndc" element={<NDCLayer />} />
                  <Route path="/indicators" element={<LazyPage><Indicators /></LazyPage>} />
                  <Route path="/interlinkages" element={<LazyPage><Interlinkages /></LazyPage>} />
                  <Route path="/causal-chains" element={<LazyPage><CausalChains /></LazyPage>} />
                  <Route path="/project-check" element={<LazyPage><ProjectCheck /></LazyPage>} />
                  <Route path="/tenfold" element={<LazyPage><TenfoldLayer /></LazyPage>} />
                  <Route path="/ndp-iv" element={<LazyPage><NDPIVLayer /></LazyPage>} />
                  <Route path="/vision-2040" element={<LazyPage><Vision2040 /></LazyPage>} />
                  <Route path="/afolu-mrv" element={<LazyPage><AFOLUmrv /></LazyPage>} />
                  <Route path="/kpis" element={<LazyPage><KPIsProxies /></LazyPage>} />
                  <Route path="/ownership" element={<LazyPage><OwnershipFocals /></LazyPage>} />
                  <Route path="/projections" element={<LazyPage><Projections /></LazyPage>} />
                  <Route path="/investment" element={<LazyPage><InvestmentTemplates /></LazyPage>} />
                  <Route path="/exports" element={<LazyPage><ExportsAPI /></LazyPage>} />
                  <Route path="/admin" element={<LazyPage><Admin /></LazyPage>} />
                  <Route path="/financial-flow" element={<LazyPage><FinancialFlow /></LazyPage>} />
                  <Route path="/cost-effectiveness" element={<LazyPage><CostEffectiveness /></LazyPage>} />
                  <Route path="/institutional-map" element={<LazyPage><InstitutionalMap /></LazyPage>} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
                </ErrorBoundary>
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
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <CountryProvider>
          <BrowserRouter>
            <CurrentRoleProvider>
              <DemoModeProvider>
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
              </DemoModeProvider>
            </CurrentRoleProvider>
          </BrowserRouter>
        </CountryProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
