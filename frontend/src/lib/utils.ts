/**
 * Small shared helpers.
 *
 * cn() merges CSS class names and resolves conflicts, so a component's default
 * styling can be overridden cleanly by whoever uses it.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
