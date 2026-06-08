/** Demo presentation mode — activated via ?demo=1 on any route. */

export const DEMO_MODE_KEY = "uganda-ndc-demo-mode";

export const DEMO_POLICY_QUESTIONS = [
  "Where are we today — in terms of emissions, actions, and progress?",
  "Which sectors and policies have the highest impact potential?",
  "What is the expected impact of a specific policy or investment?",
  "Are we on track — and where are the gaps?",
  "What should we prioritise next?",
] as const;

export interface DemoStep {
  time: string;
  route: string;
  label: string;
  script: string;
}

/** Curated 3-minute click path (bookmark: /dashboard?demo=1&sector=transport). */
export const DEMO_CLICK_PATH: DemoStep[] = [
  {
    time: "0:00",
    route: "/dashboard?sector=transport",
    label: "Opening — national cockpit",
    script:
      "What does it take to make an NDC usable for day-to-day decision-making? Today this still requires weeks of manually assembling fragmented data.",
  },
  {
    time: "0:50",
    route: "/dashboard?sector=transport",
    label: "Five policy questions",
    script:
      "Across ministries we heard the same operational questions — emissions, impact, scenarios, gaps, priorities.",
  },
  {
    time: "1:20",
    route: "/dashboard?sector=transport",
    label: "Screen 1 — emissions & progress",
    script:
      "Here we move from static reporting to a live, integrated view of emissions and sector performance — NDC pledges reconciled against observed data.",
  },
  {
    time: "1:45",
    route: "/documents?tab=pathway&demo=1",
    label: "Screen 2 — intervention pathway",
    script:
      "The system connects emissions data with policy and sector-level information, identifying where interventions can have the greatest impact.",
  },
  {
    time: "2:00",
    route: "/climate-finance?demo=1",
    label: "Screen 3 — compare options",
    script:
      "Policymakers can compare options — not in abstract terms, but in expected outcomes and trade-offs.",
  },
  {
    time: "2:10",
    route: "/dashboard?sector=transport&demo=1",
    label: "Punchline — return to dashboard",
    script:
      "From data to insight. From reporting to decision support. From static NDCs to operational systems for implementation.",
  },
];

export function isDemoModeFromSearch(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get("demo") === "1";
}

export function isDemoModeActive(): boolean {
  if (typeof window === "undefined") return false;
  if (isDemoModeFromSearch(window.location.search)) return true;
  return sessionStorage.getItem(DEMO_MODE_KEY) === "1";
}

export function enableDemoMode(): void {
  sessionStorage.setItem(DEMO_MODE_KEY, "1");
}

export function disableDemoMode(): void {
  sessionStorage.removeItem(DEMO_MODE_KEY);
}

export function withDemoParam(path: string): string {
  if (path.includes("demo=1")) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}demo=1`;
}
