import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label shown above the error message (e.g. "Risk module") */
  label?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center min-h-[160px]">
          <AlertTriangle className="h-7 w-7 text-destructive" />
          <div className="space-y-0.5">
            {this.props.label && (
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {this.props.label}
              </p>
            )}
            <p className="text-sm font-semibold text-foreground">Something went wrong</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {this.state.error.message || "An unexpected error occurred in this section."}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={this.reset}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
