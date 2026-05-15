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
