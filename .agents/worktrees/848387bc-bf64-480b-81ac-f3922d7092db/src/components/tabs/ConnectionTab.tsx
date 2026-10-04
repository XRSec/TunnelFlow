import React from "react";
import { cn } from "@/lib/utils";
import {
 Sliders,
 Activity,
 KeyRound,
 GitFork,
 Boxes,
 Terminal,
 FolderOpen,
 Key,
} from "lucide-react";
import { Tunnel, SSHKeyInfo } from "@/types/tunnel";
import { ConfigurationCard } from "@/components/ui/Card";
import { ConfigurationField, TwoColumnGrid } from "@/components/ui/Field";
import { InlineMemoField } from "@/components/ui/InlineMemoField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Button } from "@/components/ui/Button";

interface ConnectionTabProps {
 tunnel: Tunnel;
 keys: SSHKeyInfo[];
 onChange: (updated: Tunnel) => void;
 onOpenKeysManager?: () => void;
  generalConfig?: Tunnel | null;
}

export function ConnectionTab({
 tunnel,
 keys,
 onChange,
 onOpenKeysManager,
  generalConfig,
}: ConnectionTabProps) {
 const inheritedKey = generalConfig?.identity_file ? generalConfig.identity_file.replace(/^.*[\\/]/, "") : "";

  const updateTunnel = (patch: Partial<Tunnel>) => {
 onChange({ ...tunnel, ...patch });
 };

 return (
 <div className="space-y-4">
 {/* 1. Connection Behavior */}
 <ConfigurationCard
 title="连接行为与参数 (Connection Behavior)"
 icon={<Sliders className="h-4 w-4 text-primary" />}
 summary={
 <div className="flex items-center gap-3">
 <span>日志: <strong className={cn("font-mono", tunnel.log_level ? "text-foreground" : "text-muted-foreground/80 font-normal")}>{tunnel.log_level || "INFO"}</strong></span>
 <span>·</span>
 <span>重试: <strong className={cn("font-mono", tunnel.connection_attempts ? "text-foreground" : "text-muted-foreground/80 font-normal")}>{tunnel.connection_attempts || 1} 次</strong></span>
 <span>·</span>
 <span>地址族: <strong className={cn("font-mono", tunnel.address_family ? "text-foreground" : "text-muted-foreground/80 font-normal")}>{tunnel.address_family || "any"}</strong></span>
 {tunnel.compression && (
 <>
 <span>·</span>
 <span className="text-primary font-medium">压缩</span>
 </>
 )}
 </div>
 }
 
 >
 {/* Row 1: LogLevel + ConnectionAttempts */}
 <TwoColumnGrid>
 <ConfigurationField label="日志级别 (LogLevel)">
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <Select
     value={tunnel.log_level || ""}
     onChange={(e) => updateTunnel({ log_level: e.target.value || null })}
     >
     <option value="">INFO (默认)</option>
     <option value="QUIET">QUIET (静默)</option>
     <option value="INFO">INFO (信息)</option>
     <option value="VERBOSE">VERBOSE (详细)</option>
     <option value="DEBUG1">DEBUG1 (调试 1)</option>
     <option value="DEBUG2">DEBUG2 (调试 2)</option>
     <option value="DEBUG3">DEBUG3 (深度调试)</option>
     </Select>
   </div>
   <InlineMemoField
     value={tunnel.field_remarks?.LogLevel || tunnel.field_remarks?.loglevel || ""}
     onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, loglevel: v } })}
   />
 </div>
 </ConfigurationField>

 <ConfigurationField label="连接尝试次数 (ConnectionAttempts)">
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <Input
     type="number"
     value={tunnel.connection_attempts || ""}
     onChange={(e) =>
     updateTunnel({
     connection_attempts: e.target.value ? parseInt(e.target.value) : null,
     })
     }
     placeholder="默认 1 次"
     mono
     />
   </div>
   <InlineMemoField
     value={tunnel.field_remarks?.ConnectionAttempts || tunnel.field_remarks?.connectionattempts || ""}
     onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, connectionattempts: v } })}
   />
 </div>
 </ConfigurationField>
 </TwoColumnGrid>

 {/* Row 2: BindAddress + AddressFamily */}
 <TwoColumnGrid>
 <ConfigurationField label="监听/绑定地址 (BindAddress)">
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <Input
     value={tunnel.bind_address || ""}
     onChange={(e) => updateTunnel({ bind_address: e.target.value || null })}
     placeholder="默认系统选择 (如 192.168.1.100)"
     mono
     />
   </div>
   <InlineMemoField
     value={tunnel.field_remarks?.BindAddress || tunnel.field_remarks?.bindaddress || ""}
     onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, bindaddress: v } })}
   />
 </div>
 </ConfigurationField>

 <ConfigurationField label="地址协议族 (AddressFamily)">
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <Select
     value={tunnel.address_family || ""}
     onChange={(e) => updateTunnel({ address_family: e.target.value || null })}
     >
     <option value="">所有协议族 (any)</option>
     <option value="inet">仅 IPv4 (inet)</option>
     <option value="inet6">仅 IPv6 (inet6)</option>
     </Select>
   </div>
   <InlineMemoField
     value={tunnel.field_remarks?.AddressFamily || tunnel.field_remarks?.addressfamily || ""}
     onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, addressfamily: v } })}
   />
 </div>
 </ConfigurationField>
 </TwoColumnGrid>

 {/* Row 3: Compression + Host Key Check */}
 <TwoColumnGrid className="pt-1">
 <Toggle
 title="数据流压缩 (Compression, -C)"
 description="在低带宽或慢速网络下提升转发吞吐量"
 checked={!!tunnel.compression}
 onChange={(checked) => updateTunnel({ compression: checked })}
 memo={
 <InlineMemoField
 value={tunnel.field_remarks?.Compression || tunnel.field_remarks?.compression || ""}
 onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, compression: v } })}
 />
 }
 />

 <Toggle
 title="跳过公钥比对 (StrictHostKeyChecking=no)"
 description="忽略 known_hosts 变更警告，常用于动态 IP 或测试 VPS"
 checked={!!tunnel.skip_host_key_check}
 onChange={(checked) => updateTunnel({ skip_host_key_check: checked })}
 memo={
 <InlineMemoField
 value={tunnel.field_remarks?.StrictHostKeyChecking || tunnel.field_remarks?.stricthostkeychecking || ""}
 onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, stricthostkeychecking: v } })}
 />
 }
 />
 </TwoColumnGrid>
 </ConfigurationCard>

 {/* 2. Resilience (连接保活与弹性) - 严格一行两个 */}
 <ConfigurationCard
 title="连接保活与弹性 (Resilience)"
 icon={<Activity className="h-4 w-4 text-emerald-500" />}
 summary={
 <div className="flex items-center gap-3">
 <span>保活间隔: <strong className="font-mono text-foreground">{tunnel.server_alive_interval ? `${tunnel.server_alive_interval}s` : "30s (默认)"}</strong></span>
 <span>·</span>
 <span>重试次数: <strong className="font-mono text-foreground">{tunnel.server_alive_count_max ? `${tunnel.server_alive_count_max}次` : "3次 (默认)"}</strong></span>
 <span>·</span>
 <span>超时: <strong className="font-mono text-foreground">{tunnel.connect_timeout ? `${tunnel.connect_timeout}s` : "30s (默认)"}</strong></span>
 </div>
 }
 
 >
 {/* Row 1: ServerAliveInterval + ServerAliveCountMax */}
 <TwoColumnGrid>
 <ConfigurationField label="保活探测间隔 (ServerAliveInterval)">
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <div className="flex items-center gap-2">
     <Input
     type="number"
     value={tunnel.server_alive_interval || ""}
     onChange={(e) =>
     updateTunnel({
     server_alive_interval: e.target.value ? parseInt(e.target.value) : null,
     })
     }
     placeholder="默认 30"
     mono
     />
     <span className="text-xs text-muted-foreground shrink-0">秒</span>
     </div>
   </div>
   <InlineMemoField
     value={tunnel.field_remarks?.ServerAliveInterval || tunnel.field_remarks?.serveraliveinterval || ""}
     onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, serveraliveinterval: v } })}
   />
 </div>
 </ConfigurationField>

 <ConfigurationField label="保活重试次数 (ServerAliveCountMax)">
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <div className="flex items-center gap-2">
     <Input
     type="number"
     value={tunnel.server_alive_count_max || ""}
     onChange={(e) =>
     updateTunnel({
     server_alive_count_max: e.target.value ? parseInt(e.target.value) : null,
     })
     }
     placeholder="默认 3"
     mono
     />
     <span className="text-xs text-muted-foreground shrink-0">次</span>
     </div>
   </div>
   <InlineMemoField
     value={tunnel.field_remarks?.ServerAliveCountMax || tunnel.field_remarks?.serveralivecountmax || ""}
     onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, serveralivecountmax: v } })}
   />
 </div>
 </ConfigurationField>
 </TwoColumnGrid>

 {/* Row 2: ConnectTimeout */}
 <TwoColumnGrid>
 <ConfigurationField label="连接超时 (ConnectTimeout)">
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <div className="flex items-center gap-2">
     <Input
     type="number"
     value={tunnel.connect_timeout || ""}
     onChange={(e) =>
     updateTunnel({
     connect_timeout: e.target.value ? parseInt(e.target.value) : null,
     })
     }
     placeholder="默认 30 (留空为无限等待)"
     mono
     />
     <span className="text-xs text-muted-foreground shrink-0">秒</span>
     </div>
   </div>
   <InlineMemoField
     value={tunnel.field_remarks?.ConnectTimeout || tunnel.field_remarks?.connecttimeout || ""}
     onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, connecttimeout: v } })}
   />
 </div>
 </ConfigurationField>
  <Toggle
 title="TCP 链路心跳保活 (TCPKeepAlive)"
 description="防止网络空闲时防火墙断开连接"
 checked={!!tunnel.tcp_keep_alive}
 onChange={(checked) => updateTunnel({ tcp_keep_alive: checked })}
 memo={
 <InlineMemoField
 value={tunnel.field_remarks?.TCPKeepAlive || tunnel.field_remarks?.tcpkeepalive || ""}
 onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, tcpkeepalive: v } })}
 />
 }
 />
 </TwoColumnGrid>
 </ConfigurationCard>

 {/* 3. Authentication & Keys (身份认证与密钥) - 严格一行两个 */}
 <ConfigurationCard
 title="身份认证与密钥 (Authentication & Keys)"
 icon={<KeyRound className="h-4 w-4 text-amber-500" />}
 headerAction={
 onOpenKeysManager && (
 <Button
 variant="ghost"
 size="xs"
 onClick={onOpenKeysManager}
 className="text-xs gap-1"
 >
 <Key className="h-3.5 w-3.5" />
 <span>密钥清单</span>
 </Button>
 )
 }
 summary={
 <div className="flex items-center gap-3">
 <span>认证私钥: <strong className={cn("font-mono", tunnel.identity_file ? "text-foreground" : "text-muted-foreground/80 font-normal")}>{tunnel.identity_file || "系统默认 (~/.ssh/id_*)"}</strong></span>
 {tunnel.forward_agent && (
 <>
 <span>·</span>
 <span className="text-primary font-medium">转发代理</span>
 </>
 )}
 {tunnel.identities_only && (
 <>
 <span>·</span>
 <span className="text-amber-500 font-medium">仅指定密钥</span>
 </>
 )}
 </div>
 }
 
 >
 {/* Row 1: IdentityFile + CertificateFile */}
 <TwoColumnGrid>
 <ConfigurationField label="SSH 认证私钥 (IdentityFile)">
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <div className="flex items-center gap-2">
     <Select
     value={tunnel.identity_file || ""}
     onChange={(e) => updateTunnel({ identity_file: e.target.value || null })}
     >
     <option value="">{!tunnel.is_general_config && inheritedKey ? `继承全局默认 (${inheritedKey})` : "系统默认 (~/.ssh/id_*)"}</option>
     {keys.map((k) => (
     <option key={k.path} value={k.path}>
     {k.display_title}
     </option>
     ))}
     </Select>
     <Button
     variant="outline"
     size="icon"
     onClick={() => {
     const input = prompt("请输入私钥绝对路径或相对 ~/.ssh/ 路径:");
     if (input) updateTunnel({ identity_file: input.trim() });
     }}
     title="手动输入或浏览私钥路径"
     >
     <FolderOpen className="h-3.5 w-3.5" />
     </Button>
     </div>
   </div>
   <InlineMemoField
     value={tunnel.field_remarks?.IdentityFile || tunnel.field_remarks?.identityfile || ""}
     onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, identityfile: v } })}
   />
 </div>
 </ConfigurationField>

 <ConfigurationField label="证书文件 (CertificateFile, 可选)">
 <div className="flex items-center gap-2">
 <Input
 value={tunnel.certificate_file || ""}
 onChange={(e) => updateTunnel({ certificate_file: e.target.value || null })}
 placeholder="可选证书路径 (如 ~/.ssh/id_rsa-cert.pub)"
 mono
 />
 <Button
 variant="outline"
 size="icon"
 onClick={() => {
 const input = prompt("请输入证书绝对路径:");
 if (input) updateTunnel({ certificate_file: input.trim() });
 }}
 title="浏览证书文件"
 >
 <FolderOpen className="h-3.5 w-3.5" />
 </Button>
 </div>
 </ConfigurationField>
 </TwoColumnGrid>

 {/* Row 2: ForwardAgent + IdentitiesOnly */}
 <TwoColumnGrid className="pt-1">
 <Toggle
 title="转发认证代理 (ForwardAgent)"
 description="允许远端主机访问本机 ssh-agent (仅在受信任主机开启)"
 checked={!!tunnel.forward_agent}
 onChange={(checked) => updateTunnel({ forward_agent: checked })}
 memo={
 <InlineMemoField
 value={tunnel.field_remarks?.ForwardAgent || tunnel.field_remarks?.forwardagent || ""}
 onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, forwardagent: v } })}
 />
 }
 />

 <Toggle
 title="仅使用指定密钥 (IdentitiesOnly)"
 description="强制仅使用显式指定的密钥验证，忽略 agent 中其他密钥"
 checked={!!tunnel.identities_only}
 onChange={(checked) => updateTunnel({ identities_only: checked })}
 memo={
 <InlineMemoField
 value={tunnel.field_remarks?.IdentitiesOnly || tunnel.field_remarks?.identitiesonly || ""}
 onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, identitiesonly: v } })}
 />
 }
 />
 </TwoColumnGrid>
 </ConfigurationCard>

 {/* 4. Jump & Proxy (跳板机与网络路由) */}
 <ConfigurationCard
 title="跳板机与网络路由 (Jump & Proxy)"
 icon={<GitFork className="h-4 w-4 text-purple-500" />}
 summary={
 <div className="flex items-center gap-3">
 <span>路由状态: <strong className={cn("font-mono", tunnel.proxy_jump || tunnel.proxy_command ? "text-foreground" : "text-muted-foreground/80 font-normal")}>{tunnel.proxy_jump ? `通过跳板机 ${tunnel.proxy_jump}` : tunnel.proxy_command ? "自定义代理通道" : "直连目标主机"}</strong></span>
 </div>
 }
 
 >
 <TwoColumnGrid>
 <ConfigurationField label="跳板机中继 (ProxyJump)">
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <Input
     value={tunnel.proxy_jump || ""}
     onChange={(e) => updateTunnel({ proxy_jump: e.target.value || null })}
     placeholder="bastion-server 或 user@jump.host:22"
     mono
     />
   </div>
   <InlineMemoField
     value={tunnel.field_remarks?.ProxyJump || tunnel.field_remarks?.proxyjump || ""}
     onChange={(v) => updateTunnel({ field_remarks: { ...tunnel.field_remarks, proxyjump: v } })}
   />
 </div>
 </ConfigurationField>

 <ConfigurationField label="自定义代理命令 (ProxyCommand)">
 <Input
 value={tunnel.proxy_command || ""}
 onChange={(e) => updateTunnel({ proxy_command: e.target.value || null })}
 placeholder="nc -X 5 -x 127.0.0.1:1080 %h %p"
 mono
 />
 </ConfigurationField>
 </TwoColumnGrid>
 </ConfigurationCard>

 {/* 5. Multiplexing (连接多路复用) - 无冗余双写，一行两个 */}
 <ConfigurationCard
 title="连接多路复用 (Multiplexing)"
 icon={<Boxes className="h-4 w-4 text-cyan-500" />}
 summary={
 <div className="flex items-center gap-3">
 <span>主连接复用: <strong className={cn("font-mono", tunnel.control_master ? "text-foreground" : "text-muted-foreground/80 font-normal")}>{tunnel.control_master || "no (默认)"}</strong></span>
 {tunnel.control_persist && (
 <>
 <span>·</span>
 <span>保持: <strong className="font-mono text-foreground">{tunnel.control_persist}</strong></span>
 </>
 )}
 {tunnel.control_path && (
 <>
 <span>·</span>
 <span>套接字: <strong className="font-mono text-foreground">{tunnel.control_path}</strong></span>
 </>
 )}
 </div>
 }
 
 >
 {/* Row 1: ControlMaster + ControlPersist */}
 <TwoColumnGrid>
 <ConfigurationField label="主连接复用 (ControlMaster)">
 <Select
 value={tunnel.control_master || ""}
 onChange={(e) => updateTunnel({ control_master: e.target.value || null })}
 >
 <option value="">默认关闭 (no)</option>
 <option value="no">关闭 (no)</option>
 <option value="auto">自动复用 (auto)</option>
 <option value="yes">仅作为主连接 (yes)</option>
 <option value="ask">询问后复用 (ask)</option>
 <option value="autoask">自动创建并询问 (autoask)</option>
 </Select>
 </ConfigurationField>

 <ConfigurationField label="保持主连接 (ControlPersist)">
 <Input
 value={tunnel.control_persist || ""}
 onChange={(e) => updateTunnel({ control_persist: e.target.value || null })}
 placeholder="默认 no (或 600, 10m, yes)"
 mono
 />
 </ConfigurationField>
 </TwoColumnGrid>

 {/* Row 2: ControlPath */}
 <TwoColumnGrid>
 <ConfigurationField label="控制通道路径 (ControlPath)">
 <Input
 value={tunnel.control_path || ""}
 onChange={(e) => updateTunnel({ control_path: e.target.value || null })}
 placeholder="~/.ssh/cm-%C (默认基于哈希)"
 mono
 />
 </ConfigurationField>
 <div className="hidden md:block" />
 </TwoColumnGrid>
 </ConfigurationCard>

 {/* 6. Execution & Custom Arguments */}
 <ConfigurationCard
 title="SSH 执行与自定义参数 (Execution & Custom)"
 icon={<Terminal className="h-4 w-4 text-emerald-600" />}
 
 >
 <ConfigurationField label="连接成功后运行本地命令 (LocalCommand)">
 <Input
 value={tunnel.local_command || ""}
 onChange={(e) => updateTunnel({ local_command: e.target.value || null })}
 placeholder="say 'SSH Connected' 或自定义本地通知脚本"
 mono
 />
 </ConfigurationField>

 <TwoColumnGrid>
 <ConfigurationField label="自定义 SSH 客户端二进制路径">
 <Input
 value={tunnel.custom_ssh_path || ""}
 onChange={(e) => updateTunnel({ custom_ssh_path: e.target.value || null })}
 placeholder="留空使用系统默认 (/usr/bin/ssh 或 ssh.exe)"
 mono
 />
 </ConfigurationField>

 <ConfigurationField label="附加 SSH 参数 (Extra Options)">
 <Input
 value={tunnel.extra_options || ""}
 onChange={(e) => updateTunnel({ extra_options: e.target.value || null })}
 placeholder="-o ServerAliveInterval=15 -v"
 mono
 />
 </ConfigurationField>
 </TwoColumnGrid>
 </ConfigurationCard>
 </div>
 );
}
