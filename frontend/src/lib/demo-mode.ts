/** Demo presentation mode — activated via ?demo=1 on any route. */

export const DEMO_MODE_KEY = "uganda-ndc-demo-mode";
export const DEMO_PRESENTER_BODY_CLASS = "demo-presenter-mode";
export const DEMO_DURATION_SECONDS = 300;

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

/** Curated 5-minute click path (bookmark: /dashboard?demo=1&sector=transport). */
export const DEMO_CLICK_PATH: DemoStep[] = [
  {
    time: "0:00",
    route: "/dashboard?sector=transport",
    label: "Opening — national cockpit",
    script:
      "Governments don't lack climate ambition — they lack a live picture of delivery. This cockpit answers that in one workspace.",
  },
  {
    time: "0:25",
    route: "/dashboard?sector=transport",
    label: "Live evidence banner",
    script:
      "Not a static PDF — observed emissions updated from satellite and facility data.",
  },
  {
    time: "0:40",
    route: "/dashboard?sector=transport",
    label: "Five policy questions",
    script:
      "Ministries ask five operational questions: where we are, what moves the needle, policy impact, gaps, and priorities.",
  },
  {
    time: "1:00",
    route: "/dashboard?sector=transport",
    label: "Progress & timeseries",
    script:
      "Transport target, pledges, and progress in one view — targets linked to evidence.",
  },
  {
    time: "1:25",
    route: "/map",
    label: "Emissions map",
    script:
      "Spatial layer — see where emissions come from, down to assets and districts.",
  },
  {
    time: "2:00",
    route: "/documents?tab=pathway",
    label: "Policy pathway",
    script:
      "Policies trace back to NDC outcomes — documents and measures linked to targets.",
  },
  {
    time: "2:25",
    route: "/climate-finance",
    label: "Climate finance",
    script:
      "Compare options by cost, abatement, and trade-offs — not abstract targets.",
  },
  {
    time: "2:55",
    route: "/dashboard?sector=transport",
    label: "NDC AI briefing",
    script:
      "Ask in plain language — 'Are we on track for transport?' — grounded in this country's data.",
  },
  {
    time: "3:35",
    route: "/dashboard?sector=transport",
    label: "Punchline",
    script:
      "From reporting to decision support. From fragmented files to one operational system.",
  },
  {
    time: "4:00",
    route: "/dashboard?sector=transport",
    label: "Challenges (verbal)",
    script:
      "Mixed sources, API warm-up, ministry adoption — briefing tool, not UNFCCC submission.",
  },
  {
    time: "4:25",
    route: "/dashboard?sector=transport",
    label: "Future (verbal)",
    script:
      "Next: searchable policy corpus per country, and a mobile app for field MRV.",
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
