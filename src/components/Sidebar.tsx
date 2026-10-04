import React, { useState, useEffect } from "react";
import {
  Server,
  Plus,
  Search,
  X,
  Layers,
  FileCode,
  Globe,
  Settings,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Folder,
  FolderOpen,
  Sun,
  Moon,
  Shield,
  Download,
  
} from "lucide-react";
import { Tunnel, GroupDivider, TunnelRuntimeStatus, TunnelState } from "@/types/tunnel";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { StatusIndicator } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { handleWindowDragOrMaximize, isMacOS } from "@/lib/window";

const DND_TUNNEL_MIME = "application/x-tunnelflow-tunnel";

interface SidebarProps {
  tunnels: Tunnel[];
  groups: GroupDivider[];
  selectedId: string | null;
  runtimeStatus: Record<string, TunnelRuntimeStatus>;
  onSelect: (id: string) => void;
  onAddTunnel: () => void;
  onAddGroup: () => void;
  onImportCommand: () => void;
  onDeleteTunnel: (id: string) => void;
  onDuplicateTunnel: (id: string) => void;
  onMoveTunnel: (id: string, direction: "up" | "down") => void;
  onReorderTunnels?: (sourceId: string, targetId: string, position: "before" | "after") => void;
  onMoveToGroup?: (tunnelId: string, groupName: string | null) => void;
  onStartTunnel?: (id: string) => void;
  onStopTunnel?: (id: string) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  isCollapsed: boolean;
  width: number;
  onWidthChange: (width: number) => void;
}

