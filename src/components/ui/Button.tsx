/**
 * Button Component
 *
 * 物理触觉参考自 Claude Design System (CDS / open-claude-ui, MIT License):
 * - active:scale-[0.98] 物理微形变反馈
 * - 120ms/150ms 瞬时咬合与弹簧过渡
 * - 严格遵循单闭合边框原则，减轻容器内多层边框叠加
 */
import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "sm", children, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs active:shadow-none",
      secondary: "bg-secondary/70 text-secondary-foreground hover:bg-secondary border border-border/50 shadow-2xs",
      outline: "border border-border/70 bg-transparent hover:bg-muted/70 text-foreground",
      ghost: "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
      danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-xs active:shadow-none",
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
          "inline-flex items-center justify-center font-medium select-none focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
          "transition-all duration-150 ease-[var(--cds-btn-spring,cubic-bezier(0.32,0.72,0,1))] active:scale-[0.98]",
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
