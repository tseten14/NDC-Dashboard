import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DEMO_MODE_KEY,
  enableDemoMode,
  disableDemoMode,
  isDemoModeFromSearch,
  withDemoParam,
} from "@/lib/demo-mode";
import { useCurrentRole } from "@/hooks/use-current-role";

interface DemoModeCtx {
  active: boolean;
  setActive: (on: boolean) => void;
  navigateWithDemo: (path: string) => void;
}

const Ctx = createContext<DemoModeCtx | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setActiveRole, activeRole } = useCurrentRole();
  const [active, setActiveState] = useState(() => isDemoModeFromSearch(location.search));

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
        const params = new URLSearchParams(location.search);
        params.delete("demo");
        const q = params.toString();
        navigate(q ? `${location.pathname}?${q}` : location.pathname, { replace: true });
      }
    },
    [location.pathname, location.search, navigate, setActiveRole],
  );

  const navigateWithDemo = useCallback(
    (path: string) => {
      navigate(active ? withDemoParam(path) : path);
    },
    [active, navigate],
  );

  const value = useMemo(
    () => ({ active, setActive, navigateWithDemo }),
    [active, setActive, navigateWithDemo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemoMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemoMode must be inside DemoModeProvider");
  return ctx;
}
