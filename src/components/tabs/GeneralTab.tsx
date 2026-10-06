import { useTranslation } from "react-i18next";
import React, { useState, useMemo } from "react";
import { Server, Plus, MinusCircle, Copy, Check, Laptop, ArrowRight, HelpCircle, FolderPlus } from "lucide-react";
import { Tunnel, PortForwarding, GroupDivider, ForwardType } from "@/types/tunnel";
import { detectGitPlatform } from "@/components/ui/PlatformIcon";
import { ConfigurationCard } from "@/components/ui/Card";
import { ConfigurationField, TwoColumnGrid } from "@/components/ui/Field";
import { InlineMemoField } from "@/components/ui/InlineMemoField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";
import { HostCombobox } from "@/components/ui/HostCombobox";
import { generateUUID, cn } from "@/lib/utils";
interface GeneralTabProps {
  tunnel: Tunnel;
  groups: GroupDivider[];
  onChange: (updated: Tunnel) => void;
  onAddGroup?: (title: string) => void;
  allTunnels?: Tunnel[];
  knownHosts?: string[];
}
export function GeneralTab({
  tunnel,
  groups,
  onChange,
  onAddGroup,
  allTunnels = [],
  knownHosts = []
}: GeneralTabProps) {
  const {
    t
  } = useTranslation();
  const [newGroupPopover, setNewGroupPopover] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [copiedPort, setCopiedPort] = useState<string | null>(null);
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    allTunnels.forEach(t => {
      if (t.group?.trim()) set.add(t.group.trim());
    });
    groups.forEach(g => {
      if (g.title?.trim()) set.add(g.title.trim());
    });
    if (tunnel.group?.trim()) {
      set.add(tunnel.group.trim());
    }
    return Array.from(set).sort();
  }, [allTunnels, groups, tunnel.group]);
  const updateTunnel = (patch: Partial<Tunnel>) => {
    onChange({
      ...tunnel,
      ...patch
    });
  };
  const handleUserChange = (user: string) => {
    const hostPart = tunnel.host.split("@")[1] || tunnel.host;
    updateTunnel({
      host: user ? `${user}@${hostPart}` : hostPart
    });
  };
  const getUser = (): string => {
    return tunnel.host.includes("@") ? tunnel.host.split("@")[0] : "";
  };
  const getHostname = (): string => {
    return tunnel.host.includes("@") ? tunnel.host.split("@")[1] : tunnel.host;
  };
  const handleHostnameChange = (hostname: string) => {
    if (tunnel.use_alias) {
      updateTunnel({
        host: hostname
      });
    } else {
      const userPart = getUser();
      updateTunnel({
        host: userPart ? `${userPart}@${hostname}` : hostname
      });
    }
  };

  // Add a port forward
  const addForward = (type: ForwardType) => {
    const newForward: PortForwarding = {
      id: generateUUID(),
      forward: type,
      bind_address: type === "remote" ? "0.0.0.0" : "127.0.0.1",
      port: type === "dynamic" ? 1080 : 8080,
      remote_host: type === "dynamic" ? "" : "127.0.0.1",
      remote_port: type === "dynamic" ? 0 : 80,
      is_active: true
    };
    updateTunnel({
      forwards: [...tunnel.forwards, newForward]
    });
  };

  // Update a port forward
  const updateForward = (id: string, patch: Partial<PortForwarding>) => {
    updateTunnel({
      forwards: tunnel.forwards.map(f => f.id === id ? {
        ...f,
        ...patch
      } : f)
    });
  };

  // Delete a port forward
  const deleteForward = (id: string) => {
    updateTunnel({
      forwards: tunnel.forwards.filter(f => f.id !== id)
    });
  };
  const renderForwardList = (type: ForwardType, title: string) => {
    const items = tunnel.forwards.filter(f => f.forward === type);
    let description = "";
    let logoText = "";
    if (type === "dynamic") {
      description = t("auto_2058");
      logoText = t("auto_2059");
    } else if (type === "local") {
      description = t("auto_2060");
      logoText = t("auto_2061");
    } else if (type === "remote") {
      description = t("auto_2062");
      logoText = t("auto_2063");
    }
    return <ConfigurationCard title={title} icon={<div className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 whitespace-nowrap">
            {logoText}
          </div>} summary={<span className="text-muted-foreground text-xs">{description}</span>} defaultExpanded={false}>
        <div className="space-y-2 mt-1">
          {items.length === 0 ? <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border/60 rounded-lg bg-background/30 text-muted-foreground">
              <Button variant="outline" onClick={() => addForward(type)} className="gap-1.5 h-8 text-xs font-medium">
                <Plus className="h-3.5 w-3.5" />{t("auto_2064")}</Button>
            </div> : <div className="space-y-2">
              {items.map(item => <div key={item.id} className="flex flex-col gap-2 rounded-lg bg-background/40 p-2.5 border border-border/50 hover:border-border/80 transition-colors shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {/* Local Group */}
                      <div className="flex items-center bg-card border border-border/60 rounded-md shadow-2xs overflow-hidden h-7 focus-within:ring-1 focus-within:ring-primary/50 transition-shadow">
                        <Input className="w-24 h-full text-xs font-mono tabular-nums bg-transparent border-none shadow-none p-1.5 rounded-none focus-visible:ring-0 text-right placeholder:text-muted-foreground/40" value={item.bind_address} placeholder={type === "remote" ? "0.0.0.0" : "127.0.0.1"} onChange={e => updateForward(item.id, {
                    bind_address: e.target.value
                  })} />
                        <span className="text-muted-foreground/60 text-xs px-0.5">:</span>
                        <Input type="number" className="w-16 h-full text-xs font-mono tabular-nums bg-transparent border-none shadow-none p-1.5 rounded-none focus-visible:ring-0 placeholder:text-muted-foreground/40 text-primary font-medium" value={item.port || ""} placeholder={t("auto_2065")} onChange={e => updateForward(item.id, {
                    port: parseInt(e.target.value) || 0
                  })} />
                      </div>

                      {type !== "dynamic" && <>
                          <div className="flex items-center justify-center px-1 text-muted-foreground/70 text-[10px] font-mono tracking-tighter shrink-0">
                            {type === "local" ? "──➔" : "⬅──"}
                          </div>
                          
                          {/* Remote Group */}
                          <div className="flex items-center bg-card border border-border/60 rounded-md shadow-2xs overflow-hidden h-7 focus-within:ring-1 focus-within:ring-primary/50 transition-shadow">
                            <Input className="w-[100px] h-full text-xs font-mono tabular-nums bg-transparent border-none shadow-none p-1.5 rounded-none focus-visible:ring-0 text-right placeholder:text-muted-foreground/40" value={item.remote_host} placeholder={t("auto_2066")} onChange={e => updateForward(item.id, {
                      remote_host: e.target.value
                    })} />
                            <span className="text-muted-foreground/60 text-xs px-0.5">:</span>
                            <Input type="number" className="w-16 h-full text-xs font-mono tabular-nums bg-transparent border-none shadow-none p-1.5 rounded-none focus-visible:ring-0 placeholder:text-muted-foreground/40 text-primary font-medium" value={item.remote_port || ""} placeholder={t("auto_2067")} onChange={e => updateForward(item.id, {
                      remote_port: parseInt(e.target.value) || 0
                    })} />
                          </div>
                        </>}
                      
                      <div className="ml-2 flex-1">
                        <InlineMemoField value={item.remark || ""} onChange={v => updateForward(item.id, {
                    remark: v
                  })} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Toggle title="" checked={item.is_active} onChange={checked => updateForward(item.id, {
                  is_active: checked
                })} />
                      <div className="h-4 w-px bg-border/60 mx-0.5" />
                      <button type="button" onClick={() => deleteForward(item.id)} className="rounded-md p-1.5 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors" title={t("auto_2068")}>
                        <MinusCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>)}
              <div className="pt-1">
                <Button variant="outline" size="xs" onClick={() => addForward(type)} className="gap-1 text-xs text-muted-foreground hover:text-foreground border-dashed">
                  <Plus className="h-3 w-3" />{t("auto_2069")}</Button>
              </div>
            </div>}
        </div>
      </ConfigurationCard>;
  };
  return <div className="space-y-4">
 {/* 1. Host Settings Card */}
 <ConfigurationCard title={t("auto_2070")} icon={<Server className="h-4 w-4 text-primary" />} summary={<div className="flex items-center gap-3 min-w-0">
 <span>{t("auto_2071")}<strong className="font-mono text-foreground">{tunnel.host || tunnel.name}</strong></span>
 {tunnel.group && <>
                    <span>·</span>
                    <span>{t("auto_2072")}<strong className="text-foreground">{tunnel.group}</strong></span>
                  </>}
      {(() => {
        const platform = detectGitPlatform(tunnel.host, tunnel.name);
        if (!platform) return null;
        const labels: Record<string, string> = {
          github: t("auto_2073"),
          gitlab: t("auto_2074"),
          gitee: t("auto_2075"),
          bitbucket: t("auto_2076"),
          codeberg: t("auto_2077"),
          git: t("auto_2078")
        };
        return <>
            <span>·</span>
            <span className="text-primary font-medium">{labels[platform]}</span>
          </>;
      })()}

 </div>} defaultExpanded={true}>
 {/* Row 1: Alias + HostName/IP */}
 <TwoColumnGrid>
 <ConfigurationField label={t("auto_2079")}>
  <div className="flex items-center gap-1.5 w-full relative">
    <div className="flex-1 min-w-[90px]">
      <Input value={tunnel.name} onChange={e => updateTunnel({
                name: e.target.value
              })} placeholder="vps1-p" />
    </div>
    <InlineMemoField value={tunnel.remark || ""} onChange={v => updateTunnel({
              remark: v
            })} />
  </div>
