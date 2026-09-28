/**
 * Provides the shared Skeleton interface primitive used across the application. It centralises accessible behavior and restrained styling so screens do not create inconsistent controls.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
