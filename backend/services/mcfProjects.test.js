import { describe, it, expect } from "vitest";
import { getMcfMeta, getMcfProject, searchMcfProjects } from "./mcfProjects.js";

describe("mcfProjects", () => {
  it("loads corpus meta with funders", () => {
    const meta = getMcfMeta();
    expect(meta.count).toBeGreaterThan(50);
    expect(meta.data_source).toBe("mcf_projects_export");
    expect(Object.keys(meta.funders).length).toBeGreaterThan(0);
  });

  it("returns full corpus when no text query is set", () => {
    const all = searchMcfProjects({ limit: 10 });
    expect(all.total).toBeGreaterThan(50);
    expect(all.projects.length).toBe(10);
  });

  it("searches by keyword and filters by funder", () => {
    const res = searchMcfProjects({ q: "climate", limit: 5 });
    expect(res.total).toBeGreaterThan(0);
    expect(res.projects.length).toBeLessThanOrEqual(5);
    expect(res.projects[0].snippet).toBeTruthy();

    const meta = getMcfMeta();
    const funder = Object.keys(meta.funders)[0];
    const filtered = searchMcfProjects({ q: "project", funder, limit: 20 });
    expect(filtered.projects.every((p) => (p.funder ?? "").includes(funder.split(" ")[0]))).toBe(true);
  });

  it("filters by sector keyword", () => {
    const energy = searchMcfProjects({ sector: "energy", limit: 20 });
    expect(energy.total).toBeGreaterThan(0);
    expect(energy.projects.length).toBeGreaterThan(0);
  });

  it("filters by minimum amount", () => {
    const large = searchMcfProjects({ q: "project", minAmount: 10, limit: 20 });
    expect(large.projects.every((p) => p.amountUsd == null || p.amountUsd >= 10)).toBe(true);
  });

  it("resolves a project by id", () => {
    const { projects } = searchMcfProjects({ q: "adaptation", limit: 1 });
    expect(projects.length).toBeGreaterThan(0);
    const full = getMcfProject(projects[0].id);
    expect(full?.id).toBe(projects[0].id);
    expect(full?.title).toBeTruthy();
    expect(getMcfProject("nonexistent-mcf-id")).toBeNull();
  });
});
