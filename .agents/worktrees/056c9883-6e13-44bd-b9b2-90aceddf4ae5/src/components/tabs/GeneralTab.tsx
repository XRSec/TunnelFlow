import React, { useState, useMemo } from "react";
import {
  Server,
 Plus,
 MinusCircle,
 Copy,
 Check,
 Laptop,
 ArrowRight,
 HelpCircle,
 FolderPlus,
} from "lucide-react";
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
 knownHosts = [],
}: GeneralTabProps) {
 const [newGroupPopover, setNewGroupPopover] = useState(false);
 const [newGroupTitle, setNewGroupTitle] = useState("");
 const [copiedPort, setCopiedPort] = useState<string | null>(null);

  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    allTunnels.forEach((t) => {
      if (t.group?.trim()) set.add(t.group.trim());
    });
    groups.forEach((g) => {
      if (g.title?.trim()) set.add(g.title.trim());
    });
    if (tunnel.group?.trim()) {
      set.add(tunnel.group.trim());
    }
    return Array.from(set).sort();
  }, [allTunnels, groups, tunnel.group]);

 const updateTunnel = (patch: Partial<Tunnel>) => {
 onChange({ ...tunnel, ...patch });
 };

 const handleUserChange = (user: string) => {
 const hostPart = tunnel.host.split("@")[1] || tunnel.host;
 updateTunnel({ host: user ? `${user}@${hostPart}` : hostPart });
 };

 const getUser = (): string => {
 return tunnel.host.includes("@") ? tunnel.host.split("@")[0] : "";
 };

 const getHostname = (): string => {
 return tunnel.host.includes("@") ? tunnel.host.split("@")[1] : tunnel.host;
 };

 const handleHostnameChange = (hostname: string) => {
    if (tunnel.use_alias) {
      updateTunnel({ host: hostname });
    } else {
      const userPart = getUser();
      updateTunnel({ host: userPart ? `${userPart}@${hostname}` : hostname });
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
 is_active: true,
 };
 updateTunnel({ forwards: [...tunnel.forwards, newForward] });
 };

 // Update a port forward
 const updateForward = (id: string, patch: Partial<PortForwarding>) => {
 updateTunnel({
 forwards: tunnel.forwards.map((f) => (f.id === id ? { ...f, ...patch } : f)),
 });
 };

 // Delete a port forward
 const deleteForward = (id: string) => {
 updateTunnel({
 forwards: tunnel.forwards.filter((f) => f.id !== id),
 });
 };

 
  const renderForwardList = (type: ForwardType, title: string) => {
    const items = tunnel.forwards.filter((f) => f.forward === type);
    
    let description = "";
    let logoText = "";
    if (type === "dynamic") {
      description = "在本地建立 SOCKS5 代理通道";
      logoText = "SOCKS5 代理";
    } else if (type === "local") {
      description = "将远端内网端口映射至本地端口";
      logoText = "本地 ➔ 远端";
    } else if (type === "remote") {
      description = "将本地服务反向暴露给远端服务器";
      logoText = "远端 ➔ 本地";
    }

    return (
      <ConfigurationCard
        title={title}
        icon={
          <div className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 whitespace-nowrap">
            {logoText}
          </div>
        }
        summary={<span className="text-muted-foreground text-xs">{description}</span>}
        defaultExpanded={false}
      >
        <div className="space-y-2 mt-1">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 border border-dashed border-border/60 rounded-lg bg-background/30 text-muted-foreground">
              <Button
                variant="outline"
                onClick={() => addForward(type)}
                className="gap-1.5 h-8 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" />
                添加一条转发规则
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg bg-background/40 p-2.5 border border-border/50 hover:border-border/80 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {/* Local Group */}
                      <div className="flex items-center bg-card border border-border/60 rounded-md shadow-2xs overflow-hidden h-7 focus-within:ring-1 focus-within:ring-primary/50 transition-shadow">
                        <Input
                          className="w-24 h-full text-xs font-mono tabular-nums bg-transparent border-none shadow-none p-1.5 rounded-none focus-visible:ring-0 text-right placeholder:text-muted-foreground/40"
                          value={item.bind_address}
                          placeholder={type === "remote" ? "0.0.0.0" : "127.0.0.1"}
                          onChange={(e) => updateForward(item.id, { bind_address: e.target.value })}
                        />
                        <span className="text-muted-foreground/60 text-xs px-0.5">:</span>
                        <Input
                          type="number"
                          className="w-16 h-full text-xs font-mono tabular-nums bg-transparent border-none shadow-none p-1.5 rounded-none focus-visible:ring-0 placeholder:text-muted-foreground/40 text-primary font-medium"
                          value={item.port || ""}
                          placeholder="端口"
                          onChange={(e) => updateForward(item.id, { port: parseInt(e.target.value) || 0 })}
                        />
                      </div>

                      {type !== "dynamic" && (
                        <>
                          <div className="flex items-center justify-center px-1 text-muted-foreground/70 text-[10px] font-mono tracking-tighter shrink-0">
                            {type === "local" ? "──➔" : "⬅──"}
                          </div>
                          
                          {/* Remote Group */}
                          <div className="flex items-center bg-card border border-border/60 rounded-md shadow-2xs overflow-hidden h-7 focus-within:ring-1 focus-within:ring-primary/50 transition-shadow">
                            <Input
                              className="w-[100px] h-full text-xs font-mono tabular-nums bg-transparent border-none shadow-none p-1.5 rounded-none focus-visible:ring-0 text-right placeholder:text-muted-foreground/40"
                              value={item.remote_host}
                              placeholder="目标地址"
                              onChange={(e) => updateForward(item.id, { remote_host: e.target.value })}
                            />
                            <span className="text-muted-foreground/60 text-xs px-0.5">:</span>
                            <Input
                              type="number"
                              className="w-16 h-full text-xs font-mono tabular-nums bg-transparent border-none shadow-none p-1.5 rounded-none focus-visible:ring-0 placeholder:text-muted-foreground/40 text-primary font-medium"
                              value={item.remote_port || ""}
                              placeholder="端口"
                              onChange={(e) => updateForward(item.id, { remote_port: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </>
                      )}
                      
                      <div className="ml-2 flex-1">
                        <InlineMemoField 
                          value={item.remark || ""} 
                          onChange={(v) => updateForward(item.id, { remark: v })} 
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Toggle
                        title=""
                        checked={item.is_active}
                        onChange={(checked) => updateForward(item.id, { is_active: checked })}
                      />
                      <div className="h-4 w-px bg-border/60 mx-0.5" />
                      <button
                        type="button"
                        onClick={() => deleteForward(item.id)}
                        className="rounded-md p-1.5 text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="删除规则"
                      >
                        <MinusCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => addForward(type)}
                  className="gap-1 text-xs text-muted-foreground hover:text-foreground border-dashed"
                >
                  <Plus className="h-3 w-3" />
                  新增规则
                </Button>
              </div>
            </div>
          )}
        </div>
      </ConfigurationCard>
    );
  };


 return (
 <div className="space-y-4">
 {/* 1. Host Settings Card */}
 <ConfigurationCard
 title="主机配置 (Host)"
 icon={<Server className="h-4 w-4 text-primary" />}
 summary={
 <div className="flex items-center gap-3 min-w-0">
 <span>连接目标: <strong className="font-mono text-foreground">{tunnel.host || tunnel.name}</strong></span>
 {tunnel.group && (
                  <>
                    <span>·</span>
                    <span>分组: <strong className="text-foreground">{tunnel.group}</strong></span>
                  </>
                )}
      {(() => {
        const platform = detectGitPlatform(tunnel.host, tunnel.name);
        if (!platform) return null;
        const labels: Record<string, string> = {
          github: "GitHub 平台",
          gitlab: "GitLab 平台",
          gitee: "Gitee 平台",
          bitbucket: "Bitbucket 平台",
          codeberg: "Codeberg 平台",
          git: "Git 服务器"
        };
        return (
          <>
            <span>·</span>
            <span className="text-primary font-medium">{labels[platform]}</span>
          </>
        );
      })()}

 </div>
 }
 defaultExpanded={true}
 >
 {/* Row 1: Alias + HostName/IP */}
 <TwoColumnGrid>
 <ConfigurationField label="主机别名">
  <div className="flex items-center gap-1.5 w-full relative">
    <div className="flex-1 min-w-[90px]">
      <Input
                value={tunnel.name}
                onChange={(e) => updateTunnel({ name: e.target.value })}
                placeholder="vps1-p"
              />
    </div>
    <InlineMemoField value={tunnel.remark || ""} onChange={(v) => updateTunnel({ remark: v })} />
  </div>
</ConfigurationField>

 <ConfigurationField
 label={
 <div className="flex items-center justify-between w-full">
 <span>主机地址 {tunnel.use_alias ? "(别名)" : "(HostName / IP)"}</span>
 <div className="inline-flex rounded-md p-0.5 bg-muted/70 text-[10px]" onClick={(e) => e.stopPropagation()}>
 <button
 type="button"
 onClick={() => updateTunnel({ use_alias: false })}
 className={cn(
 "px-2 py-0.5 rounded transition-all cursor-pointer",
 !tunnel.use_alias
 ? "bg-background text-foreground shadow-2xs font-medium"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 地址
 </button>
 <button
 type="button"
 onClick={() => {
 const cleanHost = tunnel.host.includes("@")
 ? tunnel.host.split("@")[1]
 : tunnel.host;
 updateTunnel({ use_alias: true, host: cleanHost, port: 22 });
 }}
 className={cn(
 "px-2 py-0.5 rounded transition-all cursor-pointer",
 tunnel.use_alias
 ? "bg-background text-foreground shadow-2xs font-medium"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 别名
 </button>
 </div>
 </div>
 }
 >
 <div className="flex items-center gap-1.5 w-full relative">
   <div className="flex-1 min-w-[90px]">
     <HostCombobox
     value={getHostname()}
     onChange={handleHostnameChange}
     mode={tunnel.use_alias ? "alias" : "address"}
     currentTunnelId={tunnel.id}
     excludeName={tunnel.name}
     placeholder={
     tunnel.use_alias
     ? "选择 ~/.ssh/config 主机别名..."
     : "输入或下拉选择 IP / 域名..."
     }
     tunnels={allTunnels}
     knownHosts={knownHosts}
     />
   </div>
   <InlineMemoField
     value={tunnel.field_remarks?.HostName || tunnel.field_remarks?.hostname || ""}
     onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, hostname: v } })}
   />
 </div>
 </ConfigurationField>
 </TwoColumnGrid>

 {/* Row 2: User + Port */}
 {!tunnel.use_alias && (
 <TwoColumnGrid>
 <ConfigurationField
 label="登录用户"
>
 <div className="flex items-center gap-1.5 w-full relative">
   <div className="flex-1 min-w-[90px]">
     <Input
     value={getUser()}
     onChange={(e) => handleUserChange(e.target.value)}
     placeholder="root"
     disabled={tunnel.use_alias}
     />
   </div>
   <InlineMemoField
     value={tunnel.field_remarks?.User || tunnel.field_remarks?.user || ""}
     onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, user: v } })}
   />
 </div>
 </ConfigurationField>

 <ConfigurationField
 label="SSH 端口"