</ConfigurationField>

 <ConfigurationField label={<div className="flex items-center justify-between w-full">
 <span>{t("auto_2080")}{tunnel.use_alias ? t("auto_2081") : "(HostName / IP)"}</span>
 <div className="inline-flex rounded-md p-0.5 bg-muted/70 text-[10px]" onClick={e => e.stopPropagation()}>
 <button type="button" onClick={() => updateTunnel({
              use_alias: false
            })} className={cn("px-2 py-0.5 rounded transition-all cursor-pointer", !tunnel.use_alias ? "bg-background text-foreground shadow-2xs font-medium" : "text-muted-foreground hover:text-foreground")}>{t("auto_2082")}</button>
 <button type="button" onClick={() => {
              const cleanHost = tunnel.host.includes("@") ? tunnel.host.split("@")[1] : tunnel.host;
              updateTunnel({
                use_alias: true,
                host: cleanHost,
                port: 22
              });
            }} className={cn("px-2 py-0.5 rounded transition-all cursor-pointer", tunnel.use_alias ? "bg-background text-foreground shadow-2xs font-medium" : "text-muted-foreground hover:text-foreground")}>{t("auto_2083")}</button>
 </div>
 </div>}>
 <div className="flex items-center gap-1.5 w-full relative">
   <div className="flex-1 min-w-[90px]">
     <HostCombobox value={getHostname()} onChange={handleHostnameChange} mode={tunnel.use_alias ? "alias" : "address"} currentTunnelId={tunnel.id} excludeName={tunnel.name} placeholder={tunnel.use_alias ? t("auto_2084") : t("auto_2085")} tunnels={allTunnels} knownHosts={knownHosts} />
   </div>
   <InlineMemoField value={tunnel.field_remarks?.HostName || tunnel.field_remarks?.hostname || ""} onChange={v => updateTunnel({
              field_remarks: {
                ...tunnel.field_remarks,
                hostname: v
              }
            })} />
 </div>
 </ConfigurationField>
 </TwoColumnGrid>

 {/* Row 2: User + Port */}
 {!tunnel.use_alias && <TwoColumnGrid>
 <ConfigurationField label={t("auto_2086")}>
 <div className="flex items-center gap-1.5 w-full relative">
   <div className="flex-1 min-w-[90px]">
     <Input value={getUser()} onChange={e => handleUserChange(e.target.value)} placeholder="root" disabled={tunnel.use_alias} />
   </div>
   <InlineMemoField value={tunnel.field_remarks?.User || tunnel.field_remarks?.user || ""} onChange={v => updateTunnel({
              field_remarks: {
                ...tunnel.field_remarks,
                user: v
              }
            })} />
 </div>
 </ConfigurationField>

 <ConfigurationField label={t("auto_2087")}>
 <div className="flex items-center gap-1.5 w-full relative">
   <div className="flex-1 min-w-[90px]">
     <Input type="number" value={tunnel.port || 22} onChange={e => updateTunnel({
                port: parseInt(e.target.value) || 22
              })} placeholder="22" disabled={tunnel.use_alias} mono />
   </div>
   <InlineMemoField value={tunnel.field_remarks?.Port || tunnel.field_remarks?.port || ""} onChange={v => updateTunnel({
              field_remarks: {
                ...tunnel.field_remarks,
                port: v
              }
            })} />
 </div>
 </ConfigurationField>
 </TwoColumnGrid>}

 {/* Row 3: Group + Auto-connect */}
 <TwoColumnGrid>
 <ConfigurationField label={t("auto_2088")}>
 <div className="flex items-center gap-2">
 <Select value={tunnel.group || ""} onChange={e => updateTunnel({
              group: e.target.value || null
            })}>
 <option value="">{t("auto_2089")}</option>
 {availableGroups.map(groupTitle => <option key={groupTitle} value={groupTitle}>
 {groupTitle}
 </option>)}
 </Select>
 <Button variant="outline" size="icon" onClick={() => setNewGroupPopover(!newGroupPopover)} title={t("auto_2090")}>
 <FolderPlus className="h-3.5 w-3.5" />
 </Button>
 </div>
 {newGroupPopover && <div className="mt-2 flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
 <Input className="h-7 text-xs" placeholder={t("auto_2091")} value={newGroupTitle} onChange={e => setNewGroupTitle(e.target.value)} />
 <Button size="xs" variant="primary" onClick={() => {
              if (newGroupTitle.trim()) {
                const title = newGroupTitle.trim();
                if (onAddGroup) {
                  onAddGroup(title);
                }
                updateTunnel({
                  group: title
                });
                setNewGroupTitle("");
                setNewGroupPopover(false);
              }
            }} className="whitespace-nowrap shrink-0 px-3 min-w-[54px]">{t("auto_2092")}</Button>
 </div>}
 </ConfigurationField>

 <div className="pt-6">
 <Toggle title={t("auto_2093")} description={t("auto_2094")} checked={tunnel.auto_connect} onChange={checked => updateTunnel({
            auto_connect: checked
          })} memo={<InlineMemoField value={tunnel.field_remarks?.AutoConnect || tunnel.field_remarks?.autoconnect || ""} onChange={v => updateTunnel({
            field_remarks: {
              ...tunnel.field_remarks,
              autoconnect: v
            }
          })} />} />
 </div>
 </TwoColumnGrid>
 </ConfigurationCard>

 {/* 2. Port Forwardings */}
 {renderForwardList("dynamic", t("auto_2095"))}
 {renderForwardList("local", t("auto_2096"))}
 {renderForwardList("remote", t("auto_2097"))}

 {/* 3. Usage hints */}
 {tunnel.forwards.filter(f => f.is_active).length > 0 && <ConfigurationCard title={t("auto_2098")} collapsible={false}>
 <div className="space-y-2 font-mono text-xs">
 {tunnel.forwards.filter(f => f.is_active).map(f => {
          const url = f.forward === "dynamic" ? `socks5://${f.bind_address || "127.0.0.1"}:${f.port}` : `http://${f.bind_address || "127.0.0.1"}:${f.port}`;
          return <div key={f.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/50">
 <div className="flex items-center gap-3 min-w-0">
 <span className="text-muted-foreground whitespace-nowrap shrink-0 min-w-fit font-mono text-[11px]">
 {f.forward === "dynamic" ? "SOCKS5" : t("generalTab.localPort", { port: f.port, defaultValue: `本地 :${f.port}` })}
 </span>
 <div className="min-w-0 overflow-hidden flex-1"><span className="text-primary font-medium truncate block">{url}</span></div>
 </div>
 <button type="button" onClick={() => {
              navigator.clipboard.writeText(url);
              setCopiedPort(f.id);
              setTimeout(() => setCopiedPort(null), 1500);
            }} className="p-1 rounded text-muted-foreground hover:text-foreground" title={t("auto_2099")}>
 {copiedPort === f.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
 </button>
 </div>;
        })}
 </div>
 </ConfigurationCard>}
 </div>;
}