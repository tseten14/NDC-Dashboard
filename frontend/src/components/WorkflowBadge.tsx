import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CircleDot, Send, Check, Undo2, X, Clock } from "lucide-react";

const styles: Record<string, { cls: string; Icon: any; label: string }> = {
  Draft: { cls: "bg-muted text-muted-foreground", Icon: CircleDot, label: "Draft" },
  Submitted: { cls: "bg-chart-4/15 text-chart-4 border-chart-4/40", Icon: Send, label: "Submitted" },
  Approved: { cls: "bg-on-track/15 text-on-track border-on-track/40", Icon: Check, label: "Approved" },
  Returned: { cls: "bg-at-risk/15 text-at-risk border-at-risk/40", Icon: Undo2, label: "Returned" },
  Declined: { cls: "bg-off-track/15 text-off-track border-off-track/40", Icon: X, label: "Declined" },
  Pending: { cls: "bg-chart-3/15 text-chart-3 border-chart-3/40", Icon: Clock, label: "Pending" },
};

export const WorkflowBadge = memo(function WorkflowBadge({ state, className }: { state: string; className?: string }) {
  const s = styles[state] ?? styles.Draft;
  const Icon = s.Icon;
  return (
    <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 gap-0.5", s.cls, className)}>
      <Icon className="h-2.5 w-2.5" />
      {s.label}
    </Badge>
  );
});

const validationStyles: Record<string, string> = {
  Seeded: "bg-muted text-muted-foreground border-muted-foreground/30",
  Uploaded: "bg-chart-4/15 text-chart-4 border-chart-4/40",
  Verified: "bg-on-track/15 text-on-track border-on-track/40",
  Modelled: "bg-chart-3/15 text-chart-3 border-chart-3/40",
};

export const ValidationBadge = memo(function ValidationBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5", validationStyles[status] ?? validationStyles.Seeded, className)}>
      {status}
    </Badge>
  );
});