>
 <div className="flex items-center gap-1.5 w-full relative">
   <div className="flex-1 min-w-[90px]">
     <Input
     type="number"
     value={tunnel.port || 22}
     onChange={(e) => updateTunnel({ port: parseInt(e.target.value) || 22 })}
     placeholder="22"
     disabled={tunnel.use_alias}
     mono
     />
   </div>
   <InlineMemoField
     value={tunnel.field_remarks?.Port || tunnel.field_remarks?.port || ""}
     onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, port: v } })}
   />
 </div>
 </ConfigurationField>
 </TwoColumnGrid>
 )}

 {/* Row 3: Group + Auto-connect */}
 <TwoColumnGrid>
 <ConfigurationField label="所属分组">
 <div className="flex items-center gap-2">
 <Select
 value={tunnel.group || ""}
 onChange={(e) => updateTunnel({ group: e.target.value || null })}
 >
 <option value="">未分组 (默认)</option>
 {availableGroups.map((groupTitle) => (
 <option key={groupTitle} value={groupTitle}>
 {groupTitle}
 </option>
 ))}
 </Select>
 <Button
 variant="outline"
 size="icon"
 onClick={() => setNewGroupPopover(!newGroupPopover)}
 title="新建分组"
 >
 <FolderPlus className="h-3.5 w-3.5" />
 </Button>
 </div>
 {newGroupPopover && (
 <div className="mt-2 flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
 <Input
 className="h-7 text-xs"
 placeholder="新分组名称"
 value={newGroupTitle}
 onChange={(e) => setNewGroupTitle(e.target.value)}
 />
 <Button
 size="xs"
 variant="primary"
 onClick={() => {
 if (newGroupTitle.trim()) {
      const title = newGroupTitle.trim();
      if (onAddGroup) {
        onAddGroup(title);
      }
      updateTunnel({ group: title });
      setNewGroupTitle("");
      setNewGroupPopover(false);
    }
 }}
 className="whitespace-nowrap shrink-0 px-3 min-w-[54px]">
 创建
 </Button>
 </div>
 )}
 </ConfigurationField>

 <div className="pt-6">
 <Toggle
 title="启动时自动连接"
 description="当 TunnelFlow 应用启动时自动拉起此 SSH 隧道"
 checked={tunnel.auto_connect}
 onChange={(checked) => updateTunnel({ auto_connect: checked })}
 memo={
 <InlineMemoField
 value={tunnel.field_remarks?.AutoConnect || tunnel.field_remarks?.autoconnect || ""}
 onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, autoconnect: v } })}
 />
 }
 />
 </div>
 </TwoColumnGrid>
 </ConfigurationCard>

 {/* 2. Port Forwardings */}
 {renderForwardList("dynamic", "动态端口转发 (-D)")}
 {renderForwardList("local", "本地端口转发 (-L)")}
 {renderForwardList("remote", "远程端口转发 (-R)")}

 {/* 3. Usage hints */}
 {tunnel.forwards.filter((f) => f.is_active).length > 0 && (
 <ConfigurationCard title="连接使用命令与地址 (Usage)" collapsible={false}>
 <div className="space-y-2 font-mono text-xs">
 {tunnel.forwards
 .filter((f) => f.is_active)
 .map((f) => {
 const url =
 f.forward === "dynamic"
 ? `socks5://${f.bind_address || "127.0.0.1"}:${f.port}`
 : `http://${f.bind_address || "127.0.0.1"}:${f.port}`;
 return (
 <div
 key={f.id}
 className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/50"
 >
 <div className="flex items-center gap-3 min-w-0">
 <span className="text-muted-foreground whitespace-nowrap shrink-0 min-w-fit font-mono text-[11px]">
 {f.forward === "dynamic" ? "SOCKS5" : `本地 :${f.port}`}
 </span>
 <div className="min-w-0 overflow-hidden flex-1"><span className="text-primary font-medium truncate block">{url}</span></div>
 </div>
 <button
 type="button"
 onClick={() => {
 navigator.clipboard.writeText(url);
 setCopiedPort(f.id);
 setTimeout(() => setCopiedPort(null), 1500);
 }}
 className="p-1 rounded text-muted-foreground hover:text-foreground"
 title="复制地址"
 >
 {copiedPort === f.id ? (
 <Check className="h-3.5 w-3.5 text-emerald-500" />
 ) : (
 <Copy className="h-3.5 w-3.5" />
 )}
 </button>
 </div>
 );
 })}
 </div>
 </ConfigurationCard>
 )}
 </div>
 );
}
