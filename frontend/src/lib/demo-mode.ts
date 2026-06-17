/** Demo presentation mode — activated via ?demo=1 on any route. */

export const DEMO_MODE_KEY = "uganda-ndc-demo-mode";
export const DEMO_PRESENTER_BODY_CLASS = "demo-presenter-mode";
export const DEMO_DURATION_SECONDS = 180;

/** Bookmark / one-click start URL for live presentations. */
export const DEMO_START_PATH = "/dashboard?demo=1&sector=transport";

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
    route: "/documents?tab=pathway",
    label: "Screen 2 — intervention pathway",
    script:
      "The system connects emissions data with policy and sector-level information, identifying where interventions can have the greatest impact.",
  },
  {
    time: "2:00",
    route: "/climate-finance",
    label: "Screen 3 — compare options",
    script:
      "Policymakers can compare options — not in abstract terms, but in expected outcomes and trade-offs.",
  },
  {
    time: "2:10",
    route: "/dashboard?sector=transport",
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

function routeKey(pathname: string, search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("demo");
  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
}

/** Index of the best-matching demo step for the current location, or -1. */
export function matchDemoStep(pathname: string, search: string): number {
  const current = routeKey(pathname, search);
  let bestIdx = -1;
  let bestScore = -1;

  DEMO_CLICK_PATH.forEach((step, idx) => {
    const [stepPath, stepQuery = ""] = step.route.split("?");
    if (stepPath !== pathname) return;

    const stepKey = routeKey(stepPath, stepQuery ? `?${stepQuery}` : "");
    if (current === stepKey) {
      bestIdx = idx;
      bestScore = 1000;
      return;
    }

    if (!stepQuery) {
      const score = pathname === stepPath ? 1 : 0;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
      return;
    }

    const stepParams = new URLSearchParams(stepQuery);
    const currentParams = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    let matched = 0;
    stepParams.forEach((value, key) => {
      if (currentParams.get(key) === value) matched += 1;
    });
    if (matched > bestScore) {
      bestScore = matched;
      bestIdx = idx;
    }
  });

  return bestIdx;
}

export function applyPresenterBodyClass(on: boolean): void {
  if (typeof document === "undefined") return;
  document.body.classList.toggle(DEMO_PRESENTER_BODY_CLASS, on);
}

export function isFullscreenSupported(): boolean {
  return typeof document !== "undefined" && document.documentElement.requestFullscreen != null;
}

export function isFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.fullscreenElement;
}

export async function enterFullscreen(): Promise<boolean> {
  if (!isFullscreenSupported() || isFullscreen()) return isFullscreen();
  try {
    await document.documentElement.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen(): Promise<void> {
  if (!isFullscreen()) return;
  try {
    await document.exitFullscreen();
  } catch {
    /* ignore */
  }
}

export async function toggleFullscreen(): Promise<boolean> {
  if (isFullscreen()) {
    await exitFullscreen();
    return false;
  }
  return enterFullscreen();
}

export function getFullscreenHint(): string {
  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
  if (isFullscreenSupported()) {
    return isMac
      ? "Click to enter fullscreen, or press ⌃⌘F in most browsers."
      : "Click to enter fullscreen, or press F11 in most browsers.";
  }
  return isMac
    ? "Press ⌃⌘F or choose View → Enter Full Screen in your browser."
    : "Press F11 or choose View → Full screen in your browser.";
}
