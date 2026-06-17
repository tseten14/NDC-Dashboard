import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DEMO_MODE_KEY,
  DEMO_START_PATH,
  applyPresenterBodyClass,
  disableDemoMode,
  enableDemoMode,
  isDemoModeFromSearch,
  withDemoParam,
} from "@/lib/demo-mode";
import { useCurrentRole } from "@/hooks/use-current-role";

interface DemoModeCtx {
  active: boolean;
  presenterMode: boolean;
  sidebarPeek: boolean;
  setSidebarPeek: (on: boolean) => void;
  setActive: (on: boolean) => void;
  startDemoPresentation: () => void;
  navigateWithDemo: (path: string) => void;
}

const Ctx = createContext<DemoModeCtx | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setActiveRole, activeRole } = useCurrentRole();
  const [active, setActiveState] = useState(() => isDemoModeFromSearch(location.search));
  const [sidebarPeek, setSidebarPeek] = useState(false);

  const presenterMode = active && !sidebarPeek;

  useEffect(() => {
    const fromUrl = isDemoModeFromSearch(location.search);
    if (fromUrl) {
      enableDemoMode();
      setActiveState(true);
      if (activeRole !== "SeniorDecisionMaker") {
        setActiveRole("SeniorDecisionMaker");
      }
    } else if (sessionStorage.getItem(DEMO_MODE_KEY) === "1") {
      setActiveState(true);
    }
  }, [location.search, activeRole, setActiveRole]);

  useEffect(() => {
    applyPresenterBodyClass(presenterMode);
    return () => applyPresenterBodyClass(false);
  }, [presenterMode]);

  useEffect(() => {
    if (!active) setSidebarPeek(false);
  }, [active]);

  const setActive = useCallback(
    (on: boolean) => {
      if (on) {
        enableDemoMode();
        setActiveState(true);
        setActiveRole("SeniorDecisionMaker");
        if (!isDemoModeFromSearch(location.search)) {
          navigate(withDemoParam(location.pathname + location.search), { replace: true });
        }
      } else {
        disableDemoMode();
        setActiveState(false);
        setSidebarPeek(false);
        const params = new URLSearchParams(location.search);
        params.delete("demo");
        const q = params.toString();
        navigate(q ? `${location.pathname}?${q}` : location.pathname, { replace: true });
      }
    },
    [location.pathname, location.search, navigate, setActiveRole],
  );

  const startDemoPresentation = useCallback(() => {
    enableDemoMode();
    setActiveState(true);
    setSidebarPeek(false);
    setActiveRole("SeniorDecisionMaker");
    navigate(DEMO_START_PATH);
  }, [navigate, setActiveRole]);

  const navigateWithDemo = useCallback(
    (path: string) => {
      navigate(active ? withDemoParam(path) : path);
    },
    [active, navigate],
  );

  const value = useMemo(
    () => ({
      active,
      presenterMode,
      sidebarPeek,
      setSidebarPeek,
      setActive,
      startDemoPresentation,
      navigateWithDemo,
    }),
    [active, presenterMode, sidebarPeek, setActive, startDemoPresentation, navigateWithDemo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemoMode must be inside DemoModeProvider");
  return ctx;
}
