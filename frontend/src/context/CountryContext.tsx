import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  COUNTRY_OPTIONS,
  getCountryByCode,
  type CountryCode,
  type CountryOption,
} from "@/data/countries";

const STORAGE_KEY = "ndc-selected-country";

type CountryContextValue = {
  country: CountryOption | null;
  selectCountry: (code: CountryCode) => void;
  clearCountry: () => void;
};

const CountryContext = createContext<CountryContextValue | null>(null);

function readStoredCountry(): CountryOption | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const option = getCountryByCode(raw);
    return option?.available ? option : null;
  } catch {
    return null;
  }
}

export function CountryProvider({ children }: { children: ReactNode }) {
  const [country, setCountry] = useState<CountryOption | null>(readStoredCountry);

  const selectCountry = useCallback((code: CountryCode) => {
    const option = COUNTRY_OPTIONS.find((c) => c.code === code && c.available);
    if (!option) return;
    sessionStorage.setItem(STORAGE_KEY, code);
    setCountry(option);
  }, []);

  const clearCountry = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setCountry(null);
  }, []);

  const value = useMemo(
    () => ({ country, selectCountry, clearCountry }),
    [country, selectCountry, clearCountry],
  );

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) {
    throw new Error("useCountry must be used within CountryProvider");
  }
  return ctx;
}
