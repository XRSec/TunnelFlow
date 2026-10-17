/**
 * SegmentedControl (999px Full-Pill Sliding Track)
 *
 * 逆向设计源自 Claude Design System (CDS / open-claude-ui, MIT License by Caho1):
 * - 999px 全圆角外轨 (rounded-full)
 * - 2px 严格几何内边距 (p-[2px])
 * - 纯几何等分滑动定位指示器，配合 150ms cubic-bezier(0.32, 0.72, 0, 1) 瞬时咬合动效
 * - 容器查询自适应 (@[max-width:254px]:hidden)
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedTabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SegmentedControlProps {
  tabs: (string | SegmentedTabItem)[];
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (value: string, index: number) => void;
  size?: "sm" | "md";
  className?: string;
}

export function SegmentedControl({
  tabs,
  value,
  defaultValue,
  onChange,
  size = "sm",
  className = "",
}: SegmentedControlProps) {
  const normalizedTabs: SegmentedTabItem[] = tabs.map((tab, idx) =>
    typeof tab === "string" ? { id: String(idx), label: tab } : tab
  );

  const [internalIndex, setInternalIndex] = useState(() => {
    if (defaultValue !== undefined) {
      const idx = normalizedTabs.findIndex(
        (t) => t.id === defaultValue || t.label === defaultValue
      );
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const activeIndex =
    value !== undefined
      ? normalizedTabs.findIndex((t) => t.id === value || t.label === value)
      : internalIndex;

  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

  const handleSelect = (idx: number) => {
    if (value === undefined) {
      setInternalIndex(idx);
    }
    const selectedTab = normalizedTabs[idx];
    onChange?.(selectedTab.id, idx);
  };

  const isSmall = size === "sm";
  const total = normalizedTabs.length;

  return (
    <div
      className={cn(
        "relative rounded-full select-none flex items-stretch p-[2px] transition-colors border border-border/50 bg-muted/50",
        isSmall ? "h-7 text-xs" : "h-8 text-xs",
        className
      )}
      style={{
        containerType: "inline-size",
      }}
      role="tablist"
    >
      {/* 纯几何等分滑动滑块 (零额外重依赖，150ms 瞬时咬合) */}
      <div
        className="absolute top-[2px] bottom-[2px] rounded-full bg-background pointer-events-none transition-all duration-150 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-2xs border border-border/60"
        style={{
          left: `calc(2px + ${safeIndex} * (100% - 4px) / ${total})`,
          width: `calc((100% - 4px) / ${total})`,
        }}
      />

      {/* 标签项 */}
      {normalizedTabs.map((tab, idx) => {
        const isActive = safeIndex === idx;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleSelect(idx)}
            className={cn(
              "relative z-10 flex-1 h-full flex items-center justify-center gap-1.5 px-3 rounded-full transition-colors truncate font-medium cursor-pointer",
              isActive
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            {tab.icon && (
              <span className="shrink-0 flex items-center justify-center text-current">
                {tab.icon}
              </span>
            )}

            <span className="truncate">
              {tab.label}
            </span>

            {tab.badge !== undefined && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-muted text-[10px] font-mono leading-tight border border-border/50">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
