import React from "react";
import { cn } from "@/lib/utils";

interface ConfigurationFieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}

export function ConfigurationField({
  label,
  children,
  hint,
  className,
}: ConfigurationFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5 w-full", className)}>
      <div className="text-xs font-medium text-muted-foreground select-none">
        {label}
      </div>
      <div className="w-full">{children}</div>
      {hint && <span className="text-[11px] text-muted-foreground/80">{hint}</span>}
    </div>
  );
}

export function TwoColumnGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 min-[850px]:grid-cols-2 gap-4 items-start", className)}>
      {children}
    </div>
  );
}
