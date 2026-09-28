import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TopNav } from "@/components/TopNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CountryProvider, useCountry } from "@/context/CountryContext";
import { PRIMARY_NAV } from "@/lib/navigation";
import { routeNeedsEmissions } from "@/lib/route-data";
import { claimChunkReload } from "@/lib/chunk-recovery";
import { readPreference, writePreference } from "@/lib/preferences";

const role = vi.hoisted(() => ({ activeRole: "Admin" }));
vi.mock("@/hooks/use-current-role", () => ({ useCurrentRole: () => ({ ...role, loading: false }) }));
vi.mock("@/components/RoleSwitcher", () => ({ RoleSwitcher: () => <button>Choose role</button> }));

beforeEach(() => { role.activeRole = "Admin"; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mountNavigation(path = "/district-translator") {
  return render(<MemoryRouter initialEntries={[path]}><CountryProvider><TopNav /><Routes><Route path="*" element={<main id="main-content" tabIndex={-1}>Workspace content</main>} /></Routes></CountryProvider></MemoryRouter>);
}

describe("workspace navigation", () => {
  it("keeps District Translator and Marketplace visible and marks the current page", () => {
    mountNavigation();
    expect(screen.queryByRole("button", { name: "Account menu" })).not.toBeInTheDocument();
    const links = within(screen.getByRole("navigation", { name: "Primary navigation" })).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Home", "Dashboard", "Emissions Map", "District Translator", "Sector Classification", "Marketplace", "Database"]);
    expect(links[3]).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute("href", "#main-content");
    expect(document.title).toContain("District Translator");
  });
  it("makes every tool reachable without a hidden horizontal strip", () => {
    mountNavigation();
    fireEvent.click(screen.getByRole("button", { name: "Open all tools" }));
    const menu = screen.getByRole("navigation", { name: "All workspace tools" });
    expect(within(menu).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(PRIMARY_NAV.map((item) => item.url));
    fireEvent.click(within(menu).getByRole("link", { name: /Documentation/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.title).toContain("Documentation");
  });
  it("keeps Sector Classification beside District Translator in the header", () => {
    mountNavigation("/sector-classification");
    const primary = screen.getByRole("navigation", { name: "Primary navigation" });
    const links = within(primary).getAllByRole("link").map((link) => link.textContent);
    expect(links.indexOf("Sector Classification")).toBe(links.indexOf("District Translator") + 1);
  });
  it("keeps Dashboard directly after Home in the header and first in the Home tool list", () => {
    mountNavigation();
    const primary = within(screen.getByRole("navigation", { name: "Primary navigation" })).getAllByRole("link");
    expect(primary.slice(0, 2).map((link) => link.textContent)).toEqual(["Home", "Dashboard"]);
    expect(PRIMARY_NAV.filter((item) => item.url !== "/")[0]?.title).toBe("Dashboard");
  });
  it("keeps Scenario Analysis in All tools without a header tab", () => {
    const title = "Scenario Analysis";
    const path = "/scenario-analysis";
    mountNavigation(path);
    const primary = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(within(primary).queryByText(title)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open all tools" }));
    const allTools = screen.getByRole("navigation", { name: "All workspace tools" });
    expect(within(allTools).getByRole("link", { name: new RegExp(title) })).toHaveAttribute("href", path);
  });
  it("preserves role-specific visibility in shortcuts and the tool menu", () => {
    role.activeRole = "FieldOfficer";
    mountNavigation("/my-work");
    expect(within(screen.getByRole("navigation", { name: "Primary navigation" })).getAllByRole("link")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Open all tools" }));
    const links = within(screen.getByRole("navigation", { name: "All workspace tools" })).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/my-work");
  });
});

describe("startup and recovery", () => {
  it.each(["/", "/map", "/district-translator", "/sector-classification", "/scenario-analysis", "/docs", "/activities/new", "/my-work", "/ingest"])("does not load national dashboard requests for %s", (path) => {
    expect(routeNeedsEmissions(path)).toBe(false);
  });
  it.each(["/dashboard", "/ndc", "/library", "/exports", "/dashboard/"])("loads shared data where required: %s", (path) => {
    expect(routeNeedsEmissions(path)).toBe(true);
  });
  it("only claims one automatic reload per session", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(claimChunkReload(storage)).toBe(true);
    expect(claimChunkReload(storage)).toBe(false);
  });
  it("does not enter a reload loop when storage is blocked or full", () => {
    expect(claimChunkReload({ getItem: () => { throw new Error("blocked"); }, setItem: vi.fn() })).toBe(false);
    expect(claimChunkReload({ getItem: () => null, setItem: () => { throw new Error("full"); } })).toBe(false);
  });
  it("recovers when a crashed route is replaced and hides internal error details", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Crash = (): never => { throw new Error("private database hostname"); };
    const view = render(<ErrorBoundary key="failed"><Crash /></ErrorBoundary>);
    expect(screen.getByRole("alert")).not.toHaveTextContent("private database hostname");
    view.rerender(<ErrorBoundary key="healthy"><h1>Healthy route</h1></ErrorBoundary>);
    expect(screen.getByRole("heading", { name: "Healthy route" })).toBeInTheDocument();
  });
});

describe("blocked browser storage", () => {
  it("keeps preferences optional rather than crashing the interface", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readPreference("localStorage", "role")).toBeNull();
    expect(() => writePreference("localStorage", "role", "Admin")).not.toThrow();
    expect(() => writePreference("sessionStorage", "country", null)).not.toThrow();
    function CountryChoice() {
      const { country, selectCountry, clearCountry } = useCountry();
      return <><p>{country?.name ?? "Choose country"}</p><button onClick={() => selectCountry("UG")}>Select Uganda</button><button onClick={clearCountry}>Clear country</button></>;
    }
    render(<CountryProvider><CountryChoice /></CountryProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Select Uganda" }));
    expect(screen.getByText("Uganda")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear country" }));
    expect(screen.getByText("Choose country")).toBeInTheDocument();
  });
});
