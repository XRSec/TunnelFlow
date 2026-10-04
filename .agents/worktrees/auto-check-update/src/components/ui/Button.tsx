import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "sm", children, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60",
      outline: "border border-border bg-transparent hover:bg-muted/70 text-foreground",
      ghost: "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs",
    };

    const sizes = {
      xs: "h-6 px-2 text-[11px] rounded-md gap-1",
      sm: "h-7 px-2.5 text-xs rounded-md gap-1.5",
      md: "h-8 px-3.5 text-xs rounded-lg gap-2",
      icon: "h-7 w-7 p-0 flex items-center justify-center rounded-md",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
