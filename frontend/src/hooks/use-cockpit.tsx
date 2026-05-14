// Cockpit-scope state via React context.
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Strategy } from "@/data/indicator-registry";

interface CockpitState {
  strategies: Strategy[];
  atms_only: boolean;
  verified_only: boolean;
  geography: "National" | "District";
  district: string;
  toggleStrategy: (s: Strategy) => void;
  setATMS: (v: boolean) => void;
  setVerified: (v: boolean) => void;
  setGeography: (g: "National" | "District") => void;
  setDistrict: (d: string) => void;
}

const Ctx = createContext<CockpitState | null>(null);

export function CockpitProvider({ children }: { children: ReactNode }) {
  const [strategies, setStrategies] = useState<Strategy[]>(["NDPIV", "TENFOLD", "NDC"]);
  const [atms_only, setATMS] = useState(false);
  const [verified_only, setVerified] = useState(false);
  const [geography, setGeography] = useState<"National" | "District">("National");
  const [district, setDistrict] = useState("");

  const toggleStrategy = (s: Strategy) =>
    setStrategies(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  return (
    <Ctx.Provider value={{ strategies, atms_only, verified_only, geography, district, toggleStrategy, setATMS, setVerified, setGeography, setDistrict }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCockpit(): CockpitState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCockpit must be used inside CockpitProvider");
  return v;
}
