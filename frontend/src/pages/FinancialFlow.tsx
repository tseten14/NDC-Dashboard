/**
 * Reports that verified commitments, payments, and expenditures are absent rather than inferring cash flow from project status.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { Card, CardContent } from "@/components/ui/card";

export default function FinancialFlow() {
  return (
    <section className="p-4 space-y-4 max-w-4xl">
      <h1 className="text-lg font-bold">Financial Flows</h1>
      <p>Track money committed, paid out and spent by project.</p>
      <Card><CardContent className="p-4 space-y-2">
        <h2 className="font-semibold">Financial records unavailable</h2>
        <p>No verified project payment or expenditure records are connected. Project status cannot tell us how much money was paid or spent.</p>
        <p className="text-muted-foreground">This view needs dated commitment, payment and expenditure records from the responsible institution, with currency and source references.</p>
      </CardContent></Card>
    </section>
  );
}
