/** Fixed color strings for canvas and MapLibre, which cannot read CSS variables. */
export const MAP_UI = {
  primary: "#245a81",
  border: "#aab4bd",
  muted: "#53636f",
  surface: "#ffffff",
  draft: "#805b00",
  selected: "#245a81",
} as const;

/** Source categories are also named in the map legend and source list. */
export const MAP_SECTOR_COLORS: Record<string, string> = {
  "forestry-and-land-use": "#2c684f",
  agriculture: "#9b6a21",
  transportation: "#245a81",
  buildings: "#695483",
  waste: "#87505b",
  power: "#a13f35",
  manufacturing: "#416c77",
  "fossil-fuel-operations": "#53636f",
  "mineral-extraction": "#8f4e32",
  "fluorinated-gases": "#755e79",
};

export const MAP_SECTOR_FALLBACK = "#53636f";
