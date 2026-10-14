/** Guards complete target coverage and keyboard selection in the dashboard catalogue. */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NDCTargetsColumn } from "@/components/columns/NDCTargets";
import { ndcTargets } from "@/data/uganda-ndc-data";

afterEach(cleanup);

it("includes all eleven targets, including the economy-wide target, in the all-sector view", () => {
  const select = vi.fn();
  render(<NDCTargetsColumn selectedSector="economy-wide" selectedTargetId={null} onSelectTarget={select} scroll={false} />);
  for (const target of ndcTargets) expect(screen.getByRole("button", { name: new RegExp(`^Select target ${target.id}:`) })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /^Select target t0:/ }));
  expect(select).toHaveBeenCalledOnce();
  expect(select).toHaveBeenCalledWith("t0");
});
