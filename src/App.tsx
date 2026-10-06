import { useTranslation } from "react-i18next";
import { changeAppLanguage } from "@/i18n";
import { invoke } from "@tauri-apps/api/core";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { MiniModeView } from "@/components/MiniModeView";
import { TrayPopoverView } from "@/components/TrayPopoverView";
import { setWindowMode as apiSetWindowMode, isMouseButtonDown } from "@/services/api";
import { WindowMode } from "@/types/tunnel";
import { listen } from "@tauri-apps/api/event";
import { Tunnel, GroupDivider, SSHKeyInfo, ConfigurationTab, TunnelRuntimeStatus, TunnelState } from "@/types/tunnel";
import { fetchTunnels, saveTunnel, deleteTunnel as apiDeleteTunnel, fetchGroups, fetchSSHKeys, fetchRuntimeStatus, fetchKnownHosts, startTunnel as apiStartTunnel, stopTunnel as apiStopTunnel } from "@/services/api";
import { TitleBar } from "@/components/TitleBar";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
import { TunnelHeader } from "@/components/TunnelHeader";
import { Tabs } from "@/components/ui/Tabs";
import { GeneralTab } from "@/components/tabs/GeneralTab";
import { ConnectionTab } from "@/components/tabs/ConnectionTab";
import { AdvancedTab } from "@/components/tabs/AdvancedTab";
import { SourceEditor } from "@/components/SourceEditor";
import { KeysModal } from "@/components/KeysModal";
import { ImportCommandModal } from "@/components/ImportCommandModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { AboutModal } from "@/components/AboutModal";
import { UpdateModal } from "@/components/UpdateModal";
import { generateUUID } from "@/lib/utils";
import { Layers, Network } from "lucide-react";
import { playConnectSound, playDisconnectSound, playConflictSound, playConnectingSound, playConnectFailedSound } from "@/lib/sound";
import { sendNotification } from "@/lib/notification";
export function App() {
  const {
    t
  } = useTranslation();
  if (typeof window !== "undefined" && window.location.search.includes('view=tray')) {
    return <TrayPopoverView />;
  }
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [groups, setGroups] = useState<GroupDivider[]>([]);
  const [keys, setKeys] = useState<SSHKeyInfo[]>([]);
  const [knownHosts, setKnownHosts] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ConfigurationTab>("general");
  const [runtimeStatus, setRuntimeStatus] = useState<Record<string, TunnelRuntimeStatus>>({});
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [windowMode, setWindowModeState] = useState<WindowMode>(() => localStorage.getItem("tunnelflow:window_mode") as WindowMode || "mini");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("tunnelflow:sidebar_collapsed");
      if (saved !== null) return JSON.parse(saved) === true;
      if (typeof window !== "undefined" && window.innerWidth <= 1070) return true;
      return false;
    } catch {
      return typeof window !== "undefined" && window.innerWidth <= 1070;
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1050);
  const resizeHint = useMemo(() => {
    if (!isResizing) return null;
    if (windowMode === "full") {
      if (currentWidth < 750) {
        return {
          text: t("auto_2245"),
          isThreshold: true
        };
      } else if (currentWidth < 850) {
        return {
          text: t("auto_2246"),
          isThreshold: false
        };
      }
    } else if (windowMode === "mini") {
      if (currentWidth > 470) {
        return {
          text: t("auto_2247"),
          isThreshold: true
        };
      } else if (currentWidth > 375) {
        return {
          text: t("auto_2248"),
          isThreshold: false
        };
      }
    }
    return null;
  }, [isResizing, windowMode, currentWidth]);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isResizingRef = useRef(false);
  const isMouseDownRef = useRef(false);
  useEffect(() => {
    const unlisten = listen<string>("change-language", (event) => {
      changeAppLanguage(event.payload as "system" | "zh-CN" | "en");
    });
    return () => {
      unlisten.then(f => f());
    };
  }, []);

  useEffect(() => {
    // Initial sync
    const currentMode = localStorage.getItem("tunnelflow:window_mode") as WindowMode || "mini";
    apiSetWindowMode(currentMode);
  }, []);
  useEffect(() => {
    const performSnap = () => {
      if (!isResizingRef.current) return;
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      setIsResizing(false);
      isResizingRef.current = false;
      isMouseDownRef.current = false;
      const finalWidth = window.innerWidth;
      if (windowMode === "full") {
        if (finalWidth < 750) {
          setWindowModeState("mini");
          apiSetWindowMode("mini");
          try {
            localStorage.setItem("tunnelflow:window_mode", "mini");
          } catch {}
        } else if (finalWidth < 850) {
          apiSetWindowMode("full_min");
        }
      } else if (windowMode === "mini") {
        if (finalWidth > 470) {
          setWindowModeState("full");
          apiSetWindowMode("full");
          try {
            localStorage.setItem("tunnelflow:window_mode", "full");
          } catch {}
        } else if (finalWidth > 375) {
          apiSetWindowMode("mini_snap");
        }
      }
    };
    const checkRelease = async () => {
      if (!isResizingRef.current) return;
      try {
        const isDown = await isMouseButtonDown();
        if (isDown) {
          resizeTimeoutRef.current = setTimeout(checkRelease, 80);
          return;
        }
      } catch {
        resizeTimeoutRef.current = setTimeout(checkRelease, 500);
        return;
      }
      performSnap();
    };
    const handleResize = () => {
      setIsResizing(true);
      isResizingRef.current = true;
      isMouseDownRef.current = true;
      setCurrentWidth(window.innerWidth);
      if (windowMode === "full" && window.innerWidth <= 1070) {
        setIsSidebarCollapsed(true);
      }
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(checkRelease, 120);
    };
    const handleRelease = () => {
      if (isResizingRef.current) {
        performSnap();
      }
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRef.current && e.buttons === 0) {
        performSnap();
      }
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("pointerup", handleRelease, true);
    window.addEventListener("mouseup", handleRelease, true);
    document.addEventListener("pointerup", handleRelease, true);
    document.addEventListener("mouseup", handleRelease, true);
    window.addEventListener("pointermove", handleMouseMove, true);
    window.addEventListener("mousemove", handleMouseMove, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointerup", handleRelease, true);
      window.removeEventListener("mouseup", handleRelease, true);
      document.removeEventListener("pointerup", handleRelease, true);
      document.removeEventListener("mouseup", handleRelease, true);
      window.removeEventListener("pointermove", handleMouseMove, true);
      window.removeEventListener("mousemove", handleMouseMove, true);
    };
  }, [windowMode]);
  useEffect(() => {
    const unlisten = listen("window-reset-mini", () => {
      setWindowModeState("mini");
      localStorage.setItem("tunnelflow:window_mode", "mini");
    });
    return () => {
      unlisten.then(f => f());
    };
  }, []);
  useEffect(() => {
    const unlisten = listen("open-about", () => {
      setIsAboutModalOpen(true);
    });
    return () => {
      unlisten.then(f => f());
    };
  }, []);
  const [viewMode, setViewMode] = useState<"visual" | "source">("visual");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'error' | 'success';
  } | null>(null);
  const showToast = (message: string, type: 'error' | 'success' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current as any);
    setToast({
      message,
      type
    });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };
  const tunnelsRef = useRef(tunnels);
  tunnelsRef.current = tunnels;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tunnelflow:sidebar_width");
      if (saved !== null) {
        const parsed = Number(JSON.parse(saved));
        if (!isNaN(parsed) && parsed >= 200 && parsed <= 460) {
          return parsed;
        }
      }
      return 260;
    } catch {
      return 260;
    }
  });
  const [isKeysModalOpen, setIsKeysModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [tunnelToDelete, setTunnelToDelete] = useState<Tunnel | null>(null);
  useEffect(() => {
    const autoCheck = localStorage.getItem("tunnelflow:auto_check_update") !== "false";
    if (autoCheck) {
      invoke("check_for_updates").then((info: any) => {
        if (info && info.has_update) {
          setUpdateInfo(info);
          setIsUpdateModalOpen(true);
        }
      }).catch(console.error);
    }
  }, []);
  const toggleSidebar = React.useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("tunnelflow:sidebar_collapsed", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Shortcuts and Scale
  const [fontScale, setFontScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tunnelflow:font_scale");
      const parsed = parseFloat(saved || "1.0");
      if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.5) {
        return parsed;
      }
      return 1.0;
    } catch {
      return 1.0;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("tunnelflow:font_scale", fontScale.toString());
    } catch {}
    const applyFontScale = () => {
      const width = window.innerWidth;
      let baseSize = Math.min(Math.max(14, 14 + (width - 1300) * 0.005), 15.5);
      document.documentElement.style.fontSize = `${baseSize * fontScale}px`;
    };
    applyFontScale();
    let rAF = 0;
    const onResize = () => {
      cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(applyFontScale);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rAF);
    };
  }, [fontScale]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          (document.activeElement as HTMLElement)?.blur?.();
          setTimeout(() => {
            const targetTunnel = tunnelsRef.current.find(t => t.id === selectedIdRef.current);
            if (targetTunnel) {
              saveTunnel(targetTunnel);
              showToast(t("auto_2249"), "success");
            }
          }, 50);
        } else if (e.key === "b" || e.key === "B") {
          e.preventDefault();
          toggleSidebar();
        } else if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setFontScale(prev => Math.min(prev + 0.1, 2.5));
        } else if (e.key === "-") {
          e.preventDefault();
          setFontScale(prev => Math.max(prev - 0.1, 0.5));
        } else if (e.key === "0") {
          e.preventDefault();
          setFontScale(1.0);
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          fetchTunnels().then(setTunnels);
          fetchGroups().then(setGroups);
          fetchSSHKeys().then(setKeys);
          fetchKnownHosts().then(setKnownHosts);
          fetchRuntimeStatus().then(setRuntimeStatus);
        } else if (e.key === "w" || e.key === "W") {
          if (isKeysModalOpen || isImportModalOpen || tunnelToDelete || document.querySelector('[role="dialog"]')) {
            e.preventDefault();
            setIsKeysModalOpen(false);
            setIsImportModalOpen(false);
            setTunnelToDelete(null);
          } else {
            e.preventDefault();
            import("@tauri-apps/api/window").then(({
              getCurrentWindow
            }) => {
              getCurrentWindow().close();
            }).catch(() => {});
          }
        } else if (e.key === "m" || e.key === "M") {
          e.preventDefault();
          import("@tauri-apps/api/window").then(({
            getCurrentWindow
          }) => {
            getCurrentWindow().minimize();
          }).catch(() => {});
        } else if (e.key === "q" || e.key === "Q") {
          e.preventDefault();
          import("@tauri-apps/api/core").then(({ invoke }) => {
            invoke("exit_app").catch(() => {});
          }).catch(() => {});
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar, isKeysModalOpen, isImportModalOpen, tunnelToDelete, tunnels, selectedId]);

  // Initialize theme and ensure window is active
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    import("@tauri-apps/api/window").then(({
      getCurrentWindow
    }) => {
      const win = getCurrentWindow();
      win.unminimize().catch(() => {});
      win.show().catch(() => {});
      win.setFocus().catch(() => {});
    }).catch(() => {});
  }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Load initial data
  useEffect(() => {
    async function loadData() {
      const [tList, gList, kList, khList] = await Promise.all([fetchTunnels(), fetchGroups(), fetchSSHKeys(), fetchKnownHosts()]);
      try {
        const orderStr = localStorage.getItem("tunnelflow:tunnel_order");
        if (orderStr) {
          const order = JSON.parse(orderStr) as string[];
          const orderMap = new Map(order.map((id, idx) => [id, idx]));
          tList.sort((a, b) => {
            const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : -1;
            const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : -1;
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
        }
      } catch {}
      setTunnels(tList);
      setGroups(gList);
      setKeys(kList);
      setKnownHosts(khList);
      if (tList.length > 0 && !selectedId) {
        // Select first regular tunnel or first available
        const first = tList.find(t => !t.is_general_config) || tList[0];
        setSelectedId(first.id);
      }
    }
    loadData();
  }, []);

  // Poll runtime status
  // Poll runtime status
  const prevRuntimeStatusRef = useRef<Record<string, TunnelRuntimeStatus>>({});
  useEffect(() => {
    const handleStatusUpdate = (status: Record<string, TunnelRuntimeStatus>) => {
      setRuntimeStatus(prev => {
        const merged: Record<string, TunnelRuntimeStatus> = {
          ...status
        };
        if (tunnels.length > 0) {
          for (const t of tunnels) {
            if (status[t.id]) {
              merged[t.id] = status[t.id];
            } else if (prev[t.id]?.state?.toLowerCase() === "connecting") {
              merged[t.id] = prev[t.id];
            } else {
              merged[t.id] = {
                id: t.id,
                state: "disconnected"
              };
            }
          }
        } else {
          for (const [id, s] of Object.entries(prev)) {
            if (!merged[id] && s.state?.toLowerCase() === "connecting") {
              merged[id] = s;
            }
          }
        }

        // Trigger notifications
        const prevStatus = prevRuntimeStatusRef.current;
        for (const id in merged) {
          const curr = merged[id];
          const prevEntry = prevStatus[id];
          const currState = curr.state?.toLowerCase();
          const prevState = prevEntry?.state?.toLowerCase();
          if (currState === "connected" && prevState === "connecting") {
            try {
              playConnectSound();
            } catch (e) {
              console.debug(e);
            }
            const tName = tunnels.find(t => t.id === id)?.name || t("auto_2250");
            sendNotification(t("auto_2251"), t("notifications.connectedMsg", { name: tName, defaultValue: `${tName} 已成功连接` }));
          } else if (currState === "error" && (prevState === "connecting" || prevState === "connected")) {
            try {
              playConnectFailedSound();
            } catch (e) {
              console.debug(e);
            }
            const tName = tunnels.find(t => t.id === id)?.name || t("auto_2252");
            sendNotification(t("auto_2253"), curr.error_message || t("notifications.errorMsg", { name: tName, defaultValue: `${tName} 连接发生错误` }));
          }
        }
        prevRuntimeStatusRef.current = merged;
        return merged;
      });
    };
    const interval = setInterval(async () => {
      const status = await fetchRuntimeStatus();
      handleStatusUpdate(status);
    }, 2000);
    const unlistenPromise = listen("tunnel-status-changed", event => {
      handleStatusUpdate(event.payload as Record<string, TunnelRuntimeStatus>);
    });
    return () => {
      clearInterval(interval);
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [tunnels]);
  const currentTunnel = tunnels.find(t => t.id === selectedId) || null;

  // Save changes to tunnel
  const handleTunnelChange = (updated: Tunnel) => {
    setTunnels(prev => prev.map(t => t.id === updated.id ? updated : t));
    saveTunnel(updated);
  };

  // Add a new blank tunnel
  const handleAddTunnel = () => {
    const newTunnel: Tunnel = {
      id: generateUUID(),
      name: `${t("common.newHostPrefix", "新主机")}-${tunnels.length + 1}`,
      host: "root@192.168.1.100",
      port: 22,
      auto_connect: false,
      is_general_config: false,
      use_alias: false,
      forwards: [],
      custom_directives: []
    };
    setTunnels(prev => [...prev, newTunnel]);
    setSelectedId(newTunnel.id);
    saveTunnel(newTunnel);
  };

  // Add group
  const handleAddGroup = (customTitle?: string) => {
    const title = customTitle || prompt(t("auto_2254"));
    if (!title || !title.trim()) return;
    const newGroup: GroupDivider = {
      id: generateUUID(),
      title: title.trim()
    };
    setGroups(prev => [...prev, newGroup]);
  };

  // Duplicate tunnel
  const handleDuplicateTunnel = (id: string) => {
    const orig = tunnels.find(t => t.id === id);
    if (!orig) return;
    const copy: Tunnel = {
      ...JSON.parse(JSON.stringify(orig)),
      id: generateUUID(),
      name: `${orig.name}-副本`,
      forwards: orig.forwards.map(f => ({
        ...f,
        id: generateUUID()
      }))
    };
    setTunnels(prev => [...prev, copy]);
    setSelectedId(copy.id);
    saveTunnel(copy);
  };

  // Delete tunnel
  const handleDeleteTunnel = (id: string) => {
    const target = tunnels.find(t => t.id === id);
    if (!target) return;
    setTunnelToDelete(target);
  };
  const handleConfirmDelete = () => {
    if (!tunnelToDelete) return;
    const target = tunnelToDelete;
    setTunnelToDelete(null);
    setTunnels(prev => prev.filter(t => t.id !== target.id));
    apiDeleteTunnel(target.id, target.name);
    if (selectedId === target.id) {
      const remaining = tunnels.filter(t => t.id !== target.id);
      setSelectedId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Move tunnel up / down
  const persistOrder = (list: Tunnel[]) => {
    const orderedIds = list.map(t => t.id);
    try {
      localStorage.setItem("tunnelflow:tunnel_order", JSON.stringify(orderedIds));
    } catch {}
    import("@/services/api").then(api => {
      if (api.reorderTunnels) api.reorderTunnels(orderedIds);
    });
  };
  const handleMoveTunnel = (id: string, direction: "up" | "down") => {
    const idx = tunnels.findIndex(t => t.id === id);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= tunnels.length) return;
    const list = [...tunnels];
    const [moved] = list.splice(idx, 1);
    list.splice(targetIdx, 0, moved);
    setTunnels(list);
    persistOrder(list);
  };
  const handleReorderTunnels = (sourceId: string, targetId: string, position: 'before' | 'after') => {
    const list = [...tunnels];
    const sourceIdx = list.findIndex(t => t.id === sourceId);
    if (sourceIdx < 0) return;
    const [moved] = list.splice(sourceIdx, 1);
    let targetIdx = list.findIndex(t => t.id === targetId);
    if (targetIdx < 0) {
      list.splice(sourceIdx, 0, moved);
      persistOrder(list);
      return;
    }
    if (position === 'after') {
      targetIdx++;
    }
    const targetTunnel = tunnels.find(t => t.id === targetId);
    if (targetTunnel && targetTunnel.group !== moved.group) {
      moved.group = targetTunnel.group || undefined;
      saveTunnel(moved);
    }
    list.splice(targetIdx, 0, moved);
    setTunnels(list);
    persistOrder(list);
  };
  const handleMoveToGroup = (tunnelId: string, targetGroup: string | null) => {
    setTunnels(prev => prev.map(t => {
      if (t.id === tunnelId) {
        const updated = {
          ...t,
          group: targetGroup || undefined
        };
        saveTunnel(updated);
        return updated;
      }
      return t;
    }));
  };

  // Handle Connect / Disconnect

  const handleSaveTunnel = (updated: Tunnel) => {
    setTunnels(prev => prev.map(t => t.id === updated.id ? updated : t));
    saveTunnel(updated);
    showToast(t("auto_2255"), "success");
  };
  const handleConnect = async (id?: string) => {
    const targetId = typeof id === "string" && id ? id : selectedId;
    if (!targetId) return;
    const currentStatus = runtimeStatus[targetId]?.state?.toLowerCase();
    if (currentStatus === 'connecting' || currentStatus === 'connected') {
      return;
    }
    const targetTunnel = tunnels.find(t => t.id === targetId);
    if (targetTunnel) {
      const activeForwards = targetTunnel.forwards.filter(f => f.is_active);
      const usedPorts = new Set<number>();
      tunnels.forEach(t => {
        if (t.id !== targetId && runtimeStatus[t.id]?.state === "connected") {
          t.forwards.filter(f => f.is_active).forEach(f => usedPorts.add(f.port));
        }
      });
      const hasConflict = activeForwards.some(f => usedPorts.has(f.port));
      if (hasConflict) {
        try {
          playConflictSound();
        } catch (e) {
          console.debug(e);
        }
        sendNotification(t("auto_2256"), t("auto_2257"));
        showToast(t("auto_2258"), "error");
        return;
      }
    }
    try {
      playConnectingSound();
    } catch (e) {
      console.debug(e);
    }
    setRuntimeStatus(prev => ({
      ...prev,
      [targetId]: {
        id: targetId,
        state: "connecting"
      }
    }));
    try {
      await apiStartTunnel(targetId);
    } catch (err: any) {
      if (err?.message?.includes("already in use") || err?.message?.includes("bind")) {
        try {
          playConflictSound();
        } catch (e) {
          console.debug(e);
        }
        sendNotification(t("auto_2259"), t("auto_2260"));
        showToast(t("auto_2261"), "error");
      } else {
        sendNotification(t("auto_2262"), err?.message || t("auto_2263"));
        showToast(err?.message || t("auto_2264"), "error");
      }
      try {
        playConnectFailedSound();
      } catch (e) {
        console.debug(e);
      }
      setRuntimeStatus(prev => ({
        ...prev,
        [targetId]: {
          id: targetId,
          state: "disconnected"
        }
      }));
    }
  };
  const handleDisconnect = async (id?: string) => {
    const targetId = typeof id === "string" && id ? id : selectedId;
    if (!targetId) return;
    const currentStatus = runtimeStatus[targetId]?.state?.toLowerCase();
    if (currentStatus === 'disconnected' || !currentStatus) {
      return;
    }
    try {
      await apiStopTunnel(targetId);
      setRuntimeStatus(prev => ({
        ...prev,
        [targetId]: {
          id: targetId,
          state: "disconnected"
        }
      }));
      try {
        playDisconnectSound();
      } catch (e) {
        console.debug(e);
      }
      const targetTunnel = tunnels.find(t => t.id === targetId);
      sendNotification(t("auto_2265"), t("notifications.disconnectedMsg", { name: targetTunnel?.name || t("auto_2266"), defaultValue: `${targetTunnel?.name || t("auto_2266")} 已断开连接` }));
    } catch (err: any) {
      console.error("Failed to disconnect:", err);
    }
  };
  const connectedCount = Object.values(runtimeStatus).filter(s => s.state?.toLowerCase() === "connected").length;
  return <div className="relative h-full w-full overflow-hidden">
      {windowMode === "mini" ? <MiniModeView onAddGroup={handleAddGroup} tunnels={tunnels} groups={groups} runtimeStatus={runtimeStatus} onStartTunnel={handleConnect} onStopTunnel={handleDisconnect} onRefreshTunnels={async () => {
      const tList = await fetchTunnels();
      setTunnels(tList);
    }} onOpenAboutModal={() => setIsAboutModalOpen(true)} onSwitchToFull={() => {
      setWindowModeState("full");
      apiSetWindowMode("full");
      localStorage.setItem("tunnelflow:window_mode", "full");
    }} /> : <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground antialiased font-sans">
      {/* 1. Global Cross-Platform TitleBar */}
      <TitleBar theme={theme} onToggleTheme={toggleTheme} onOpenKeysModal={() => setIsKeysModalOpen(true)} onImportCommand={() => setIsImportModalOpen(true)} activeTunnelName={currentTunnel?.name} connectedCount={connectedCount} isSidebarCollapsed={isSidebarCollapsed} onToggleSidebar={toggleSidebar} viewMode={viewMode} onViewModeChange={setViewMode} onOpenAboutModal={() => setIsAboutModalOpen(true)} />

      {/* 2. Workspace Body */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Sidebar */}
        <Sidebar tunnels={tunnels} groups={groups} selectedId={selectedId} runtimeStatus={runtimeStatus} onSelect={id => {
          setSelectedId(id);
          const t = tunnels.find(x => x.id === id);
          if (t?.is_general_config && activeTab === "general") {
            setActiveTab("connection");
          }
        }} onAddTunnel={handleAddTunnel} onAddGroup={() => handleAddGroup()} onImportCommand={() => setIsImportModalOpen(true)} onDeleteTunnel={handleDeleteTunnel} onDuplicateTunnel={handleDuplicateTunnel} onMoveTunnel={handleMoveTunnel} onReorderTunnels={handleReorderTunnels} onMoveToGroup={handleMoveToGroup} onStartTunnel={handleConnect} onStopTunnel={handleDisconnect} theme={theme} onToggleTheme={toggleTheme} isCollapsed={isSidebarCollapsed} width={sidebarWidth} onWidthChange={setSidebarWidth} />

        {/* Main Content Area */}
        <main className="flex flex-1 flex-col h-full min-w-0 bg-background overflow-hidden">
        {currentTunnel ? <>
            {/* Tunnel Header Action Bar */}
            <TunnelHeader tunnel={currentTunnel} status={runtimeStatus[currentTunnel.id]?.state || "disconnected"} onConnect={() => currentTunnel && handleConnect(currentTunnel.id)} onDisconnect={() => currentTunnel && handleDisconnect(currentTunnel.id)} generalConfig={tunnels.find(t => t.is_general_config)} />

            {viewMode === "source" ? <div className="flex-1 p-6 overflow-hidden overflow-x-hidden min-w-0">
                <div className="w-full h-full min-w-0 max-w-5xl 2xl:max-w-6xl mx-auto">
                  <SourceEditor tunnel={currentTunnel} onChange={handleTunnelChange} onSave={handleSaveTunnel} generalConfig={tunnels.find(t => t.is_general_config)} />
                </div>
              </div> : <>
                {/* Segmented Tabs Navigation */}
                <Tabs activeTab={activeTab} onChange={setActiveTab} isGeneralConfig={currentTunnel.is_general_config} />

                {/* Tab Body View (Scrollable) */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 p-6">
                  <div className="w-full min-w-0 max-w-5xl 2xl:max-w-6xl mx-auto">
                    {activeTab === "general" && !currentTunnel.is_general_config && <GeneralTab tunnel={currentTunnel} groups={groups} onChange={handleTunnelChange} onAddGroup={handleAddGroup} allTunnels={tunnels} knownHosts={knownHosts} />}

                    {activeTab === "connection" && <ConnectionTab tunnel={currentTunnel} keys={keys} onChange={handleTunnelChange} onOpenKeysManager={() => setIsKeysModalOpen(true)} generalConfig={tunnels.find(t => t.is_general_config)} />}

                    {activeTab === "advanced" && <AdvancedTab tunnel={currentTunnel} onChange={handleTunnelChange} generalConfig={tunnels.find(t => t.is_general_config)} />}
                  </div>
                </div>
              </>}
          </> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Network className="h-12 w-12 stroke-[1.2] text-muted-foreground/40 mb-3" />
            <h2 className="text-sm font-semibold text-foreground">{t("auto_2267")}</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">{t("auto_1042")}</p>
          </div>}
      </main>
    </div>
    </div>}
      
      {/* Global Centered HUD: 上下左右居中 */}
      {resizeHint && <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center animate-in fade-in zoom-in-95 duration-100">
          <div className={cn("flex items-center gap-2.5 px-5 py-2.5 rounded-2xl shadow-2xl border backdrop-blur-xl text-xs font-semibold tracking-wide transition-all", resizeHint.isThreshold ? "bg-primary text-primary-foreground border-primary/60 shadow-primary/30 scale-105" : "bg-background/95 text-foreground border-border/80 shadow-black/20")}>
            <span>{resizeHint.text}</span>
          </div>
        </div>}

      {/* Resizing Overlay */}
      {isResizing && <div className="fixed inset-0 z-[999] pointer-events-none backdrop-blur-md bg-background/25 transition-opacity duration-200" />}

      {/* Modals */}
      <KeysModal isOpen={isKeysModalOpen} keys={keys} onClose={() => setIsKeysModalOpen(false)} />

      <ImportCommandModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={imported => {
      setTunnels(prev => [...prev, imported]);
      setSelectedId(imported.id);
      saveTunnel(imported);
    }} />


      {toast && <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border transition-all ${toast.type === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'} backdrop-blur-md font-medium text-sm`}>
          {toast.message}
        </div>}

      <DeleteConfirmModal isOpen={!!tunnelToDelete} tunnel={tunnelToDelete} onConfirm={handleConfirmDelete} onClose={() => setTunnelToDelete(null)} />
    
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} onCheckUpdate={async () => {
      try {
        const info: any = await invoke("check_for_updates");
        if (info && info.has_update) {
          setUpdateInfo(info);
          setIsUpdateModalOpen(true);
        }
      } catch (e) {
        console.error(e);
      }
    }} />
      <UpdateModal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} updateInfo={updateInfo} />
    </div>;
}
export default App;