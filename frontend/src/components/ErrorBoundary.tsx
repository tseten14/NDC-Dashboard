/**
 * Catches crashes in a screen.
 *
 * If part of the interface fails, this shows a readable message and a way to
 * recover instead of leaving a blank white page, and reports the error back to
 * the server so it can be fixed.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isChunkLoadError } from "@/lib/lazy-with-retry";

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

  reload = () => window.location.reload();

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      // A stale-chunk failure can't be fixed by re-rendering the same dead
      // import — the only recovery is a full reload to fetch the fresh build.
      const chunkError = isChunkLoadError(this.state.error);
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center min-h-[160px]">
          <AlertTriangle className="h-7 w-7 text-destructive" />
          <div className="space-y-0.5">
            {this.props.label && (
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                {this.props.label}
              </p>
            )}
            <p className="text-sm font-semibold text-foreground">
              {chunkError ? "A new version is available" : "Something went wrong"}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {chunkError
                ? "This page was updated since you loaded it. Reload to get the latest version."
                : this.state.error.message || "An unexpected error occurred in this section."}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={chunkError ? this.reload : this.reset}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            {chunkError ? "Reload page" : "Try again"}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
