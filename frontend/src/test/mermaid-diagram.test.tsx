import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import systemDesignMarkdown from "../../../docs/dev/system-design.md?raw";
import {
  MermaidDiagram,
  normalizeMermaidSvg,
  scrubMermaidSvgMarkup,
} from "@/components/docs/MarkdownDocument";

const LOCAL_DEV_CHART = `flowchart TB
  subgraph DevMachine["Local dev machine"]
    Vite["Vite :8080\\nfrontend"]
    Express["Express :8787\\nAPI"]
  end

  CT["Climate TRACE\\nAPI v7"]
  PGlocal[("Postgres\\noptional")]

  Vite -->|proxy /api| Express
  Express --> CT
  Express -.-> PGlocal`;

describe("Mermaid diagrams in system design", () => {
  it("strips Mermaid max-width cap from SVG markup", () => {
    const cleaned = scrubMermaidSvgMarkup(
      '<svg width="900" style="max-width: 512px;" viewBox="0 0 900 200"></svg>',
    );
    expect(cleaned).not.toMatch(/max-width:\s*512px/);
    expect(cleaned).toContain('width="100%"');
  });

  it("normalizes SVG for responsive width", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<svg width="900" height="200" viewBox="0 0 900 200"><text>Climate TRACE API v7</text></svg>';
    normalizeMermaidSvg(root);
    const svg = root.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("100%");
    expect(svg?.style.maxWidth).toBe("100%");
  });

  // Mermaid needs a full browser DOM; jsdom renders the error fallback in CI.
  it.skip("renders local dev diagram with full Climate TRACE label (browser only)", async () => {
    const { findByTestId } = render(<MermaidDiagram chart={LOCAL_DEV_CHART} />);
    const host = await findByTestId("mermaid-diagram", {}, { timeout: 15_000 });
    await waitFor(() => {
      const svg = host.querySelector("svg");
      expect(svg?.textContent).toMatch(/Climate TRACE/);
      expect(svg?.getAttribute("width")).toBe("100%");
    });
  });

  it("bundled system-design.md uses compact in-box flowchart labels", () => {
    expect(systemDesignMarkdown).toContain("CT[Climate TRACE]");
    expect(systemDesignMarkdown).toContain("[*] --> Check");
    expect(systemDesignMarkdown).toContain("subgraph UI[Presentation layer]");
    const stateDiagram = systemDesignMarkdown.match(/```mermaid\nstateDiagram[\s\S]*?```/)?.[0] ?? "";
    expect(stateDiagram).not.toMatch(/Check --> \w+:/);
  });
});
