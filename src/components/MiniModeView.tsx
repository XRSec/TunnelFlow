import React, { useState, useMemo, useRef, useEffect } from "react";
import { Tunnel, GroupDivider } from "@/types/tunnel";
import { saveTunnel, resizeMiniWindow } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Maximize2, Search, Play, Square, Plus, Network, FolderPlus } from "lucide-react";
import { TitleBar } from "@/components/TitleBar";
import { cn } from "@/lib/utils";

interface MiniModeViewProps {
  tunnels: Tunnel[];
  groups: GroupDivider[];
  runtimeStatus: Record<string, any>;
  onStartTunnel: (id: string) => void;
  onStopTunnel: (id: string) => void;
  onRefreshTunnels: () => void;
  onSwitchToFull: () => void;
  onAddGroup?: (title: string) => void;
  onOpenAboutModal?: () => void;
}

export function MiniModeView({ tunnels, groups, runtimeStatus, onStartTunnel, onStopTunnel, onRefreshTunnels, onSwitchToFull, onAddGroup, onOpenAboutModal }: MiniModeViewProps) {
  const [search, setSearch] = useState("");
  
  // Quick Add State
  const [newName, setNewName] = useState("");
  const [newUser, setNewUser] = useState("root");
  const [newPort, setNewPort] = useState("22");
  const [newAddress, setNewAddress] = useState("");
  const [newGroup, setNewGroup] = useState("");

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [newGroupPopover, setNewGroupPopover] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");

  const handleCreateGroup = () => {
    const title = newGroupTitle.trim();
    if (title) {
      if (onAddGroup) onAddGroup(title);
      setNewGroup(title);
      setNewGroupTitle("");
      setNewGroupPopover(false);
    }
  };


  const filteredForwardingTunnels = useMemo(() => {
    const isSearching = search.trim().length > 0;
    const query = search.toLowerCase();
    
    let filtered = tunnels.filter(t => !t.is_general_config);
    
    if (!isSearching) {
      filtered = filtered.filter(t => t.forwards?.some(f => f.is_active));
      filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      filtered = filtered.filter(t => {
        const matchName = t.name?.toLowerCase().includes(query);
        const matchHost = t.host?.toLowerCase().includes(query);
        const matchRemark = t.remark?.toLowerCase().includes(query);
        const matchGroup = t.group?.toLowerCase().includes(query);
        const matchPort = t.forwards?.some(f => f.is_active && String(f.port).includes(query));
        return matchName || matchHost || matchRemark || matchGroup || matchPort;
      });
      filtered.sort((a, b) => {
        const aHasActive = a.forwards?.some(f => f.is_active) ? 1 : 0;
        const bHasActive = b.forwards?.some(f => f.is_active) ? 1 : 0;
        if (aHasActive !== bHasActive) {
          return bHasActive - aHasActive;
        }
        return (a.name || "").localeCompare(b.name || "");
      });
    }
    
    return filtered;
  }, [tunnels, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isSearchFocused || search.trim().length > 0) {
        resizeMiniWindow(670).catch(() => {});
      } else {
        const itemsCount = filteredForwardingTunnels.length;
        let targetHeight = 480;
        if (itemsCount === 1) targetHeight = 520;
        else if (itemsCount === 2) targetHeight = 575;
        else if (itemsCount >= 3) targetHeight = 670;
        resizeMiniWindow(targetHeight).catch(() => {});
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [filteredForwardingTunnels.length, isSearchFocused, search, newGroupPopover]);

  const handleQuickAdd = async () => {
    if (!newName || !newAddress) return;
    const newTunnel: Tunnel = {
      id: "tunnel-" + Date.now() + "-" + crypto.randomUUID(),
      name: newName,
      host: newUser ? `${newUser}@${newAddress}` : newAddress,
      port: parseInt(newPort, 10) || 22,
      group: newGroup || null,
      auto_connect: false,
      is_general_config: false,
      use_alias: true,
      forwards: [],
      custom_directives: [],
    };
    await saveTunnel(newTunnel);
    
    setNewName("");
    setNewAddress("");
    setNewPort("22");
    setNewUser("root");
    setNewGroup("");
    
    onRefreshTunnels();
  };

  const renderStatusDot = (status?: string) => {
    const s = status || "disconnected";
    const colors: Record<string, string> = {
      connected: "bg-emerald-500",
      connecting: "bg-amber-500",
      error: "bg-destructive",
      disconnected: "bg-muted-foreground/40",
    };
    const isPulsing = s === "connecting" || s === "connected";
    return (
      <div className="relative flex h-2 w-2 items-center justify-center">
        {isPulsing && (
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", colors[s])}></span>
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", colors[s])}></span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full min-w-[370px] bg-background text-foreground overflow-hidden font-sans">
      <TitleBar windowMode="mini" onSwitchMode={onSwitchToFull} onOpenAboutModal={onOpenAboutModal} />
      
      <div className="flex-1 flex flex-col overflow-hidden bg-background relative w-full">
        {/* Header / Search Area */}
        <div className="px-3 pt-3 pb-2 flex flex-col gap-3 shrink-0 border-b border-border/40">
          <div className="flex justify-between items-center relative">
            <div className="relative flex-1 mr-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input 
                placeholder="搜索端口转发主机..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="h-8 text-xs bg-muted/30 border-border/60 pl-8 rounded-full shadow-sm"
              />
            </div>
            <Button size="sm" variant="ghost" onClick={onSwitchToFull} className="h-8 w-8 p-0 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 rounded-full bg-muted/40 hover:bg-muted/60 border border-border/40" title="完整模式">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Forwarding List Area */}
        <div className="px-3 py-2 flex flex-col flex-1 overflow-hidden" ref={contentRef}>
          <h2 className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5 px-1 shrink-0">
            {<><Network size={12} /> {search.trim() ? `搜索结果 (${filteredForwardingTunnels.length})` : "已配置转发的主机"}</>}
          </h2>
          
          <div className={cn("custom-scrollbar pr-1 flex flex-col gap-1.5 pb-2", (search.trim().length > 0 || isSearchFocused) ? "flex-1 min-h-[160px] overflow-y-auto" : "shrink-0 max-h-[190px] overflow-y-auto transition-all duration-200")}>
            {filteredForwardingTunnels.length > 0 ? (
                            filteredForwardingTunnels.map((t) => {
                const state = runtimeStatus[t.id]?.state;
                const activeForwards = t.forwards?.filter(f => f.is_active) || [];
                const canOperate = activeForwards.length > 0 || state === "connected";

                return (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/40 transition-colors group">
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                      {renderStatusDot(state)}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold truncate text-foreground/90">{t.name}</span>
                        <div className="flex items-center gap-1 mt-0.5 text-[9px] font-mono text-muted-foreground">
                          {activeForwards.length === 0 ? (
                            <span className="text-muted-foreground/70 truncate">{t.host || t.remark || "普通主机"}</span>
                          ) : (
                            <>
                              {activeForwards.slice(0, 2).map((f, i) => (
                                <span key={f.id || i} className="bg-muted px-1 rounded-sm truncate max-w-[80px]">
                                  {f.forward === "dynamic" ? `D:${f.port}` : f.forward === "local" ? `L:${f.port}` : `R:${f.port}`}
                                </span>
                              ))}
                              {activeForwards.length > 2 && <span className="text-muted-foreground/50">+{activeForwards.length - 2}</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {canOperate && (
                      <div className="shrink-0 ml-2">
                        {state === "connected" ? (
                          <Button 
                            size="sm" 
                            variant="danger" 
                            className="h-6 px-2 text-[10px] rounded-md shadow-none"
                            onClick={() => onStopTunnel(t.id)}
                          >
                            <Square size={10} className="mr-1" /> 断开
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="primary"
                            className="h-6 px-2 text-[10px] rounded-md shadow-none bg-primary/90 hover:bg-primary"
                            onClick={() => onStartTunnel(t.id)}
                            disabled={state === "connecting"}
                          >
                            {state === "connecting" ? (
                              <>连接中...</>
                            ) : (
                              <><Play size={10} className="mr-1" /> 连接</>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-border/50 rounded-lg bg-card/30">
                <Network size={16} className="text-muted-foreground/40 mb-2" />
                <span className="text-xs font-medium text-muted-foreground">{search.trim() ? "未找到匹配的主机" : "暂无已配置转发的主机"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Add Form Area */}
        <div className="mt-auto shrink-0 p-3 pb-3">
          <div className="bg-card rounded-xl p-3.5 border border-border/70 shadow-xs">
            <h3 className="text-[11px] font-semibold text-foreground flex items-center gap-1.5 mb-3">
              <Plus size={12} className="text-primary" /> 快速添加主机
            </h3>
            
            <div className="flex flex-col gap-2.5">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground ml-0.5">主机名 (Alias)</label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-7 text-xs mt-1 bg-muted/40 border-border/60" />
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-muted-foreground ml-0.5">用户 (User)</label>
                  <Input value={newUser} onChange={e => setNewUser(e.target.value)} className="h-7 text-xs mt-1 bg-muted/40 border-border/60" />
                </div>
                <div className="w-16">
                  <label className="text-[10px] font-medium text-muted-foreground ml-0.5">端口</label>
                  <Input value={newPort} onChange={e => setNewPort(e.target.value)} className="h-7 text-xs mt-1 bg-muted/40 border-border/60" />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-medium text-muted-foreground ml-0.5">地址 (Host / IP)</label>
                <Input value={newAddress} onChange={e => setNewAddress(e.target.value)} className="h-7 text-xs mt-1 bg-muted/40 border-border/60" />
              </div>
              
              <div>
                <label className="text-[10px] font-medium text-muted-foreground ml-0.5">分组 (Group)</label>
                <div className="flex items-center gap-1.5 mt-1 relative">
                  <input 
                    list="mini-group-list"
                    value={newGroup}
                    onChange={e => setNewGroup(e.target.value)}
                    className="flex h-7 flex-1 min-w-0 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-xs shadow-none transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7 shrink-0 border-border/60 bg-muted/40 hover:bg-muted/80" onClick={() => setNewGroupPopover(!newGroupPopover)} title="新建分组">
                    <FolderPlus className="h-3.5 w-3.5" />
                  </Button>
                  
                  {newGroupPopover && (
                    <div className="absolute right-0 bottom-full mb-1 z-50 w-48 p-2 bg-popover rounded-lg border border-border shadow-xl">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-semibold text-muted-foreground">新建分组</span>
                        <div className="flex items-center gap-1.5">
                          <Input 
                            placeholder="新分组名称" 
                            className="h-7 text-xs" 
                            value={newGroupTitle}
                            onChange={e => setNewGroupTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                            autoFocus
                          />
                          <Button size="sm" className="h-7 px-2 text-xs" onClick={handleCreateGroup}>创建</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <datalist id="mini-group-list">
                  {groups.map(g => <option key={g.id} value={g.title} />)}
                </datalist>
              </div>
              
              <Button 
                size="sm" 
                variant="primary"
                onClick={handleQuickAdd} 
                disabled={!newName || !newAddress} 
                className="mt-2 h-8 text-xs font-semibold w-full rounded-lg shadow-sm"
              >
                添加配置 (Add)
              </Button>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
