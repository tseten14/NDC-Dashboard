import { Card, CardContent } from "@/components/ui/card";

export default function CostEffectiveness() {
  return (
    <section className="p-4 space-y-4 max-w-4xl">
      <h1 className="text-lg font-bold">Cost Effectiveness</h1>
      <p>Compare project costs with the emissions they avoid.</p>
      <Card><CardContent className="p-4 space-y-2">
        <h2 className="font-semibold">Verified project results unavailable</h2>
        <p>No project has linked cost and verified emissions-reduction evidence for the same reporting period. A cost-per-tonne ranking cannot yet be calculated.</p>
        <p className="text-muted-foreground">Climate TRACE measures emissions estimates. It does not establish how much a particular project reduced emissions or how much that project cost.</p>
      </CardContent></Card>
    </section>
  );
}
