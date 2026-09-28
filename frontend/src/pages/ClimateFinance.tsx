/** Finance reference records and user-authored proposals, with explicit provenance. */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { sectorDefinitions, type SectorId } from "@/data/uganda-ndc-data";
import { currentClimateFinance } from "@/data/uganda-climate-finance";
import { FundingProposalDialog, type ProposalContext } from "@/components/finance/FundingProposalDialog";
import { McfDocumentsPanel } from "@/components/McfDocumentsPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

const usd = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
}).format(value);

export default function ClimateFinance() {
  const [searchParams] = useSearchParams();
  const sector = sectorDefinitions.find((item) => item.id === searchParams.get("sector"));
  const sectorId = sector?.id as SectorId | undefined;
  const intervention = searchParams.get("intervention") || undefined;
  const [budget, setBudget] = useState("");
  const [proposalOpen, setProposalOpen] = useState(false);
  const budgetUSD = Number(budget);
  const hasBudget = budget.trim() !== "" && Number.isFinite(budgetUSD) && budgetUSD > 0;
  const proposalContext: ProposalContext = {
    projectName: searchParams.get("objective") || intervention || `${sector?.name ?? "Uganda"} climate project`,
    sectorLabel: sector?.name ?? "Not selected",
    interventionLabel: intervention,
    estimatedNeedUSD: hasBudget ? budgetUSD : undefined,
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6 max-w-5xl">
        <h1 className="text-lg font-bold">Climate Finance</h1>
        <section className="space-y-3" aria-labelledby="finance-reference-heading">
          <h2 id="finance-reference-heading" className="font-semibold">Published project commitments</h2>
          <p className="text-muted-foreground">
            These selected records were checked against funder sources on 28 September 2026.
            They are a partial reference list, not Uganda’s total climate finance or money already spent.
            Status and disbursements can change; open the source for the latest information.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {currentClimateFinance.map((record) => (
              <Card key={record.id}><CardContent className="p-4 space-y-2">
                <h3 className="font-semibold">{record.programme}</h3>
                <p>{record.funder}</p>
                <p className="font-semibold">{usd(record.amountUSD)} committed</p>
                <p className="text-muted-foreground">{record.amountDescription}</p>
                <p>Approved: <time dateTime={record.approvedOn}>{record.approvedOn}</time></p>
                <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Source: {record.sourceLabel}
                </a>
              </CardContent></Card>
            ))}
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="finance-proposal-heading">
          <h2 id="finance-proposal-heading" className="font-semibold">Prepare your funding proposal</h2>
          <p className="text-muted-foreground">
            Enter your project’s budget. A sector’s emissions or its climate target cannot determine
            a project cost, funding approval or carbon-credit revenue.
          </p>
          {intervention && <p>Planned intervention: {intervention}</p>}
          <div className="max-w-sm space-y-2">
            <Label htmlFor="project-budget">Your estimated project budget (US dollars)</Label>
            <Input id="project-budget" type="number" min="0" step="any" value={budget}
              onChange={(event) => setBudget(event.target.value)} aria-describedby="budget-note" />
            <p id="budget-note" className="text-sm text-muted-foreground">Your input, not a verified cost estimate. Include evidence for it in the proposal.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!hasBudget} onClick={() => setProposalOpen(true)}>Prepare funding proposal</Button>
            <Button variant="outline" asChild><Link to={`/mwp-marketplace${sectorId ? `?sector=${sectorId}&from=climate-finance` : ""}`}>Open Marketplace</Link></Button>
            <Button variant="outline" asChild><Link to="/policy-impact">Review policy intervention</Link></Button>
          </div>
          <p className="text-muted-foreground">Funding eligibility must be confirmed with the funder. The application does not verify project approval or issue carbon credits.</p>
        </section>

        {sectorId && <section className="space-y-2">
          <h2 className="font-semibold">Related fund project documents</h2>
          <McfDocumentsPanel sectorId={sectorId} />
        </section>}
      </div>
      {proposalOpen && <FundingProposalDialog open={proposalOpen} onOpenChange={setProposalOpen} context={proposalContext} />}
    </ScrollArea>
  );
}
