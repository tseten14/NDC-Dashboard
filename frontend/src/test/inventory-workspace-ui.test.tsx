/**
 * Verifies Inventory Workspace Ui behavior so regressions cannot silently change a published value, evidence boundary, or user workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ClassificationArchive from "@/pages/ClassificationArchive";
import { CountryProvider } from "@/context/CountryContext";
import { createExercise, exerciseKey, writeExercises } from "@/lib/inventory-workspace";

const show = () => render(<MemoryRouter><CountryProvider><ClassificationArchive /></CountryProvider></MemoryRouter>);
beforeEach(() => {
  const browser = (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window;
  vi.stubGlobal("localStorage", browser.localStorage);
  localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem("ndc-selected-country", "UG");
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("keeps saved exercises readable and exportable without editing them", () => {
  writeExercises("UG", [createExercise("UG", "Earlier inventory")]);
  const before = localStorage.getItem(exerciseKey("UG"));
  show();
  fireEvent.click(screen.getByRole("button", { name: /Earlier inventory/ }));
  expect(screen.getByRole("heading", { name: "Earlier inventory" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Export exercise backup" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "New exercise" })).not.toBeInTheDocument();
  expect(localStorage.getItem(exerciseKey("UG"))).toBe(before);
});

it("does not overwrite an unreadable saved archive", () => {
  localStorage.setItem(exerciseKey("UG"), "{broken json");
  show();
  expect(screen.getByRole("alert")).toHaveTextContent("Your browser data has not been changed");
  expect(localStorage.getItem(exerciseKey("UG"))).toBe("{broken json");
});

it("explains an empty archive", () => {
  show();
  expect(screen.getByText("No saved exercises were found on this device.")).toBeInTheDocument();
});
