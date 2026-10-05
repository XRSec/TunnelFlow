import { useTranslation } from "react-i18next";
import React from "react";
import { Volume2, VolumeX, Sun, Moon, Shield, Minus, Square, Copy, X, PanelLeft, Info } from "lucide-react";
import { isMacOS, isWindows, isLinux, handleWindowDragOrMaximize, handleWindowDoubleClick, minimizeWindow, toggleWindowMaximize, closeWindow, useIsMaximized } from "@/lib/window";
import { cn } from "@/lib/utils";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import { useState } from "react";
import { SlidersHorizontal, Code2 } from "lucide-react";
interface TitleBarProps {
  onOpenAboutModal?: () => void;
  windowMode?: "mini" | "full";
  onSwitchMode?: () => void;
  viewMode?: "visual" | "source";
  onViewModeChange?: (mode: "visual" | "source") => void;
  theme?: "dark" | "light";
  onToggleTheme?: () => void;
  onOpenKeysModal?: () => void;
  onImportCommand?: () => void;
  activeTunnelName?: string;
  connectedCount?: number;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}
export function TitleBar({
  theme = "light",
  onToggleTheme,
  onOpenKeysModal,
  onImportCommand,
  activeTunnelName,
  connectedCount = 0,
  isSidebarCollapsed,
  onToggleSidebar,
  viewMode,
  onViewModeChange,
  onOpenAboutModal,
  windowMode = "full",
  onSwitchMode
}: TitleBarProps) {
  const {
    t
  } = useTranslation();
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled());
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundEnabledState(next);
  };
  const isMaximized = useIsMaximized();
  const showWindowsControls = isWindows || isLinux;
  return <header data-tauri-drag-region onMouseDown={handleWindowDragOrMaximize} onDoubleClick={handleWindowDoubleClick} className={cn("flex h-10 w-full shrink-0 items-center justify-between border-b border-border/70 bg-card/85 backdrop-blur-md select-none transition-colors z-50", isMacOS ? "pl-[78px] pr-2.5" : "pl-3.5 pr-0")}>
      {/* Left Slot: App Brand & Version */}
      <div data-tauri-drag-region className="flex items-center gap-2 min-w-0">
        {onToggleSidebar && <button type="button" data-no-drag onClick={onToggleSidebar} className="drag-exclude inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" title={isSidebarCollapsed ? t("auto_2000") : t("auto_2001")} aria-label={isSidebarCollapsed ? t("auto_2002") : t("auto_2003")}>
            <PanelLeft className="h-3.5 w-3.5" />
          </button>}
        <button type="button" data-no-drag onClick={onOpenAboutModal} className={cn("flex items-center gap-2 px-1 py-0.5 -ml-1 select-none drag-exclude rounded-md transition-colors", onOpenAboutModal && "cursor-pointer hover:bg-muted/60 active:scale-95")} title={t("auto_2004")}>
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs font-bold text-[10px]">{t("auto_1000")}</div>
          <span className="font-semibold text-xs tracking-tight text-foreground truncate">{t("auto_1001")}</span>
          <span className="rounded-full bg-muted/80 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground border border-border/50">{t("auto_1002")}</span>
        </button>

        {connectedCount > 0 && <div className="hidden sm:flex items-center gap-1.5 ml-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
            <span>{connectedCount}{t("auto_2005")}</span>
          </div>}
      </div>

      {/* Center Slot: Draggable Middle with Optional Active Tunnel Indicator */}
      <div data-tauri-drag-region className="flex-1 h-full flex items-center justify-center px-4 overflow-hidden cursor-default">
        {activeTunnelName && <span className="text-[11px] text-muted-foreground/75 font-medium truncate max-w-xs pointer-events-none select-none">
            {activeTunnelName}
          </span>}
      </div>

      {/* Right Slot: Quick Actions & Window Controls */}
      <div className="flex items-center h-full">
        {/* Quick Action Icons */}
        <div className="flex items-center gap-1 mr-1.5">

          


          {onViewModeChange && windowMode !== "mini" && <div className="flex items-center bg-muted/50 rounded-md p-0.5 border border-border/40 mr-2" data-no-drag>
              <button type="button" onClick={() => onViewModeChange("visual")} className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${viewMode === "visual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <SlidersHorizontal className="h-3 w-3" />{t("common.visual", "可视化")}</button>
              <button type="button" onClick={() => onViewModeChange("source")} className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${viewMode === "source" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <Code2 className="h-3 w-3" />{t("common.source", "源码")}</button>
            </div>}

          {windowMode === "full" && onSwitchMode && <button type="button" data-no-drag onClick={onSwitchMode} className="drag-exclude inline-flex h-7 px-2 items-center justify-center gap-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer text-[10px] font-medium border border-border/40" title={t("auto_2008")}>{t("auto_2009")}</button>}



          {windowMode !== "mini" && onOpenKeysModal && <button type="button" data-no-drag onClick={onOpenKeysModal} className="drag-exclude inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" title={t("auto_2010")} aria-label={t("auto_2011")}>
              <Shield className="h-3.5 w-3.5" />
            </button>}

          
          

          <button type="button" data-no-drag onClick={onOpenAboutModal} className="drag-exclude inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" title={t("auto_2012")} aria-label={t("auto_2013")}>
            <Info className="h-3.5 w-3.5" />
          </button>
          <button type="button" data-no-drag onClick={toggleSound} className="drag-exclude inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" title={soundEnabled ? t("auto_2014") : t("auto_2015")} aria-label={t("auto_2016")}>
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          <button type="button" data-no-drag onClick={onToggleTheme} className="drag-exclude inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" title={theme === "dark" ? t("auto_2017") : t("auto_2018")} aria-label={t("auto_2019")}>
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Windows / Linux Native Window Controls */}
        {showWindowsControls && <div className="flex items-center h-full border-l border-border/50 ml-1">
            <button type="button" data-no-drag onClick={minimizeWindow} className="drag-exclude inline-flex h-full w-10 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" title={t("auto_2020")} aria-label={t("auto_2021")}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button type="button" data-no-drag onClick={toggleWindowMaximize} className="drag-exclude inline-flex h-full w-10 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer" title={isMaximized ? t("auto_2022") : t("auto_2023")} aria-label={isMaximized ? t("auto_2024") : t("auto_2025")}>
              {isMaximized ? <Copy className="h-3 w-3" /> : <Square className="h-3 w-3" />}
            </button>
            <button type="button" data-no-drag onClick={closeWindow} className="drag-exclude inline-flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-red-600 hover:text-white transition-colors cursor-pointer" title={t("auto_2026")} aria-label={t("auto_2027")}>
              <X className="h-4 w-4" />
            </button>
          </div>}
      </div>
    </header>;
}