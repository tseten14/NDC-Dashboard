import type { ReactNode } from "react";
import { Database, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ColumnShellProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function ColumnShell({ title, children, className }: ColumnShellProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export function ColumnLoadingState({ title = "Loading" }: { title?: string }) {
  return (
    <ColumnShell title={title}>
      <div className="flex-1 p-3 space-y-3" aria-busy="true" aria-label="Loading">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          <span>Loading data…</span>
        </div>
        <Skeleton className="skeleton-shimmer h-4 w-[75%]" />
        <Skeleton className="skeleton-shimmer h-[180px] w-full rounded-md" />
        <Skeleton className="skeleton-shimmer h-16 w-full rounded-md" />
      </div>
    </ColumnShell>
  );
}

export function NoDataPlaceholder({
  message = "No data reported for this period",
  hint,
}: {
  message?: string;
  hint?: string;
}) {
  return (
    <Card className="border-dashed bg-muted/40">
      <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-2">
        <div className="rounded-full bg-muted p-2.5">
          <Database className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">{message}</p>
        {hint && <p className="text-[10px] text-muted-foreground/80 max-w-[220px]">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function SelectTargetPlaceholder({ column }: { column: string }) {
  return (
    <ColumnShell title={column}>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">Select a target to view {column.toLowerCase()}</p>
      </div>
    </ColumnShell>
  );
}
