import React, { useEffect, useRef, useState } from "react";
import { Tunnel, GroupDivider, TunnelRuntimeStatus } from "@/types/tunnel";
import { fetchTunnels, fetchGroups, fetchRuntimeStatus, startTunnel as apiStartTunnel, stopTunnel as apiStopTunnel } from "@/services/api";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { AppWindow, Power, Info } from "lucide-react";
import { playConnectSound, playDisconnectSound, playConnectingSound, playConnectFailedSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export function TrayPopoverView() {
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [groups, setGroups] = useState<GroupDivider[]>([]);
  const [runtimeStatus, setRuntimeStatus] = useState<Record<string, TunnelRuntimeStatus>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Load data
  useEffect(() => {
    async function loadData() {
      const [tList, gList, status] = await Promise.all([
        fetchTunnels(),
        fetchGroups(),
        fetchRuntimeStatus(),
      ]);
      setTunnels(tList);
      setGroups(gList);
      setRuntimeStatus(status);
    }
    loadData();
  }, []);

  // Poll runtime status
    // Poll runtime status
  const prevRuntimeStatusRef = useRef<Record<string, TunnelRuntimeStatus>>({});
  useEffect(() => {
    const handleStatusUpdate = (status: Record<string, TunnelRuntimeStatus>) => {
      setRuntimeStatus((prev) => {
        const merged: Record<string, TunnelRuntimeStatus> = { ...status };
        if (tunnels.length > 0) {
          for (const t of tunnels) {
            if (status[t.id]) {
              merged[t.id] = status[t.id];
            } else if (prev[t.id]?.state?.toLowerCase() === "connecting") {
              merged[t.id] = prev[t.id];
            } else {
              merged[t.id] = { id: t.id, state: "disconnected" };
            }
          }
        } else {
          for (const [id, s] of Object.entries(prev)) {
            if (!merged[id] && s.state?.toLowerCase() === "connecting") {
              merged[id] = s;
            }
          }
        }
        
        // Trigger sounds
        const prevStatus = prevRuntimeStatusRef.current;
        for (const id in merged) {
          const curr = merged[id];
          const prevEntry = prevStatus[id];
          const currState = curr.state?.toLowerCase();
          const prevState = prevEntry?.state?.toLowerCase();
          
          if (currState === "connected" && prevState === "connecting") {
            playConnectSound();
          } else if (currState === "error" && (prevState === "connecting" || prevState === "connected")) {
            playConnectFailedSound();
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

    const unlistenPromise = listen("tunnel-status-changed", (event) => {
      handleStatusUpdate(event.payload as Record<string, TunnelRuntimeStatus>);
    });

    return () => {
      clearInterval(interval);
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [tunnels]);

  // Make html/body transparent
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "tray-transparent-style";
    style.innerHTML = `
      html, body, #root {
        background: transparent !important;
        background-color: transparent !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById("tray-transparent-style");
      if (el) el.remove();
    };
  }, []);

  // Update window size
  const lastHeightRef = useRef(0);
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        let cardHeight = entry.target.scrollHeight;
        let totalHeight = cardHeight + 12; // 6px padding top/bottom
        totalHeight = Math.max(160, Math.min(totalHeight, 520));
        
        if (Math.abs(totalHeight - lastHeightRef.current) > 4) {
          lastHeightRef.current = totalHeight;
          invoke('resize_tray_window', { height: totalHeight });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [tunnels.length]);

  const handleToggle = async (id: string, currentlyConnectingOrConnected: boolean) => {
    if (currentlyConnectingOrConnected) {
      await apiStopTunnel(id);
      setRuntimeStatus((prev) => ({ ...prev, [id]: { id, state: "disconnected" } }));
      playDisconnectSound();
    } else {
      setRuntimeStatus((prev) => ({ ...prev, [id]: { id, state: "connecting" } }));
      playConnectingSound();
      try {
        await apiStartTunnel(id);
      } catch (err) {
        playConnectFailedSound();
        setRuntimeStatus((prev) => ({ ...prev, [id]: { id, state: "error" } }));
      }
    }
  };

  const forwardingTunnels = tunnels.filter(t => t.forwards.some(f => f.is_active));

  return (
    <div className="w-full h-auto min-h-screen bg-transparent p-1.5 flex items-start justify-center">
      <div 
        ref={containerRef} 
        className="w-full bg-[#e7e8e7] dark:bg-[#282828] border border-[#d0d1d0] dark:border-[#3a3a3a] shadow-[0_12px_32px_rgba(0,0,0,0.18)] rounded-[12px] text-foreground select-none overflow-hidden text-sm flex flex-col h-auto"
      >
        <div className="flex-1 overflow-y-auto p-1.5 pb-0 max-h-[420px]">
          {forwardingTunnels.length === 0 ? (
            <div className="py-4 text-center text-[#6e6e73] dark:text-[#9e9ea3] text-[13px]">暂无已配置转发的隧道</div>
          ) : (
            <div className="space-y-0.5">
              {groups.length > 0 ? (
                 groups.map(group => {
                   const groupTunnels = forwardingTunnels.filter(t => t.group === group.title);
                   if (groupTunnels.length === 0) return null;
                   return (
                     <div key={group.id} className="mb-2">
                       <div className="px-2 py-1 text-[10px] font-medium tracking-wider text-[#6e6e73] dark:text-[#9e9ea3] uppercase">
                         {group.title}
                       </div>
                       {groupTunnels.map(tunnel => {
                         const status = runtimeStatus[tunnel.id]?.state?.toLowerCase() || 'disconnected';
                         const errorMsg = runtimeStatus[tunnel.id]?.error_message;
                         const isConnectingOrConnected = status === 'connecting' || status === 'connected';
                         const ports = tunnel.forwards.filter(f => f.is_active).map(f => `:${f.port}`).join(', ');

                         return (
                           <div key={tunnel.id} className="flex items-center justify-between px-2 py-1.5 rounded-[6px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-default">
                             <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0 mr-3">
                               <div className={cn(
                                 "w-[8px] h-[8px] rounded-full flex-shrink-0 transition-colors duration-300",
                                 status === 'connected' ? "bg-[#34c759]" :
                                 status === 'connecting' ? "bg-[#ff9500] animate-pulse" :
                                 status === 'error' ? "bg-[#ff3b30]" :
                                 "bg-[#8e8e93]"
                               )} />
                               <div className="flex flex-col flex-1 min-w-0">
                                 <span className="text-[13px] font-medium leading-normal text-[#1d1d1f] dark:text-[#f5f5f7] truncate">{tunnel.name}</span>
                                 {status === 'error' && errorMsg && (
                                   <span className="text-[11px] text-[#ff3b30] line-clamp-2 mt-0.5 leading-snug">{errorMsg}</span>
                                 )}
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-3 shrink-0">
                               <span className="text-[11px] text-[#6e6e73] dark:text-[#9e9ea3] font-mono tracking-tight">{ports}</span>
                               <button 
                                 onClick={() => handleToggle(tunnel.id, isConnectingOrConnected)}
                                 className={cn(
                                   "relative inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border border-black/5 dark:border-white/5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0",
                                   isConnectingOrConnected ? "bg-[#007aff]" : "bg-[#d1d1d6] dark:bg-[#48484a]"
                                 )}
                               >
                                 <span className={cn(
                                   "pointer-events-none inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] ring-0 transition duration-200 ease-in-out",
                                   isConnectingOrConnected ? "translate-x-[17px]" : "translate-x-[1px]"
                                 )} />
                               </button>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   );
                 })
              ) : (
                forwardingTunnels.map(tunnel => {
                  const status = runtimeStatus[tunnel.id]?.state?.toLowerCase() || 'disconnected';
                  const errorMsg = runtimeStatus[tunnel.id]?.error_message;
                  const isConnectingOrConnected = status === 'connecting' || status === 'connected';
                  const ports = tunnel.forwards.filter(f => f.is_active).map(f => `:${f.port}`).join(', ');

                  return (
                    <div key={tunnel.id} className="flex items-center justify-between px-2 py-1.5 rounded-[6px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-default">
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0 mr-3">
                        <div className={cn(
                          "w-[8px] h-[8px] rounded-full flex-shrink-0 transition-colors duration-300",
                          status === 'connected' ? "bg-[#34c759]" :
                          status === 'connecting' ? "bg-[#ff9500] animate-pulse" :
                          status === 'error' ? "bg-[#ff3b30]" :
                          "bg-[#8e8e93]"
                        )} />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-[13px] font-medium leading-normal text-[#1d1d1f] dark:text-[#f5f5f7] truncate">{tunnel.name}</span>
                          {status === 'error' && errorMsg && (
                            <span className="text-[11px] text-[#ff3b30] line-clamp-2 mt-0.5 leading-snug">{errorMsg}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-[#6e6e73] dark:text-[#9e9ea3] font-mono tracking-tight">{ports}</span>
                        <button 
                          onClick={() => handleToggle(tunnel.id, isConnectingOrConnected)}
                          className={cn(
                            "relative inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border border-black/5 dark:border-white/5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-0",
                            isConnectingOrConnected ? "bg-[#007aff]" : "bg-[#d1d1d6] dark:bg-[#48484a]"
                          )}
                        >
                          <span className={cn(
                            "pointer-events-none inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] ring-0 transition duration-200 ease-in-out",
                            isConnectingOrConnected ? "translate-x-[17px]" : "translate-x-[1px]"
                          )} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        <div className="px-2 py-1 mt-1">
          <div className="border-t border-[#d4d4d6] dark:border-[#3c3c3e] w-full mb-1" />
          <button 
            onClick={() => invoke('open_main_window')} 
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-[6px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[13px] font-normal text-[#1d1d1f] dark:text-[#f5f5f7] cursor-default"
          >
            <div className="flex items-center gap-2">
              <AppWindow className="w-[14px] h-[14px] opacity-75" />
              <span>显示主窗口</span>
            </div>
            <span className="text-[#8e8e93] font-sans text-[11px]">⌘,</span>
          </button>
          <button 
            onClick={() => {
                import("@tauri-apps/api/core").then(({ invoke }) => {
                    invoke('plugin:process|exit', { code: 0 }).catch(() => {
                        window.close();
                    });
                });
            }} 
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-[6px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[13px] font-normal text-[#1d1d1f] dark:text-[#f5f5f7] cursor-default mt-0.5"
          >
            <div className="flex items-center gap-2">
              <Power className="w-[14px] h-[14px] opacity-75" />
              <span>退出</span>
            </div>
            <span className="text-[#8e8e93] font-sans text-[11px]">⌘Q</span>
          </button>
        </div>
      </div>
    </div>
  );
}
