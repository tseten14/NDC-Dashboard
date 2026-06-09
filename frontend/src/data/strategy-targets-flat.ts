// Flat list of all strategy targets across NDC + NDP IV + Tenfold for use in target-link picker.
// Keeps ID conventions stable across the app.

import { ndcTargets } from "./uganda-ndc-data";
import { getTargetPlainLanguage } from "@/lib/target-plain-language";

export interface FlatTarget {
  id: string;
  strategy: "NDC" | "NDPIV" | "Tenfold";
  title: string;
  sector?: string;
}

// NDP IV programmes (representative subset for picker)
const ndpIVTargets: FlatTarget[] = [
  { id: "ndpiv-1", strategy: "NDPIV", title: "Agro-industrialisation: increase value addition in agriculture" },
  { id: "ndpiv-2", strategy: "NDPIV", title: "Mineral-based industrialisation" },
  { id: "ndpiv-3", strategy: "NDPIV", title: "Sustainable energy development" },
  { id: "ndpiv-4", strategy: "NDPIV", title: "Climate change, natural resources & environment management" },
  { id: "ndpiv-5", strategy: "NDPIV", title: "Sustainable urbanisation & housing" },
  { id: "ndpiv-6", strategy: "NDPIV", title: "Integrated transport infrastructure" },
  { id: "ndpiv-7", strategy: "NDPIV", title: "Digital transformation" },
  { id: "ndpiv-8", strategy: "NDPIV", title: "Human capital development" },
];

const tenfoldTargets: FlatTarget[] = [
  { id: "tf-1", strategy: "Tenfold", title: "10x agricultural productivity by 2040" },
  { id: "tf-2", strategy: "Tenfold", title: "10x manufacturing output" },
  { id: "tf-3", strategy: "Tenfold", title: "10x tourism revenue" },
  { id: "tf-4", strategy: "Tenfold", title: "10x mineral & oil/gas value" },
  { id: "tf-5", strategy: "Tenfold", title: "10x ICT & knowledge economy" },
];

export const allFlatTargets: FlatTarget[] = [
  ...ndcTargets.map(t => ({
    id: t.id, strategy: "NDC" as const,
    title: getTargetPlainLanguage(t).summary,
    sector: t.sectorId,
  })),
  ...ndpIVTargets,
  ...tenfoldTargets,
];

export function findTargetById(id: string): FlatTarget | undefined {
  return allFlatTargets.find(t => t.id === id);
}
