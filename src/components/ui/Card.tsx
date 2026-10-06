import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfigurationCardProps {
 title?: React.ReactNode;
 icon?: React.ReactNode;
 headerAction?: React.ReactNode;
 summary?: React.ReactNode;
 footer?: React.ReactNode;
 defaultExpanded?: boolean;
 collapsible?: boolean;
 children: React.ReactNode;
 className?: string;
}

export function ConfigurationCard({

 title,
 icon,
 headerAction,
 summary,
 footer,
 defaultExpanded = true,
 collapsible = true,
 children,
 className,
}: ConfigurationCardProps) {
 const { t } = useTranslation();
 const [isExpanded, setIsExpanded] = useState(defaultExpanded);

 return (
 <div
 className={cn(
 "rounded-xl border border-border/80 bg-card p-4 text-card-foreground shadow-xs transition-all duration-200",
 className
 )}
 >
 {/* Header */}
 {title && (
 <div
 className={cn(
 "flex items-center justify-between gap-2 ",
 collapsible && "cursor-pointer"
 )}
 onClick={() => collapsible && setIsExpanded(!isExpanded)}
 >
 <div className="flex items-center gap-2 font-medium text-sm text-foreground">
 {icon && <span className="text-muted-foreground">{icon}</span>}
 <span>{title}</span>
 </div>

 <div className="flex items-center gap-2">
 {headerAction && (
 <div onClick={(e) => e.stopPropagation()}>{headerAction}</div>
 )}
 {collapsible && (
 <button
 type="button"
 className="rounded-md p-1 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors"
 aria-label={isExpanded ? t("common.collapse", "收起") : t("common.expand", "展开")}
 >
 {isExpanded ? (
 <ChevronDown className="h-4 w-4" />
 ) : (
 <ChevronRight className="h-4 w-4" />
 )}
 </button>
 )}
 </div>
 </div>
 )}

 {/* Collapsed Summary */}
 {collapsible && !isExpanded && summary && (
 <div
 className="mt-2 text-xs text-muted-foreground cursor-pointer"
 onClick={() => setIsExpanded(true)}
 >
 {summary}
 </div>
 )}

 {/* Expanded Content */}
 {(!collapsible || isExpanded) && (
 <>
 {title && <div className="my-3 border-t border-dashed border-border/70" />}
 <div className="space-y-4">{children}</div>
 {footer && (
 <div className="mt-3 text-xs text-muted-foreground leading-relaxed">
 {footer}
 </div>
 )}
 </>
 )}
 </div>
 );
}

export function DashedDivider({ className }: { className?: string }) {
 return <div className={cn("my-2 border-t border-dashed border-border/70", className)} />;
}
