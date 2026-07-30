/**
 * The application shell.
 *
 * Wires the whole front end together: the list of screens and the web address
 * each one answers to, and the shared providers every screen sits inside —
 * the selected country, the current role, the emissions data, and the error
 * boundary that catches crashes.
 *
 * Most screens are loaded only when first visited, which keeps the initial page
 * load small.
 */
import { Suspense, type ReactNode } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazy-with-retry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { EmissionsDataProvider } from "@/context/EmissionsDataContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopNav } from "@/components/TopNav";
import { Footer } from "@/components/Footer";
import { AmbientBackground } from "@/components/AmbientBackground";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { useAppState, AppStateContext } from "@/hooks/use-app-state";
import { CockpitProvider } from "@/hooks/use-cockpit";
import { CurrentRoleProvider } from "@/hooks/use-current-role";
import { AuthGate } from "@/components/AuthGate";
import { CountryGate } from "@/components/CountryGate";
import { CountryProvider } from "@/context/CountryContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "./pages/NotFound.tsx";
import CountrySelect from "./pages/CountrySelect.tsx";

import ActivityForm from "./pages/ActivityForm.tsx";
import ActivityDetail from "./pages/ActivityDetail.tsx";
import Home from "./pages/Home.tsx";

// Dashboard pulls in recharts + chart components; lazy-load so the landing
// page bundle stays small and first paint is fast.
const NDCLayer = lazy(() => import("./pages/NDCLayer.tsx"));

// Heavy secondary pages (recharts / mermaid / large data) are code-split so
// they don't bloat the initial bundle and delay first paint + hydration.
const Ai2030Prediction = lazy(() => import("./pages/Ai2030Prediction.tsx"));
const ClimateFinance = lazy(() => import("./pages/ClimateFinance.tsx"));
const PolicyDocuments = lazy(() => import("./pages/PolicyDocuments.tsx"));
const Documentation = lazy(() => import("./pages/Documentation.tsx"));
const PolicyImpact = lazy(() => import("./pages/PolicyImpact.tsx"));
const PolicyDocumentView = lazy(() => import("./pages/PolicyDocumentView.tsx"));

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

function ProtectedShell() {
  const state = useAppState();
  const location = useLocation();
  return (
    <AppStateContext.Provider value={state}>
      <EmissionsDataProvider>
      <CockpitProvider>
          <div className="h-dvh flex flex-col w-full relative">
            <AmbientBackground />
            <TopNav />
            <main className="flex-1 min-h-0 overflow-hidden relative z-10">
                <ErrorBoundary label="Page">
                {/* Keyed wrapper remounts page content on route change.
                    No crossfade here: fading heavy pages (e.g. the GL map) on
                    every navigation caused a visible flash/flicker. */}
                <div key={location.pathname} className="h-full">
                <Routes>
                  {/* Main */}
                  <Route path="/" element={<Home />} />
                  <Route path="/dashboard" element={<LazyPage><NDCLayer /></LazyPage>} />
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
                  <Route path="/ai-2030" element={<LazyPage><Ai2030Prediction /></LazyPage>} />
                  <Route path="/climate-finance" element={<LazyPage><ClimateFinance /></LazyPage>} />
                  <Route path="/documents" element={<LazyPage><PolicyDocuments /></LazyPage>} />
                  <Route path="/documents/view" element={<LazyPage><PolicyDocumentView /></LazyPage>} />
                  <Route path="/policy-impact" element={<LazyPage><PolicyImpact /></LazyPage>} />
                  <Route path="/map" element={<LazyPage><MapExplorer /></LazyPage>} />
                  <Route path="/docs" element={<LazyPage><Documentation /></LazyPage>} />

                  {/* Climate Risk & Vulnerability */}
                  <Route path="/risk" element={<LazyPage><RiskLayout /></LazyPage>}>
                    <Route index element={<LazyPage><RiskOverview /></LazyPage>} />
                    <Route path="map" element={<LazyPage><RiskMap /></LazyPage>} />
                    <Route path="screening" element={<LazyPage><RiskScreening /></LazyPage>} />
                    <Route path="drilldown" element={<LazyPage><RiskDrilldown /></LazyPage>} />
                  </Route>

                  <Route path="/legacy-overview" element={<LazyPage><Overview /></LazyPage>} />
                  <Route path="/ndc" element={<LazyPage><NDCLayer /></LazyPage>} />
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
                </div>
                </ErrorBoundary>
              </main>
            <ScrollToTopButton />
            <Footer />
          </div>
      </CockpitProvider>
      </EmissionsDataProvider>
    </AppStateContext.Provider>
  );
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
