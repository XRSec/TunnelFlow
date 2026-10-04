import React from "react";
import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  memo?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  title,
  description,
  memo,
  disabled = false,
  className,
}: ToggleProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-accent/5 transition-colors select-none", disabled && "opacity-50 cursor-not-allowed", className)}>
      <div className="flex-1 min-w-0 pr-2">
        <div 
          onClick={() => !disabled && onChange(!checked)}
          className="text-sm font-medium text-foreground cursor-pointer"
        >
          {title}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            if (!disabled) onChange(!checked);
          }}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            checked ? "bg-primary" : "bg-input"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out",
              checked ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
        {memo && <div onClick={(e) => e.stopPropagation()}>{memo}</div>}
      </div>
    </div>
  );
}