export function Sidebar({
  tunnels,
  groups,
  selectedId,
  runtimeStatus,
  onSelect,
  onAddTunnel,
  onAddGroup,
  onImportCommand,
  onDeleteTunnel,
  onDuplicateTunnel,
  onMoveTunnel,
  onReorderTunnels,
  onMoveToGroup,
  onStartTunnel,
  onStopTunnel,
  theme,
  onToggleTheme,
  isCollapsed,
  width,
  onWidthChange,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTunnelId, setDraggedTunnelId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);
  const [dropGroup, setDropGroup] = useState<string | null>(null);
  const sidebarRef = React.useRef<HTMLElement>(null);
  const rafIdRef = React.useRef<number | null>(null);
  const dragListenersRef = React.useRef<{
    onMove: (e: MouseEvent) => void;
    onUp: (e: MouseEvent) => void;
  } | null>(null);
  const dndSessionRef = React.useRef<{
    tunnelId: string;
    startY: number;
    isDragging: boolean;
    cachedRects?: {
      type: 'tunnel' | 'group';
      id: string;
      top: number;
      bottom: number;
      height: number;
    }[];
  } | null>(null);
  const dndListenersRef = React.useRef<{
    onMove: (e: PointerEvent | MouseEvent) => void;
    onUp: (e: PointerEvent | MouseEvent) => void;
  } | null>(null);
  const hoveredDropRef = React.useRef<{ targetId?: string; position?: "before" | "after"; groupName?: string | null } | null>(null);
  const justDraggedRef = React.useRef<boolean>(false);
  const dragTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tunnelId: string;
  } | null>(null);

  // Unmount cleanup to prevent zombie listeners and stuck styles
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (dragListenersRef.current) {
        window.removeEventListener("mousemove", dragListenersRef.current.onMove);
        window.removeEventListener("mouseup", dragListenersRef.current.onUp);
        dragListenersRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      if (dndListenersRef.current) {
        window.removeEventListener("pointermove", dndListenersRef.current.onMove as any);
        window.removeEventListener("mousemove", dndListenersRef.current.onMove as any);
        window.removeEventListener("pointerup", dndListenersRef.current.onUp as any);
        window.removeEventListener("mouseup", dndListenersRef.current.onUp as any);
        dndListenersRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        let newWidth = moveEvent.clientX;
        if (sidebarRef.current) {
          const rect = sidebarRef.current.getBoundingClientRect();
          newWidth = moveEvent.clientX - rect.left;
        }
        const clamped = Math.min(Math.max(newWidth, 200), 460);
        onWidthChange(clamped);
      });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      let finalWidth = upEvent.clientX;
      if (sidebarRef.current) {
        const rect = sidebarRef.current.getBoundingClientRect();
        finalWidth = upEvent.clientX - rect.left;
      }
      const clamped = Math.min(Math.max(finalWidth, 200), 460);
      onWidthChange(clamped);
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (dragListenersRef.current) {
        window.removeEventListener("mousemove", dragListenersRef.current.onMove);
        window.removeEventListener("mouseup", dragListenersRef.current.onUp);
        dragListenersRef.current = null;
      }
    };

    dragListenersRef.current = { onMove: handleMouseMove, onUp: handleMouseUp };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWidthChange(260);
  };

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    document.addEventListener("click", handleCloseMenu);
    return () => document.removeEventListener("click", handleCloseMenu);
  }, []);

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  // Filter tunnels by search query
  const q = searchQuery.trim().toLowerCase();
  const filteredTunnels = tunnels.filter((t) => {
    if (!q) return true;
    const nameMatch = t.name.toLowerCase().includes(q);
    const hostMatch = t.host.toLowerCase().includes(q);
    const portMatch = t.forwards.some(
      (f) => f.port.toString().includes(q) || f.remote_port.toString().includes(q)
    );
    return nameMatch || hostMatch || portMatch;
  });

  // Separate Host * and regular tunnels
  const generalConfig = filteredTunnels.find((t) => t.is_general_config);
  const regularTunnels = filteredTunnels.filter((t) => !t.is_general_config);

  const UNGROUPED_DROP_KEY = "__INTERNAL_UNGROUPED__";

  // Group regular tunnels
  const groupsMap = new Map<string, { name: string, items: Tunnel[] }>();
  const ungrouped: Tunnel[] = [];

  groups.forEach((g) => {
    if (!groupsMap.has(g.title)) {
      groupsMap.set(g.title, { name: g.title, items: [] });
    }
  });

  regularTunnels.forEach((t) => {
    if (t.group) {
      if (!groupsMap.has(t.group)) {
        groupsMap.set(t.group, { name: t.group, items: [] });
      }
      groupsMap.get(t.group)!.items.push(t);
    } else {
      ungrouped.push(t);
    }
  });

  const flatGroups = Array.from(groupsMap.values());

  // Calculate live stats
  const connectedCount = Object.values(runtimeStatus).filter(
    (s) => s.state?.toLowerCase() === "connected"
  ).length;

  const renderTunnelItem = (tunnel: Tunnel) => {
    const isSelected = selectedId === tunnel.id;
    const status = runtimeStatus[tunnel.id]?.state?.toLowerCase() || "disconnected";

    // Summary of forwards: e.g. ":17892 → :7890"
    const activeForwards = tunnel.forwards.filter((f) => f.is_active);
    const forwardSummary =
      activeForwards.length > 0
        ? activeForwards[0].forward === "dynamic"
          ? `:${activeForwards[0].port} (SOCKS5)`
          : `:${activeForwards[0].port} → :${activeForwards[0].remote_port}`
        : null;

    return (

      <div
        key={tunnel.id}
        data-tunnel-id={tunnel.id}
        onPointerDown={(e) => {
          if (e.button !== 0 || tunnel.is_general_config) return;
          if (dndListenersRef.current) {
            window.removeEventListener("pointermove", dndListenersRef.current.onMove as any);
            window.removeEventListener("mousemove", dndListenersRef.current.onMove as any);
            window.removeEventListener("pointerup", dndListenersRef.current.onUp as any);
            window.removeEventListener("mouseup", dndListenersRef.current.onUp as any);
            dndListenersRef.current = null;
          }
          dndSessionRef.current = { tunnelId: tunnel.id, startY: e.clientY, isDragging: false };
          const handleMove = (moveEvent: PointerEvent | MouseEvent) => {
            const session = dndSessionRef.current;
            if (!session) return;
            if (!session.isDragging) {
              if (Math.abs(moveEvent.clientY - session.startY) > 4) {
                session.isDragging = true;
                setDraggedTunnelId(session.tunnelId);
                document.body.style.cursor = "grabbing";
                document.body.style.userSelect = "none";
                
                const cachedRects: { type: 'tunnel' | 'group'; id: string; top: number; bottom: number; height: number; }[] = [];
                const rows = document.querySelectorAll<HTMLElement>("[data-tunnel-id]");
                for (let i = 0; i < rows.length; i++) {
                  const r = rows[i];
                  const rect = r.getBoundingClientRect();
                  const tid = r.getAttribute("data-tunnel-id");
                  if (tid) cachedRects.push({ type: 'tunnel', id: tid, top: rect.top, bottom: rect.bottom, height: rect.height });
                }
                const groups = document.querySelectorAll<HTMLElement>("[data-group-name]");
                for (let i = 0; i < groups.length; i++) {
                  const g = groups[i];
                  const rect = g.getBoundingClientRect();
                  const gname = g.getAttribute("data-group-name");
                  if (gname) cachedRects.push({ type: 'group', id: gname, top: rect.top, bottom: rect.bottom, height: rect.height });
                }
                session.cachedRects = cachedRects;
              }
            }
            if (session.isDragging) {
              const clientY = moveEvent.clientY;
              let found = false;
              if (session.cachedRects) {
                for (let i = 0; i < session.cachedRects.length; i++) {
                  const t = session.cachedRects[i];
                  if (clientY >= t.top && clientY <= t.bottom) {
                    if (t.type === 'tunnel') {
                      if (t.id !== session.tunnelId) {
                        const pos = clientY < t.top + t.height / 2 ? "before" : "after";
                        hoveredDropRef.current = { targetId: t.id, position: pos };
                        setDropTarget(prev => (prev?.id === t.id && prev?.position === pos) ? prev : { id: t.id, position: pos });
                        setDropGroup(null);
                        found = true;
                        break;
                      }
                    } else {
                      hoveredDropRef.current = { groupName: t.id };
                      setDropGroup(prev => prev === t.id ? prev : t.id);
                      setDropTarget(null);
                      found = true;
                      break;
                    }
                  }
                }
              }
              if (!found) {
                hoveredDropRef.current = null;
                setDropTarget(null);
                setDropGroup(null);
              }
            }
          };
          const handleUp = (upEvent: PointerEvent | MouseEvent) => {
            const session = dndSessionRef.current;
            const hovered = hoveredDropRef.current;
            if (session?.isDragging) {
              justDraggedRef.current = true;
              if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
              dragTimerRef.current = setTimeout(() => {
                justDraggedRef.current = false;
                dragTimerRef.current = null;
              }, 100);
            }
            if (session?.isDragging && hovered) {
              if (hovered.targetId && hovered.targetId !== session.tunnelId) {
                onReorderTunnels?.(session.tunnelId, hovered.targetId, hovered.position!);
              } else if (hovered.groupName !== undefined) {
                onMoveToGroup?.(session.tunnelId, hovered.groupName === "__INTERNAL_UNGROUPED__" ? null : hovered.groupName);
              }
            }
            hoveredDropRef.current = null;
            setDraggedTunnelId(null);
            setDropTarget(null);
            setDropGroup(null);
            dndSessionRef.current = null;
            if (dndListenersRef.current) {
              window.removeEventListener("pointermove", dndListenersRef.current.onMove as any);
              window.removeEventListener("mousemove", dndListenersRef.current.onMove as any);
              window.removeEventListener("pointerup", dndListenersRef.current.onUp as any);
              window.removeEventListener("mouseup", dndListenersRef.current.onUp as any);
              dndListenersRef.current = null;
            }
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
          };
          dndListenersRef.current = { onMove: handleMove, onUp: handleUp };
          window.addEventListener("pointermove", handleMove as any);
          window.addEventListener("mousemove", handleMove as any);
          window.addEventListener("pointerup", handleUp as any);
          window.addEventListener("mouseup", handleUp as any);
        }}
        onMouseDown={(e) => {
          if (e.button !== 0 || tunnel.is_general_config) return;
          if (dndListenersRef.current) {
            window.removeEventListener("pointermove", dndListenersRef.current.onMove as any);
            window.removeEventListener("mousemove", dndListenersRef.current.onMove as any);
            window.removeEventListener("pointerup", dndListenersRef.current.onUp as any);
            window.removeEventListener("mouseup", dndListenersRef.current.onUp as any);
            dndListenersRef.current = null;
          }
          dndSessionRef.current = { tunnelId: tunnel.id, startY: e.clientY, isDragging: false };
          const handleMove = (moveEvent: PointerEvent | MouseEvent) => {
            const session = dndSessionRef.current;
            if (!session) return;
            if (!session.isDragging) {
              if (Math.abs(moveEvent.clientY - session.startY) > 4) {
                session.isDragging = true;
                setDraggedTunnelId(session.tunnelId);
                document.body.style.cursor = "grabbing";
                document.body.style.userSelect = "none";
                
                const cachedRects: { type: 'tunnel' | 'group'; id: string; top: number; bottom: number; height: number; }[] = [];
                const rows = document.querySelectorAll<HTMLElement>("[data-tunnel-id]");
                for (let i = 0; i < rows.length; i++) {
                  const r = rows[i];
                  const rect = r.getBoundingClientRect();
                  const tid = r.getAttribute("data-tunnel-id");
                  if (tid) cachedRects.push({ type: 'tunnel', id: tid, top: rect.top, bottom: rect.bottom, height: rect.height });
                }
                const groups = document.querySelectorAll<HTMLElement>("[data-group-name]");
                for (let i = 0; i < groups.length; i++) {
                  const g = groups[i];
                  const rect = g.getBoundingClientRect();
                  const gname = g.getAttribute("data-group-name");
                  if (gname) cachedRects.push({ type: 'group', id: gname, top: rect.top, bottom: rect.bottom, height: rect.height });
                }
                session.cachedRects = cachedRects;
              }
            }
            if (session.isDragging) {
              const clientY = moveEvent.clientY;
              let found = false;
              if (session.cachedRects) {
                for (let i = 0; i < session.cachedRects.length; i++) {
                  const t = session.cachedRects[i];
                  if (clientY >= t.top && clientY <= t.bottom) {
                    if (t.type === 'tunnel') {
                      if (t.id !== session.tunnelId) {
                        const pos = clientY < t.top + t.height / 2 ? "before" : "after";
                        hoveredDropRef.current = { targetId: t.id, position: pos };
                        setDropTarget(prev => (prev?.id === t.id && prev?.position === pos) ? prev : { id: t.id, position: pos });
                        setDropGroup(null);
                        found = true;
                        break;
                      }
                    } else {
                      hoveredDropRef.current = { groupName: t.id };
                      setDropGroup(prev => prev === t.id ? prev : t.id);
                      setDropTarget(null);
                      found = true;
                      break;
                    }
                  }
                }
              }
              if (!found) {
                hoveredDropRef.current = null;
                setDropTarget(null);
                setDropGroup(null);
              }
            }
          };
          const handleUp = (upEvent: PointerEvent | MouseEvent) => {
            const session = dndSessionRef.current;
            const hovered = hoveredDropRef.current;
            if (session?.isDragging) {
              justDraggedRef.current = true;
              if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
              dragTimerRef.current = setTimeout(() => {
                justDraggedRef.current = false;
                dragTimerRef.current = null;
              }, 100);
            }
            if (session?.isDragging && hovered) {
              if (hovered.targetId && hovered.targetId !== session.tunnelId) {
                onReorderTunnels?.(session.tunnelId, hovered.targetId, hovered.position!);
              } else if (hovered.groupName !== undefined) {
                onMoveToGroup?.(session.tunnelId, hovered.groupName === "__INTERNAL_UNGROUPED__" ? null : hovered.groupName);
              }
            }
            hoveredDropRef.current = null;
            setDraggedTunnelId(null);
            setDropTarget(null);
            setDropGroup(null);
            dndSessionRef.current = null;
            if (dndListenersRef.current) {
              window.removeEventListener("pointermove", dndListenersRef.current.onMove as any);
              window.removeEventListener("mousemove", dndListenersRef.current.onMove as any);
              window.removeEventListener("pointerup", dndListenersRef.current.onUp as any);
              window.removeEventListener("mouseup", dndListenersRef.current.onUp as any);
              dndListenersRef.current = null;
            }
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
          };
          dndListenersRef.current = { onMove: handleMove, onUp: handleUp };
          window.addEventListener("pointermove", handleMove as any);
          window.addEventListener("mousemove", handleMove as any);
          window.addEventListener("pointerup", handleUp as any);
          window.addEventListener("mouseup", handleUp as any);
        }}
        onDoubleClick={() => {
           if (tunnel.is_general_config) return;
           if (!activeForwards || activeForwards.length === 0) return;
           if (status === "connected") {
             onStopTunnel?.(tunnel.id);
           } else {
             onStartTunnel?.(tunnel.id);
           }
        }}
        title={!activeForwards || activeForwards.length === 0 ? "未配置端口转发，无法启动" : undefined}
        onClick={() => {
          if (justDraggedRef.current) return;
          onSelect(tunnel.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onSelect(tunnel.id);
          setContextMenu({
            x: Math.min(e.clientX, window.innerWidth - 180),
            y: Math.min(e.clientY, window.innerHeight - 200),
            tunnelId: tunnel.id,
          });
        }}
        className={cn(
          "group flex items-center justify-between gap-1.5 rounded-lg px-1.5 py-2 text-xs transition-all relative",
          !tunnel.is_general_config && "cursor-grab active:cursor-grabbing",
          isSelected
            ? "bg-primary/10 text-primary dark:bg-primary/15 font-medium border-l-2 border-primary"
            : "hover:bg-muted/60 text-foreground border-l-2 border-transparent",
          draggedTunnelId === tunnel.id && "opacity-40"
        )}
      >
        {dropTarget?.id === tunnel.id && draggedTunnelId !== tunnel.id && (
          <div
            className={cn(
              "absolute left-0 right-0 h-[2px] bg-primary z-30 pointer-events-none",
              dropTarget.position === "before" ? "-top-[1px]" : "-bottom-[1px]"
            )}
          >
            <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
            <div className="absolute -right-1 -top-[3px] w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
          </div>
        )}
        <div className={cn("flex items-center gap-2 min-w-0 flex-1 cursor-pointer", draggedTunnelId !== null && "pointer-events-none")}>
          <div
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
              isSelected
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-border/70 bg-card text-muted-foreground"
            )}
          >
            <PlatformIcon tunnel={tunnel} className="h-3.5 w-3.5" />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="truncate font-medium leading-snug">
                {tunnel.name}
              </span>
              <StatusIndicator
                state={status as TunnelState}
                className={isSelected ? "ring-1 ring-white/60" : ""}
              />
            </div>
            <div className="flex items-center justify-between gap-1 text-[11px] opacity-75 mt-0.5">
              <span className={cn("truncate font-mono flex-1 min-w-0", status === "error" && "text-red-500")} title={status === "error" ? runtimeStatus[tunnel.id]?.error_message : undefined}>
                {status === "error" && runtimeStatus[tunnel.id]?.error_message ? runtimeStatus[tunnel.id]?.error_message : (tunnel.host.replace(/^.*@/, "") || tunnel.name)}
              </span>
              {forwardSummary && (
                <span className="font-mono tabular-nums text-xs shrink-0 max-w-[120px] truncate font-medium ml-1">
                  {forwardSummary}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside
      ref={sidebarRef}
      style={{
        width: isCollapsed ? 0 : width,
        minWidth: isCollapsed ? 0 : undefined,
        maxWidth: isCollapsed ? 0 : undefined,
      }}
      className={cn(
        "relative flex flex-col h-full shrink-0 border-r border-border/70 bg-secondary/50 backdrop-blur-xs select-none overflow-hidden",
        !isDragging && "transition-all duration-200 ease-in-out",
        isCollapsed && "border-r-0 pointer-events-none opacity-0"
      )}
    >
      <div
        style={{ width }}
        className="flex flex-col h-full shrink-0"
      >
        {/* Sidebar Header: Section Title & Add / Group / Import / Collapse Actions */}
        <div className="flex h-10 items-center justify-between px-3 border-b border-border/40 select-none">
          <span className="font-semibold text-xs text-foreground tracking-tight flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-primary" />
            <span>主机隧道</span>
          </span>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onAddTunnel}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="添加主机隧道"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            
            <button
              type="button"
              onClick={onImportCommand}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title="从剪贴板导入 SSH 命令"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            
          </div>
        </div>

      {/* Search Input */}
      <div className="px-3 pb-2">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="搜索隧道、主机或端口..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 w-full rounded-md border border-input/70 bg-background/50 pl-8 pr-7 text-xs shadow-2xs placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>
            {connectedCount} 已连接 · 共 {regularTunnels.length} 个
          </span>
        </div>
      </div>

      {/* Tunnel List */}
      <div 
        className="flex-1 overflow-y-auto px-2 space-y-2"
      >
        {/* Global Config (Host *) */}
        {generalConfig && (
          <div
            onClick={() => onSelect(generalConfig.id)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all cursor-pointer select-none",
              selectedId === generalConfig.id
                ? "bg-primary text-primary-foreground shadow-xs font-medium"
                : "hover:bg-muted/60 text-foreground"
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                selectedId === generalConfig.id
                  ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                  : "border-border/70 bg-card text-muted-foreground"
              )}
            >
              <Shield className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate font-medium leading-snug">全局配置 (Host *)</span>
              <span className="truncate text-[10px] opacity-75">所有主机的默认继承值</span>
            </div>
          </div>
        )}

        {/* Grouped Tunnels */}
        {flatGroups.map((group) => {
          const isCollapsed = collapsedGroups[group.name];
          const totalCount = group.items.length;
          
          return (
            <div key={group.name} className="space-y-1 pt-1">
              <div
                onClick={() => toggleGroupCollapse(group.name)}
                data-group-name={group.name}
                className={cn(
                  "flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors rounded-sm",
                  dropGroup === group.name ? "bg-primary/10 border border-primary/50 text-foreground" : ""
                )}
              >
                <div className="flex items-center gap-1.5">
                  {isCollapsed ? (
                    <Folder className="h-3.5 w-3.5 text-primary/70" />
                  ) : (
                    <FolderOpen className="h-3.5 w-3.5 text-primary/70" />
                  )}
                  <span>{group.name}</span>
                </div>
                <span className="text-[10px] font-mono opacity-60">
                  {totalCount}
                </span>
              </div>
              {!isCollapsed && (
                <div className="space-y-1 pl-1">
                  {group.items.map(renderTunnelItem)}
                </div>
              )}
            </div>
          );
        })}

        {/* Ungrouped Tunnels */}
        {ungrouped.length > 0 && (
          <div className="space-y-1 pt-1">
            {flatGroups.length > 0 && (              <div
                data-group-name={UNGROUPED_DROP_KEY}
                className={cn(
                  "px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors rounded-sm",
                  dropGroup === UNGROUPED_DROP_KEY ? "bg-primary/10 border border-primary/50 text-foreground" : ""
                )}
              >
                未分组
              </div>
            )}
            {ungrouped.map(renderTunnelItem)}
          </div>
        )}

        {regularTunnels.length === 0 && !generalConfig && (
          <div 
            data-group-name={UNGROUPED_DROP_KEY}
            className={cn("py-8 text-center text-xs text-muted-foreground rounded-sm transition-colors", dropGroup === UNGROUPED_DROP_KEY ? "bg-primary/10 border border-primary/50" : "")}
          >
            没有匹配的隧道
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between border-t border-border/70 px-3 py-2 text-muted-foreground bg-muted/20">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => selectedId && onMoveTunnel(selectedId, "up")}
            className="rounded-md p-1 hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 cursor-pointer"
            title="上移"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => selectedId && onMoveTunnel(selectedId, "down")}
            className="rounded-md p-1 hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 cursor-pointer"
            title="下移"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => selectedId && onDuplicateTunnel(selectedId)}
            className="rounded-md p-1 hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 cursor-pointer"
            title="复制副本"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={!selectedId}
            onClick={() => selectedId && onDeleteTunnel(selectedId)}
            className="rounded-md p-1 hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30 cursor-pointer"
            title="删除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-md p-1 hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          title="切换深色/浅色模式"
        >
          {theme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      </div>

      {/* Splitter resize handle on the right edge */}
      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          className="absolute top-0 right-0 bottom-0 w-[4px] cursor-col-resize z-20 group hover:bg-primary/50 active:bg-primary transition-colors"
          title="拖动调整侧边栏宽度，双击恢复默认"
        >
          <div className="w-full h-full opacity-0 group-hover:opacity-100 group-hover:bg-primary/40 group-active:bg-primary transition-all" />
        </div>
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-44 rounded-lg border border-border/80 bg-popover/95 p-1 shadow-xl backdrop-blur-md text-xs space-y-0.5 animate-in fade-in-50 zoom-in-95 duration-75 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onDuplicateTunnel(contextMenu.tunnelId);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded text-foreground hover:bg-muted/80 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            <span>创建副本</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onMoveTunnel(contextMenu.tunnelId, "up");
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded text-foreground hover:bg-muted/80 cursor-pointer"
          >
            <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span>上移</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onMoveTunnel(contextMenu.tunnelId, "down");
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded text-foreground hover:bg-muted/80 cursor-pointer"
          >
            <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
            <span>下移</span>
          </button>

          <div className="my-1 border-t border-border/40" />

          <button
            type="button"
            onClick={() => {
              const id = contextMenu.tunnelId;
              setContextMenu(null);
              onDeleteTunnel(id);
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 rounded text-destructive hover:bg-destructive/10 cursor-pointer font-medium"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
            <span>删除此配置...</span>
          </button>
        </div>
      )}
    </aside>
  );
}
