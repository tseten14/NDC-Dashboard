import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLASSIFICATION_FRAMEWORKS, DEFAULT_FRAMEWORK, getFramework } from "@/data/classifications";
import { categoryCodes, flattenSectors, matchesBranch, matchesSector, planFrameworkChange, readClassificationSelection, saveClassificationSelection, selectionKey, selectionState, toggleCategory } from "@/lib/sector-classification";
import { CountryProvider } from "@/context/CountryContext";
import SectorClassification from "@/components/classification/ClassificationWorkspace";

const afolu = DEFAULT_FRAMEWORK.hierarchy[2];
const livestock = afolu.children[0];
const refinement = getFramework("ipcc-2019")!;
const renderPage = () => render(<CountryProvider><SectorClassification /></CountryProvider>);

beforeEach(() => {
  // Node 26 exposes its own undefined localStorage, shadowing Vitest's browser global.
  // Use the actual jsdom Storage instance, including its native quota/error behavior.
  const browser = (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window;
  vi.stubGlobal("localStorage", browser.localStorage);
  window.localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem("ndc-selected-country", "UG");
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("verified classification definitions and selection", () => {
  it("keeps code relationships unique and carries source/version for each available hierarchy", () => {
    for (const framework of CLASSIFICATION_FRAMEWORKS.filter((item) => !item.unavailableReason)) {
      const nodes = flattenSectors(framework.hierarchy);
      expect(framework.hierarchy.map((node) => node.code)).toEqual(["1", "2", "3", "4", "5"]);
      expect(new Set(nodes.map((node) => node.code)).size).toBe(nodes.length);
      expect(framework.source.url).toContain("ipcc-nggip.iges.or.jp");
      expect(framework.version).toBeTruthy();
      for (const node of nodes) for (const child of node.children) expect(child.code.split(".").slice(0, -1).join(".")).toBe(node.code);
    }
    expect(afolu.children.map((node) => [node.code, node.label])).toEqual([
      ["3.A", "Livestock"], ["3.B", "Land"], ["3.C", "Aggregate Sources and Non-CO₂ Emissions Sources on Land"], ["3.D", "Other"],
    ]);
    expect(afolu.children[3].children[0]).toMatchObject({ code: "3.D.1", label: "Harvested Wood Products" });
  });

  it("uses different verified meanings for codes reassigned in 2019", () => {
    const oldNodes = flattenSectors(DEFAULT_FRAMEWORK.hierarchy);
    const newNodes = flattenSectors(refinement.hierarchy);
    expect(oldNodes.find((node) => node.code === "2.B.10").label).toBe("Other (Please specify)");
    expect(newNodes.find((node) => node.code === "2.B.10").label).toBe("Hydrogen Production");
    expect(newNodes.find((node) => node.code === "2.B.11").label).toBe("Other (Please specify)");
    expect(newNodes.find((node) => node.code === "2.C.7").label).toBe("Rare Earths");
    expect(oldNodes.find((node) => node.code === "2.E.4").label).toBe("Heat Transfer Fluid");
    expect(newNodes.find((node) => node.code === "2.E.4").label).toBe("Microelectromechanical systems (MEMS)");
  });

  it("selects descendants, distinguishes partial selection, and only removes the requested child", () => {
    let selected = toggleCategory(afolu, new Set(), true);
    expect(selected.size).toBe(18);
    expect(selectionState(afolu, selected)).toBe(true);
    selected = toggleCategory(livestock.children[0], selected, false);
    expect(selectionState(afolu, selected)).toBe("indeterminate");
    expect(selectionState(livestock, selected)).toBe("indeterminate");
    expect(selected.has("3.A.2")).toBe(true);
    expect(selected.has("3.B.1")).toBe(true);
    selected = toggleCategory(livestock, selected, true);
    expect(selectionState(afolu, selected)).toBe(true);
    expect(toggleCategory(afolu, selected, false).size).toBe(0);
  });

  it("finds hidden descendants by name, compact codes, spaced codes, chemical formulas and aliases", () => {
    expect(matchesBranch(afolu, "3 a 1")).toBe(true);
    expect(matchesSector(livestock.children[0], "3A1")).toBe(true);
    expect(matchesBranch(afolu, "wood products")).toBe(true);
    expect(matchesBranch(afolu, "non-co2")).toBe(true);
    expect(matchesSector(afolu, "AFOLU")).toBe(true);
    expect(matchesBranch(afolu, "unknown sector")).toBe(false);
  });

  it("does not infer cross-framework mappings from matching codes", () => {
    const selection = new Set(["3.A.1", "2.B.10"]);
    expect(planFrameworkChange(selection, DEFAULT_FRAMEWORK, refinement)).toEqual({ retained: [], unmapped: ["3.A.1", "2.B.10"] });
    expect(planFrameworkChange(selection, DEFAULT_FRAMEWORK, DEFAULT_FRAMEWORK).retained).toHaveLength(2);
    expect(() => planFrameworkChange(selection, DEFAULT_FRAMEWORK, getFramework("crt"))).toThrow();
  });

  it("persists a versioned country-specific contract and permits clearing a saved selection", () => {
    const listener = vi.fn();
    window.addEventListener("ndc:classification-saved", listener);
    const saved = saveClassificationSelection("UG", DEFAULT_FRAMEWORK, new Set(categoryCodes(livestock)));
    expect(readClassificationSelection("UG")).toEqual(saved);
    expect(saved.selectedCodes).toEqual(["3.A.1", "3.A.2"]);
    expect(readClassificationSelection("KE")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    saveClassificationSelection("UG", DEFAULT_FRAMEWORK, new Set());
    expect(readClassificationSelection("UG").selectedCodes).toEqual([]);
    window.removeEventListener("ndc:classification-saved", listener);
  });

  it.each(["frameworkId", "hierarchyVersion", "selectedCodes", "countryCode", "schemaVersion"])("rejects incompatible saved %s without silently dropping data", (field) => {
    const record = saveClassificationSelection("UG", DEFAULT_FRAMEWORK, new Set(["3.A.1"]));
    window.localStorage.setItem(selectionKey("UG"), JSON.stringify({ ...record, [field]: field === "selectedCodes" ? ["3.X.9"] : "unsupported" }));
    expect(() => readClassificationSelection("UG")).toThrow();
  });

  it("rejects unknown codes on save without overwriting the previous selection", () => {
    const previous = saveClassificationSelection("UG", DEFAULT_FRAMEWORK, new Set(["3.A.1"]));
    expect(() => saveClassificationSelection("UG", DEFAULT_FRAMEWORK, new Set(["3.A.1", "unknown"]))).toThrow();
    expect(readClassificationSelection("UG")).toEqual(previous);
  });
});

describe("Sector Classification interactions", () => {
  it("separates expansion from selection; searches collapsed branches, saves and restores after remount", () => {
    const page = renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^Expand 3 Agriculture/ }));
    expect(screen.getByRole("checkbox", { name: "3.A Livestock" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: "3.A Livestock" }));
    expect(screen.getByRole("checkbox", { name: /^3 Agriculture/ })).toBePartiallyChecked();
    fireEvent.click(screen.getByRole("button", { name: /^Collapse 3 Agriculture/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Search sectors by name or code" }), { target: { value: "3A1" } });
    const child = screen.getByRole("checkbox", { name: "3.A.1 Enteric Fermentation" });
    expect(child).toBeChecked();
    fireEvent.click(child);
    expect(screen.getByRole("checkbox", { name: "3.A Livestock" })).toBePartiallyChecked();
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.queryByRole("checkbox", { name: "3.A Livestock" })).not.toBeInTheDocument();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save selection" }));
    expect(readClassificationSelection("UG").selectedCodes).toEqual(["3.A.2"]);
    expect(screen.getByText("Saved on this device")).toBeInTheDocument();
    page.unmount(); renderPage();
    fireEvent.click(screen.getByRole("button", { name: /^Expand 3 Agriculture/ }));
    fireEvent.click(screen.getByRole("button", { name: "Expand 3.A Livestock" }));
    expect(screen.getByRole("checkbox", { name: "3.A.2 Manure Management" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "3.A.1 Enteric Fermentation" })).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /^Review selection/ }));
    fireEvent.click(screen.getByRole("button", { name: "Remove 3.A.2 Manure Management" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("checkbox", { name: /^3 Agriculture/ })).not.toBeChecked();
  });

  it("requires confirmation, lists unmapped items, and retains the saved record until another save", () => {
    saveClassificationSelection("UG", DEFAULT_FRAMEWORK, new Set(["2.B.10"]));
    renderPage();
    const choice = screen.getByRole("radio", { name: refinement.name });
    fireEvent.click(choice);
    let dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Other (Please specify)")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep current framework" }));
    expect(screen.getByRole("radio", { name: "IPCC 2006" })).toBeChecked();
    fireEvent.click(choice);
    dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove categories and switch" }));
    expect(choice).toBeChecked();
    expect(screen.getByText(/No sectors selected/)).toBeInTheDocument();
    expect(readClassificationSelection("UG").frameworkId).toBe("ipcc-2006");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hydrogen" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "2.B.10 Hydrogen Production" }));
    fireEvent.click(screen.getByRole("button", { name: "Save selection" }));
    expect(readClassificationSelection("UG").frameworkId).toBe("ipcc-2019");
  });

  it("marks missing frameworks unavailable and preserves selection on empty search results", () => {
    renderPage();
    expect(screen.getByRole("radio", { name: "CRT – Common Reporting Tables" })).toBeDisabled();
    expect(screen.queryByRole("radio", { name: "National classification" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "4 Waste" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "not a category" } });
    expect(screen.getByText("No matching sectors or codes")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Clear search" })[0]);
    expect(screen.getByRole("checkbox", { name: "4 Waste" })).toBeChecked();
  });

  it("reports failed saves and lets the user retry with edits intact", () => {
    renderPage();
    fireEvent.click(screen.getByRole("checkbox", { name: "4 Waste" }));
    const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("QuotaExceededError"); });
    fireEvent.click(screen.getByRole("button", { name: "Save selection" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Selection could not be saved");
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "4 Waste" })).toBeChecked();
    blocked.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "Save selection" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(readClassificationSelection("UG").selectedCodes.length).toBeGreaterThan(0);
  });

  it("requires explicit recovery for unreadable storage before it can be overwritten", () => {
    window.localStorage.setItem(selectionKey("UG"), "{broken json");
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Your stored data has not been changed");
    expect(screen.getByRole("button", { name: "Save selection" })).toBeDisabled();
    expect(window.localStorage.getItem(selectionKey("UG"))).toBe("{broken json");
    fireEvent.click(screen.getByRole("button", { name: "Start a new selection" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Start a new selection" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "4 Waste" }));
    fireEvent.click(screen.getByRole("button", { name: "Save selection" }));
    expect(readClassificationSelection("UG").selectedCodes.length).toBeGreaterThan(0);
  });
});
