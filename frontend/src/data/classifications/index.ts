import ipcc2006 from "./ipcc-2006.tsv?raw";
import ipcc2019 from "./ipcc-2019.tsv?raw";

export interface SectorNode {
  code: string;
  label: string;
  children: SectorNode[];
}

export interface ClassificationFramework {
  id: string;
  name: string;
  description: string;
  unavailableReason?: string;
  hierarchy: SectorNode[];
  version?: string;
  source?: { title: string; url: string; pages: string };
}

/** Three reporting levels, transcribed from Table 8.2. Dots separate code segments. */
export function parseHierarchy(tsv: string): SectorNode[] {
  const roots: SectorNode[] = [];
  const byCode = new Map<string, SectorNode>();
  for (const line of tsv.trim().split("\n")) {
    if (!line.trim()) continue;
    const [code, label] = line.split("\t");
    if (!/^[1-5](\.[A-H](\.\d+)?)?$/.test(code) || !label || byCode.has(code)) {
      throw new Error("Invalid classification definition");
    }
    const node: SectorNode = { code, label, children: [] };
    const parentCode = code.split(".").slice(0, -1).join(".");
    if (parentCode) {
      const parent = byCode.get(parentCode);
      if (!parent) throw new Error(`Missing parent: ${parentCode}`);
      parent.children.push(node);
    } else roots.push(node);
    byCode.set(code, node);
  }
  return roots;
}

export const CLASSIFICATION_FRAMEWORKS: ClassificationFramework[] = [
  {
    id: "ipcc-2006", name: "IPCC 2006",
    description: "For national greenhouse gas inventories.",
    hierarchy: parseHierarchy(ipcc2006), version: "2006-table8.2-level3-v1",
    source: {
      title: "2006 IPCC Guidelines · Volume 1, Chapter 8, Table 8.2",
      url: "https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/1_Volume1/V1_8_Ch8_Reporting_Guidance.pdf",
      pages: "8.10–8.33 (June 2010 corrected chapter)",
    },
  },
  {
    id: "ipcc-2019", name: "IPCC 2006 + 2019 Refinement",
    description: "Includes categories updated in 2019.",
    hierarchy: parseHierarchy(ipcc2019), version: "2019-table8.2-level3-v1",
    source: {
      title: "2019 Refinement · Volume 1, Chapter 8, Table 8.2 (Updated)",
      url: "https://www.ipcc-nggip.iges.or.jp/public/2019rf/pdf/1_Volume1/19R_V1_Ch08_Reporting_Guidance.pdf",
      pages: "Table 8.2 (Updated)",
    },
  },
  {
    id: "ipcc-1996", name: "IPCC 1996 (Revised)",
    description: "For inventories using the older guidelines.",
    unavailableReason: "The 1996 reporting hierarchy has not been loaded.", hierarchy: [],
  },
  {
    id: "crt", name: "CRT – Common Reporting Tables",
    description: "For reporting under the Enhanced Transparency Framework.",
    unavailableReason: "A verified CRT hierarchy and code mapping have not been loaded.", hierarchy: [],
  },
  {
    id: "gpc", name: "GPC – subnational",
    description: "For city and other subnational inventories.",
    unavailableReason: "A verified GPC hierarchy and code mapping have not been loaded.", hierarchy: [],
  },
];

export const DEFAULT_FRAMEWORK = CLASSIFICATION_FRAMEWORKS[0];
export function getFramework(id: string) {
  return CLASSIFICATION_FRAMEWORKS.find((framework) => framework.id === id);
}
