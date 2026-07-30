/**
 * Blocks screens until a country is chosen.
 *
 * Redirects to the country picker if none has been selected, so no screen can
 * render without knowing whose data it is meant to show.
 */
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useCountry } from "@/context/CountryContext";

export function CountryGate({ children }: { children: ReactNode }) {
  const { country } = useCountry();
  const location = useLocation();

  if (!country) {
    return <Navigate to="/select-country" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
