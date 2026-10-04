import React from "react";
import { cn } from "@/lib/utils";
import { TunnelState } from "@/types/tunnel";

interface BadgeProps {
  children?: React.ReactNode;
  state?: TunnelState;
  className?: string;
}

export function StatusIndicator({
  state = "disconnected",
  className,
}: {
  state?: TunnelState;
  className?: string;
}) {
  const dotColors: Record<TunnelState, string> = {
    connected: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] dark:bg-emerald-400 dark:shadow-[0_0_8px_rgba(52,211,153,0.8)]",
    connecting: "bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.6)] dark:bg-amber-300 dark:shadow-[0_0_6px_rgba(252,211,77,0.6)]",
    error: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] dark:bg-red-400 dark:shadow-[0_0_6px_rgba(248,113,113,0.6)]",
    disconnected: "bg-neutral-400/50 dark:bg-neutral-500/50",
  };

  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full transition-colors", dotColors[state], className)}
    />
  );
}

export function Badge({
  children,
  state,
  className,
}: BadgeProps) {
  const stateBadgeStyles: Record<TunnelState, string> = {
    connected: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50",
    connecting: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50",
    error: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50",
    disconnected: "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800/50 dark:text-neutral-400 dark:border-neutral-700/50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
        state ? stateBadgeStyles[state] : "border-border/60 bg-muted/50 text-foreground",
        className
      )}
    >
      {state && <StatusIndicator state={state} />}
      {children}
    </span>
  );
}
