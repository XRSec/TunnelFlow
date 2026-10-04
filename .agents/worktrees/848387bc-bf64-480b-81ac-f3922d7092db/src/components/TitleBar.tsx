import React from "react";
import {
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Shield,
  Download,
  Minus,
  Square,
  Copy,
  X,
  Radio,
  PanelLeft,
} from "lucide-react";
import {
  isMacOS,
  isWindows,
  isLinux,
  handleWindowDragOrMaximize,
  handleWindowDoubleClick,
  minimizeWindow,
  toggleWindowMaximize,
  closeWindow,
  useIsMaximized,
} from "@/lib/window";
import { cn } from "@/lib/utils";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import { useState } from "react";

import { SlidersHorizontal, Code2 } from "lucide-react";

export interface TitleBarProps {
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
  windowMode = "full",
  onSwitchMode,
}: TitleBarProps) {
  
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled());
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundEnabledState(next);
  };

  const isMaximized = useIsMaximized();
  const showWindowsControls = isWindows || isLinux;

  return (
    <header
      data-tauri-drag-region
      onMouseDown={handleWindowDragOrMaximize}
      onDoubleClick={handleWindowDoubleClick}
      className={cn(
        "flex h-10 w-full shrink-0 items-center justify-between border-b border-border/70 bg-card/85 backdrop-blur-md select-none transition-colors z-50",
        isMacOS ? "pl-[78px] pr-2.5" : "pl-3.5 pr-0"
      )}
    >
      {/* Left Slot: App Brand & Version */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 min-w-0"
      >
        {onToggleSidebar && (
          <button
            type="button"
            data-no-drag
            onClick={onToggleSidebar}
            className="drag-exclude inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title={isSidebarCollapsed ? "展开侧边栏 (⌘B / Ctrl+B)" : "收起侧边栏 (⌘B / Ctrl+B)"}
            aria-label={isSidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs font-bold text-[10px]">
          TF
        </div>
        <span className="font-semibold text-xs tracking-tight text-foreground truncate">
          TunnelFlow
        </span>
        <span className="rounded-full bg-muted/80 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground border border-border/50">
          v1.0
        </span>

        {connectedCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 ml-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
            <span>{connectedCount} 在线</span>
          </div>
        )}
      </div>

      {/* Center Slot: Draggable Middle with Optional Active Tunnel Indicator */}
      <div
        data-tauri-drag-region
        className="flex-1 h-full flex items-center justify-center px-4 overflow-hidden cursor-default"
      >
        {activeTunnelName && (
          <span className="text-[11px] text-muted-foreground/75 font-medium truncate max-w-xs pointer-events-none select-none">
            {activeTunnelName}
          </span>
        )}
      </div>

      {/* Right Slot: Quick Actions & Window Controls */}
      <div className="flex items-center h-full">
        {/* Quick Action Icons */}
        <div className="flex items-center gap-1 mr-1.5">

          


          {onViewModeChange && windowMode !== "mini" && (
            <div className="flex items-center bg-muted/50 rounded-md p-0.5 border border-border/40 mr-2" data-no-drag>
              <button
                type="button"
                onClick={() => onViewModeChange("visual")}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${viewMode === "visual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <SlidersHorizontal className="h-3 w-3" /> 可视化
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("source")}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${viewMode === "source" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Code2 className="h-3 w-3" /> 源码
              </button>
            </div>
          )}

          {windowMode === "full" && onSwitchMode && (
            <button
              type="button"
              data-no-drag
              onClick={onSwitchMode}
              className="drag-exclude inline-flex h-7 px-2 items-center justify-center gap-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer text-[10px] font-medium border border-border/40"
              title="切换到迷你模式 (Mini Mode)"
            >
              迷你模式
            </button>
          )}

          <button
            type="button"
            data-no-drag
            onClick={onImportCommand}
            className="drag-exclude inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="从剪贴板导入 SSH 命令"
            aria-label="导入 SSH 命令"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            data-no-drag
            onClick={onOpenKeysModal}
            className="drag-exclude inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title="SSH 密钥管理"
            aria-label="SSH 密钥管理"
          >
            <Shield className="h-3.5 w-3.5" />
          </button>

          
          <button
            type="button"
            data-no-drag
            onClick={toggleSound}
            className="drag-exclude inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title={soundEnabled ? "静音" : "开启声音"}
            aria-label="切换声音"
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </button>

          <button
            type="button"
            data-no-drag
            onClick={onToggleTheme}
            className="drag-exclude inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            title={theme === "dark" ? "切换为明亮模式" : "切换为暗色模式"}
            aria-label="切换主题"
          >
            {theme === "dark" ? (
              <Sun className="h-3.5 w-3.5" />
            ) : (
              <Moon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Windows / Linux Native Window Controls */}
        {showWindowsControls && (
          <div className="flex items-center h-full border-l border-border/50 ml-1">
            <button
              type="button"
              data-no-drag
              onClick={minimizeWindow}
              className="drag-exclude inline-flex h-full w-10 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="最小化"
              aria-label="最小化"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              data-no-drag
              onClick={toggleWindowMaximize}
              className="drag-exclude inline-flex h-full w-10 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title={isMaximized ? "还原" : "最大化"}
              aria-label={isMaximized ? "还原" : "最大化"}
            >
              {isMaximized ? (
                <Copy className="h-3 w-3" />
              ) : (
                <Square className="h-3 w-3" />
              )}
            </button>
            <button
              type="button"
              data-no-drag
              onClick={closeWindow}
              className="drag-exclude inline-flex h-full w-11 items-center justify-center text-muted-foreground hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
              title="关闭"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
