// Cockpit-scope state, separate from the legacy AppState used by Advanced pages.
import { create } from "zustand";
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

export const useCockpit = create<CockpitState>((set) => ({
  strategies: ["NDPIV", "TENFOLD", "NDC"],
  atms_only: false,
  verified_only: false,
  geography: "National",
  district: "",
  toggleStrategy: (s) => set(state => ({
    strategies: state.strategies.includes(s) ? state.strategies.filter(x => x !== s) : [...state.strategies, s],
  })),
  setATMS: (v) => set({ atms_only: v }),
  setVerified: (v) => set({ verified_only: v }),
  setGeography: (g) => set({ geography: g }),
  setDistrict: (d) => set({ district: d }),
}));
