import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", mono = false, ...props }, ref) => {
    return (
      <input
        type={type}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn(
          "flex h-8 w-full rounded-md border border-input bg-background/60 px-2.5 py-1 text-xs shadow-xs transition-colors",
          "placeholder:text-muted-foreground/60 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          mono && "font-mono",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
