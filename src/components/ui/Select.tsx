import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  mono?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, mono = false, value, defaultValue, onChange, ...props }, ref) => {
    const isControlled = value !== undefined;
    const [localValue, setLocalValue] = useState(defaultValue ?? "");

    const currentValue = isControlled ? value : localValue;
    const isPlaceholder = currentValue === "" || currentValue === null || currentValue === undefined;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (!isControlled) {
        setLocalValue(e.target.value);
      }
      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className="relative w-full">
        <select
          className={cn(
            "flex h-8 w-full appearance-none rounded-md border border-input bg-background/60 px-2.5 py-1 pr-7 text-xs shadow-xs transition-colors",
            "focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isPlaceholder ? "text-muted-foreground/80 font-normal" : "text-foreground font-normal",
            "[&>option]:text-foreground [&>option]:bg-background [&>option[value='']]:text-muted-foreground/80",
            mono && "font-mono",
            className
          )}
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
