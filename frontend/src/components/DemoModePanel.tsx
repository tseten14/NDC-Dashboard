import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  DEMO_CLICK_PATH,
  DEMO_POLICY_QUESTIONS,
} from "@/lib/demo-mode";
import { useDemoMode } from "@/hooks/use-demo-mode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Presentation, ChevronRight, X, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoModeToggle() {
  const { active, setActive } = useDemoMode();
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      className="h-7 text-xs gap-1 shrink-0"
      onClick={() => setActive(!active)}
    >
      <Presentation className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Demo</span>
    </Button>
  );
}

function QuestionsOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Card className="fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))] shadow-lg border-primary/30 bg-card/95 backdrop-blur-sm">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ListChecks className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs font-bold text-foreground">Five policy questions</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onDismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Operational questions ministries ask — not abstract framework language.
        </p>
        <ol className="space-y-1.5 list-decimal list-inside">
          {DEMO_POLICY_QUESTIONS.map((q, i) => (
            <li key={i} className="text-[11px] text-foreground leading-snug pl-0.5">
              {q}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export function DemoModePanel() {
  const { active, navigateWithDemo } = useDemoMode();
  const location = useLocation();
  const [questionsVisible, setQuestionsVisible] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!active) return null;

  const currentPath = location.pathname + location.search;

  return (
    <>
      {questionsVisible && location.pathname.includes("/dashboard") && (
        <QuestionsOverlay onDismiss={() => setQuestionsVisible(false)} />
      )}

      <div className="fixed bottom-4 left-4 z-50">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="h-8 text-xs shadow-lg gap-1.5">
              <Presentation className="h-3.5 w-3.5" />
              Demo script
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(400px,90vw)] p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="text-sm">3-minute demo path</SheetTitle>
              <SheetDescription className="text-xs">
                Pre-curated clicks — Uganda, Senior Decision-Maker, Transport sector.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="p-3 space-y-2">
                {DEMO_CLICK_PATH.map((step, idx) => {
                  const isCurrent = currentPath.includes(step.route.split("?")[0]);
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={cn(
                        "w-full text-left rounded-lg border p-2.5 transition-colors hover:bg-muted/50",
                        isCurrent && "border-primary/50 bg-primary/5",
                      )}
                      onClick={() => {
                        navigateWithDemo(step.route);
                        setSheetOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant="outline" className="text-[9px] h-4">
                          {step.time}
                        </Badge>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </div>
                      <p className="text-[11px] font-semibold text-foreground">{step.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{step.script}</p>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
