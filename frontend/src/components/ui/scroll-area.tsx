/**
 * Provides the shared Scroll Area interface primitive used across the application. It centralises accessible behavior and restrained styling so screens do not create inconsistent controls.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, type = "auto", ...props }, ref) => (
  // `type` defaults to "auto" (not Radix's "hover"): with "hover" the scrollbar —
  // and thus the viewport's `overflow: scroll` — only mounts on pointer hover, so
  // touch devices (no hover) get `overflow: hidden` and the content can't scroll.
  // "auto" enables overflow whenever content overflows, on any input device.
  <ScrollAreaPrimitive.Root ref={ref} type={type} className={cn("relative min-h-0 min-w-0 overflow-hidden", className)} {...props}>
    {/* Radix's intrinsic table wrapper can widen the entire page to the width
        of a table or diagram. Constrain vertical scrollers so each page's
        explicit horizontal scroll regions work at narrow widths. */}
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit] [&>div]:!block">{children}</ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none ",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
