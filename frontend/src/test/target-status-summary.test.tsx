import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { TargetStatusSummary } from "../components/TargetStatusSummary";

vi.mock("../context/EmissionsDataContext", () => ({
  useEmissionsData: () => ({
    summaryIsLoading: false,
    summaryError: null,
    isApiReachable: true,
    sectorError: {},
    timeseriesBySector: Object.fromEntries(["afolu", "energy", "transport", "waste", "ippu"].map((sector) => [sector, { timeseries: [{ year: 2025, value: 1 }] }])),
    economyWideTimeseries: [{ year: 2025, value: 6 }],
    indicatorTargets: { t2: { timeseries: [{ year: 2024, value: 14 }] } },
    getProgressForTarget: () => ({ percent: null, status: "unknown" }),
  }),
}));

describe("target status summary", () => {
  it("counts national and indicator feeds and does not infer implementation gaps", () => {
    render(<MemoryRouter><TargetStatusSummary onSelectTarget={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByText("Activity gaps")).not.toBeInTheDocument();
    expect(screen.getByText("Awaiting data").parentElement).toHaveTextContent("4");
    expect(screen.getByText("Not assessed").parentElement).toHaveTextContent("11");
  });
});
