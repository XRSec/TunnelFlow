import { useTranslation } from "react-i18next";
import React from "react";
import { cn } from "@/lib/utils";
import { Sliders, Activity, KeyRound, GitFork, Boxes, Terminal, FolderOpen, Key } from "lucide-react";
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
  generalConfig
}: ConnectionTabProps) {
  const {
    t
  } = useTranslation();
  const inheritedKey = generalConfig?.identity_file ? generalConfig.identity_file.replace(/^.*[\\/]/, "") : "";
  const updateTunnel = (patch: Partial<Tunnel>) => {
    onChange({
      ...tunnel,
      ...patch
    });
  };
  return <div className="space-y-4">
 {/* 1. Connection Behavior */}
 <ConfigurationCard title={t("auto_2100")} icon={<Sliders className="h-4 w-4 text-primary" />} summary={<div className="flex items-center gap-3">
 <span>{t("auto_2101")}<strong className={cn("font-mono", tunnel.log_level ? "text-foreground" : "text-muted-foreground/80 font-normal")}>{tunnel.log_level || "INFO"}</strong></span>
 <span>·</span>
 <span>{t("auto_2102")}<strong className={cn("font-mono", tunnel.connection_attempts ? "text-foreground" : "text-muted-foreground/80 font-normal")}>{tunnel.connection_attempts || 1}{t("auto_2103")}</strong></span>
 <span>·</span>
 <span>{t("auto_2104")}<strong className={cn("font-mono", tunnel.address_family ? "text-foreground" : "text-muted-foreground/80 font-normal")}>{tunnel.address_family || "any"}</strong></span>
 {tunnel.compression && <>
 <span>·</span>
 <span className="text-primary font-medium">{t("auto_2105")}</span>
 </>}
 </div>}>
 {/* Row 1: LogLevel + ConnectionAttempts */}
 <TwoColumnGrid>
 <ConfigurationField label={t("auto_2106")}>
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <Select value={tunnel.log_level || ""} onChange={e => updateTunnel({
                log_level: e.target.value || null
              })}>
     <option value="">{t("auto_1005")}</option>
     <option value="QUIET">{t("auto_1006")}</option>
     <option value="INFO">{t("auto_1007")}</option>
     <option value="VERBOSE">{t("auto_1008")}</option>
     <option value="DEBUG1">{t("auto_1009")}</option>
     <option value="DEBUG2">{t("auto_1010")}</option>
     <option value="DEBUG3">{t("auto_1011")}</option>
     </Select>
   </div>
   <InlineMemoField value={tunnel.field_remarks?.LogLevel || tunnel.field_remarks?.loglevel || ""} onChange={v => updateTunnel({
              field_remarks: {
                ...tunnel.field_remarks,
                loglevel: v
              }
            })} />
 </div>
 </ConfigurationField>

 <ConfigurationField label={t("auto_2107")}>
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <Input type="number" value={tunnel.connection_attempts || ""} onChange={e => updateTunnel({
                connection_attempts: e.target.value ? parseInt(e.target.value) : null
              })} placeholder={t("auto_2108")} mono />
   </div>
   <InlineMemoField value={tunnel.field_remarks?.ConnectionAttempts || tunnel.field_remarks?.connectionattempts || ""} onChange={v => updateTunnel({
              field_remarks: {
                ...tunnel.field_remarks,
                connectionattempts: v
              }
            })} />
 </div>
 </ConfigurationField>
 </TwoColumnGrid>

 {/* Row 2: BindAddress + AddressFamily */}
 <TwoColumnGrid>
 <ConfigurationField label={t("auto_2109")}>
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <Input value={tunnel.bind_address || ""} onChange={e => updateTunnel({
                bind_address: e.target.value || null
              })} placeholder={t("auto_2110")} mono />
   </div>
   <InlineMemoField value={tunnel.field_remarks?.BindAddress || tunnel.field_remarks?.bindaddress || ""} onChange={v => updateTunnel({
              field_remarks: {
                ...tunnel.field_remarks,
                bindaddress: v
              }
            })} />
 </div>
 </ConfigurationField>

 <ConfigurationField label={t("auto_2111")}>
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <Select value={tunnel.address_family || ""} onChange={e => updateTunnel({
                address_family: e.target.value || null
              })}>
     <option value="">{t("auto_1012")}</option>
     <option value="inet">{t("auto_1013")}</option>
     <option value="inet6">{t("auto_1014")}</option>
     </Select>
   </div>
   <InlineMemoField value={tunnel.field_remarks?.AddressFamily || tunnel.field_remarks?.addressfamily || ""} onChange={v => updateTunnel({
              field_remarks: {
                ...tunnel.field_remarks,
                addressfamily: v
              }
            })} />
 </div>
 </ConfigurationField>
 </TwoColumnGrid>

 {/* Row 3: Compression + Host Key Check */}
 <TwoColumnGrid className="pt-1">
 <Toggle title={t("auto_2112")} description={t("auto_2113")} checked={!!tunnel.compression} onChange={checked => updateTunnel({
          compression: checked
        })} memo={<InlineMemoField value={tunnel.field_remarks?.Compression || tunnel.field_remarks?.compression || ""} onChange={v => updateTunnel({
          field_remarks: {
            ...tunnel.field_remarks,
            compression: v
          }
        })} />} />

 <Toggle title={t("auto_2114")} description={t("auto_2115")} checked={!!tunnel.skip_host_key_check} onChange={checked => updateTunnel({
          skip_host_key_check: checked
        })} memo={<InlineMemoField value={tunnel.field_remarks?.StrictHostKeyChecking || tunnel.field_remarks?.stricthostkeychecking || ""} onChange={v => updateTunnel({
          field_remarks: {
            ...tunnel.field_remarks,
            stricthostkeychecking: v
          }
        })} />} />
 </TwoColumnGrid>
 </ConfigurationCard>

 {/* 2. Resilience (连接保活与弹性) - 严格一行两个 */}
 <ConfigurationCard title={t("auto_2116")} icon={<Activity className="h-4 w-4 text-emerald-500" />} summary={<div className="flex items-center gap-3">
 <span>{t("auto_2117")}<strong className="font-mono text-foreground">{tunnel.server_alive_interval ? `${tunnel.server_alive_interval}s` : t("auto_2118")}</strong></span>
 <span>·</span>
 <span>{t("auto_2119")}<strong className="font-mono text-foreground">{tunnel.server_alive_count_max ? `${tunnel.server_alive_count_max}次` : t("auto_2120")}</strong></span>
 <span>·</span>
 <span>{t("auto_2121")}<strong className="font-mono text-foreground">{tunnel.connect_timeout ? `${tunnel.connect_timeout}s` : t("auto_2122")}</strong></span>
 </div>}>
 {/* Row 1: ServerAliveInterval + ServerAliveCountMax */}
 <TwoColumnGrid>
 <ConfigurationField label={t("auto_2123")}>
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <div className="flex items-center gap-2">
     <Input type="number" value={tunnel.server_alive_interval || ""} onChange={e => updateTunnel({
                  server_alive_interval: e.target.value ? parseInt(e.target.value) : null
                })} placeholder={t("auto_2124")} mono />
     <span className="text-xs text-muted-foreground shrink-0">{t("auto_2125")}</span>
     </div>
   </div>
   <InlineMemoField value={tunnel.field_remarks?.ServerAliveInterval || tunnel.field_remarks?.serveraliveinterval || ""} onChange={v => updateTunnel({
              field_remarks: {
                ...tunnel.field_remarks,
                serveraliveinterval: v
              }
            })} />
 </div>
 </ConfigurationField>

 <ConfigurationField label={t("auto_2126")}>
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <div className="flex items-center gap-2">
     <Input type="number" value={tunnel.server_alive_count_max || ""} onChange={e => updateTunnel({
                  server_alive_count_max: e.target.value ? parseInt(e.target.value) : null
                })} placeholder={t("auto_2127")} mono />
     <span className="text-xs text-muted-foreground shrink-0">{t("auto_2128")}</span>
     </div>
   </div>
   <InlineMemoField value={tunnel.field_remarks?.ServerAliveCountMax || tunnel.field_remarks?.serveralivecountmax || ""} onChange={v => updateTunnel({
              field_remarks: {
                ...tunnel.field_remarks,
                serveralivecountmax: v
              }
            })} />
 </div>
 </ConfigurationField>
 </TwoColumnGrid>

 {/* Row 2: ConnectTimeout */}
 <TwoColumnGrid>
 <ConfigurationField label={t("auto_2129")}>
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <div className="flex items-center gap-2">
     <Input type="number" value={tunnel.connect_timeout || ""} onChange={e => updateTunnel({
                  connect_timeout: e.target.value ? parseInt(e.target.value) : null
                })} placeholder={t("auto_2130")} mono />
     <span className="text-xs text-muted-foreground shrink-0">{t("auto_2131")}</span>
     </div>
   </div>
   <InlineMemoField value={tunnel.field_remarks?.ConnectTimeout || tunnel.field_remarks?.connecttimeout || ""} onChange={v => updateTunnel({
              field_remarks: {
                ...tunnel.field_remarks,
                connecttimeout: v
              }
            })} />
 </div>
 </ConfigurationField>
  <Toggle title={t("auto_2132")} description={t("auto_2133")} checked={!!tunnel.tcp_keep_alive} onChange={checked => updateTunnel({
          tcp_keep_alive: checked
        })} memo={<InlineMemoField value={tunnel.field_remarks?.TCPKeepAlive || tunnel.field_remarks?.tcpkeepalive || ""} onChange={v => updateTunnel({
          field_remarks: {
            ...tunnel.field_remarks,
            tcpkeepalive: v
          }
        })} />} />
 </TwoColumnGrid>
 </ConfigurationCard>

 {/* 3. Authentication & Keys (身份认证与密钥) - 严格一行两个 */}
 <ConfigurationCard title={t("auto_2134")} icon={<KeyRound className="h-4 w-4 text-amber-500" />} headerAction={onOpenKeysManager && <Button variant="ghost" size="xs" onClick={onOpenKeysManager} className="text-xs gap-1">
 <Key className="h-3.5 w-3.5" />
 <span>{t("auto_2135")}</span>
 </Button>} summary={<div className="flex items-center gap-3">
 <span>{t("auto_2136")}<strong className={cn("font-mono", tunnel.identity_file ? "text-foreground" : "text-muted-foreground/80 font-normal")}>{tunnel.identity_file || t("auto_2137")}</strong></span>
 {tunnel.forward_agent && <>
 <span>·</span>
 <span className="text-primary font-medium">{t("auto_2138")}</span>
 </>}
 {tunnel.identities_only && <>
 <span>·</span>
 <span className="text-amber-500 font-medium">{t("auto_2139")}</span>
 </>}
 </div>}>
 {/* Row 1: IdentityFile + CertificateFile */}
 <TwoColumnGrid>
 <ConfigurationField label={t("auto_2140")}>
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <div className="flex items-center gap-2">
     <Select value={tunnel.identity_file || ""} onChange={e => updateTunnel({
                  identity_file: e.target.value || null
                })}>
     <option value="">{!tunnel.is_general_config && inheritedKey ? `继承全局默认 (${inheritedKey})` : t("auto_2141")}</option>
     {keys.map(k => <option key={k.path} value={k.path}>
     {k.display_title}
     </option>)}
     </Select>
     <Button variant="outline" size="icon" onClick={() => {
                  const input = prompt(t("auto_2142"));
                  if (input) updateTunnel({
                    identity_file: input.trim()
                  });
                }} title={t("auto_2143")}>
     <FolderOpen className="h-3.5 w-3.5" />
     </Button>
     </div>
   </div>
   <InlineMemoField value={tunnel.field_remarks?.IdentityFile || tunnel.field_remarks?.identityfile || ""} onChange={v => updateTunnel({
              field_remarks: {
                ...tunnel.field_remarks,
                identityfile: v
              }
            })} />
 </div>
 </ConfigurationField>

 <ConfigurationField label={t("auto_2144")}>
 <div className="flex items-center gap-2">
 <Input value={tunnel.certificate_file || ""} onChange={e => updateTunnel({
              certificate_file: e.target.value || null
            })} placeholder={t("auto_2145")} mono />
 <Button variant="outline" size="icon" onClick={() => {
              const input = prompt(t("auto_2146"));
              if (input) updateTunnel({
                certificate_file: input.trim()
              });
            }} title={t("auto_2147")}>
 <FolderOpen className="h-3.5 w-3.5" />
 </Button>
 </div>
 </ConfigurationField>
 </TwoColumnGrid>

 {/* Row 2: ForwardAgent + IdentitiesOnly */}
 <TwoColumnGrid className="pt-1">
 <Toggle title={t("auto_2148")} description={t("auto_2149")} checked={!!tunnel.forward_agent} onChange={checked => updateTunnel({
          forward_agent: checked
        })} memo={<InlineMemoField value={tunnel.field_remarks?.ForwardAgent || tunnel.field_remarks?.forwardagent || ""} onChange={v => updateTunnel({
          field_remarks: {
            ...tunnel.field_remarks,
            forwardagent: v
          }
        })} />} />

 <Toggle title={t("auto_2150")} description={t("auto_2151")} checked={!!tunnel.identities_only} onChange={checked => updateTunnel({
          identities_only: checked
        })} memo={<InlineMemoField value={tunnel.field_remarks?.IdentitiesOnly || tunnel.field_remarks?.identitiesonly || ""} onChange={v => updateTunnel({
          field_remarks: {
            ...tunnel.field_remarks,
            identitiesonly: v
          }
        })} />} />
 </TwoColumnGrid>
 </ConfigurationCard>

 {/* 4. Jump & Proxy (跳板机与网络路由) */}
 <ConfigurationCard title={t("auto_2152")} icon={<GitFork className="h-4 w-4 text-purple-500" />} summary={<div className="flex items-center gap-3">
 <span>{t("auto_2153")}<strong className={cn("font-mono", tunnel.proxy_jump || tunnel.proxy_command ? "text-foreground" : "text-muted-foreground/80 font-normal")}>{tunnel.proxy_jump ? `通过跳板机 ${tunnel.proxy_jump}` : tunnel.proxy_command ? t("auto_2154") : t("auto_2155")}</strong></span>
 </div>}>
 <TwoColumnGrid>
 <ConfigurationField label={t("auto_2156")}>
 <div className="flex items-center gap-1.5 w-full overflow-hidden">
   <div className="flex-1 min-w-[90px]">
     <Input value={tunnel.proxy_jump || ""} onChange={e => updateTunnel({
                proxy_jump: e.target.value || null
              })} placeholder={t("auto_2157")} mono />
   </div>
   <InlineMemoField value={tunnel.field_remarks?.ProxyJump || tunnel.field_remarks?.proxyjump || ""} onChange={v => updateTunnel({
              field_remarks: {
                ...tunnel.field_remarks,
                proxyjump: v
              }
            })} />
 </div>
 </ConfigurationField>

 <ConfigurationField label={t("auto_2158")}>
 <Input value={tunnel.proxy_command || ""} onChange={e => updateTunnel({
            proxy_command: e.target.value || null
          })} placeholder="nc -X 5 -x 127.0.0.1:1080 %h %p" mono />
 </ConfigurationField>
 </TwoColumnGrid>
 </ConfigurationCard>

 {/* 5. Multiplexing (连接多路复用) - 无冗余双写，一行两个 */}
 <ConfigurationCard title={t("auto_2159")} icon={<Boxes className="h-4 w-4 text-cyan-500" />} summary={<div className="flex items-center gap-3">
 <span>{t("auto_2160")}<strong className={cn("font-mono", tunnel.control_master ? "text-foreground" : "text-muted-foreground/80 font-normal")}>{tunnel.control_master || t("auto_2161")}</strong></span>
 {tunnel.control_persist && <>
 <span>·</span>
 <span>{t("auto_2162")}<strong className="font-mono text-foreground">{tunnel.control_persist}</strong></span>
 </>}
 {tunnel.control_path && <>
 <span>·</span>
 <span>{t("auto_2163")}<strong className="font-mono text-foreground">{tunnel.control_path}</strong></span>
 </>}
 </div>}>
 {/* Row 1: ControlMaster + ControlPersist */}
 <TwoColumnGrid>
 <ConfigurationField label={t("auto_2164")}>
 <Select value={tunnel.control_master || ""} onChange={e => updateTunnel({
            control_master: e.target.value || null
          })}>
 <option value="">{t("auto_1015")}</option>
 <option value="no">{t("auto_1016")}</option>
 <option value="auto">{t("auto_1017")}</option>
 <option value="yes">{t("auto_1018")}</option>
 <option value="ask">{t("auto_1019")}</option>
 <option value="autoask">{t("auto_1020")}</option>
 </Select>
 </ConfigurationField>

 <ConfigurationField label={t("auto_2165")}>
 <Input value={tunnel.control_persist || ""} onChange={e => updateTunnel({
            control_persist: e.target.value || null
          })} placeholder={t("auto_2166")} mono />
 </ConfigurationField>
 </TwoColumnGrid>

 {/* Row 2: ControlPath */}
 <TwoColumnGrid>
 <ConfigurationField label={t("auto_2167")}>
 <Input value={tunnel.control_path || ""} onChange={e => updateTunnel({
            control_path: e.target.value || null
          })} placeholder={t("auto_2168")} mono />
 </ConfigurationField>
 <div className="hidden md:block" />
 </TwoColumnGrid>
 </ConfigurationCard>

 {/* 6. Execution & Custom Arguments */}
 <ConfigurationCard title={t("auto_2169")} icon={<Terminal className="h-4 w-4 text-emerald-600" />}>
 <ConfigurationField label={t("auto_2170")}>
 <Input value={tunnel.local_command || ""} onChange={e => updateTunnel({
          local_command: e.target.value || null
        })} placeholder={t("auto_2171")} mono />
 </ConfigurationField>

 <TwoColumnGrid>
 <ConfigurationField label={t("auto_2172")}>
 <Input value={tunnel.custom_ssh_path || ""} onChange={e => updateTunnel({
            custom_ssh_path: e.target.value || null
          })} placeholder={t("auto_2173")} mono />
 </ConfigurationField>

 <ConfigurationField label={t("auto_2174")}>
 <Input value={tunnel.extra_options || ""} onChange={e => updateTunnel({
            extra_options: e.target.value || null
          })} placeholder="-o ServerAliveInterval=15 -v" mono />
 </ConfigurationField>
 </TwoColumnGrid>
 </ConfigurationCard>
 </div>;
}