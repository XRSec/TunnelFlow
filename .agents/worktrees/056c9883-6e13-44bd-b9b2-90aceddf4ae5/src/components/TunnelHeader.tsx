import React, { useState } from "react";
import {
 Server,
 Zap,
 Square,
 ChevronDown,
 ChevronUp,
 Copy,
 Check,
 Globe,
 Terminal,
} from "lucide-react";
import { Tunnel, TunnelState } from "@/types/tunnel";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { Button } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
 handleWindowDragOrMaximize,
 handleWindowDoubleClick,
} from "@/lib/window";
import { formatSSHCommand } from "@/lib/sshCommand";

interface TunnelHeaderProps {
 tunnel: Tunnel;
 status: TunnelState;
 onConnect: () => void;
 onDisconnect: () => void;
 generalConfig?: Tunnel | null;
}

export function TunnelHeader({
 tunnel,
 status,
 onConnect,
 onDisconnect,
 generalConfig,
}: TunnelHeaderProps) {
 const [showCommand, setShowCommand] = useState(false);
 const [copied, setCopied] = useState(false);

 const lowerStatus = status?.toLowerCase() || "disconnected";
 const isConnected = lowerStatus === "connected";
 const isConnecting = lowerStatus === "connecting";

 const command = formatSSHCommand(tunnel, generalConfig);

 const handleCopy = () => {
 navigator.clipboard.writeText(command);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 const activeForwardsCount = tunnel.forwards.filter((f) => f.is_active).length;
  const hasActiveForwards = activeForwardsCount > 0;

 return (
 <div
 data-tauri-drag-region
 onMouseDown={handleWindowDragOrMaximize}
 onDoubleClick={handleWindowDoubleClick}
 className="border-b border-border/70 bg-card/60 px-6 py-4 backdrop-blur-xs "
 >
 <div className="w-full max-w-5xl 2xl:max-w-6xl mx-auto min-w-0">
 <div className="flex items-center justify-between gap-4">
 {/* Left: Icon, Name, Target */}
 <div className="flex items-center gap-3.5 min-w-0">
 <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
 <PlatformIcon tunnel={tunnel} className="h-5 w-5" />
 </div>

 <div className="flex flex-col min-w-0">
 <h1 className="text-base font-semibold text-foreground truncate leading-tight">
 {tunnel.name || "未命名主机"}
 </h1>
 <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 truncate">
 <span className="font-mono">{tunnel.host || tunnel.name}</span>
 <span>·</span>
 <div className="flex items-center gap-1.5">
 <StatusIndicator state={status} />
 <span className={cn("text-[11px]", lowerStatus === "error" && "text-red-500 font-medium")}>
 {isConnected
 ? `已连接 · ${activeForwardsCount} 条转发`
 : isConnecting
 ? "连接中..."
 : lowerStatus === "error"
 ? "连接失败"
 : `未连接 · ${activeForwardsCount} 条转发`}
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Right: Connect / Disconnect button */}
 {!tunnel.is_general_config && (
 <div className="flex items-center gap-2">
 {isConnected ? (
 <Button
 variant="outline"
 size="md"
 onClick={() => onDisconnect()}
 className="font-medium px-4 shadow-sm hover:text-red-600 hover:border-red-600/30 dark:hover:text-red-400 dark:hover:border-red-400/30"
 >
 <Square className="h-3.5 w-3.5 fill-current" />
 <span>断开连接</span>
 </Button>
 ) : (
 <Button
            variant="primary"
            size="md"
            onClick={() => onConnect()}
            disabled={isConnecting || !hasActiveForwards}
            className="font-medium px-5 shadow-sm"
            title={!hasActiveForwards ? "未配置端口转发，无法启动" : undefined}
          >
 <Zap className="h-3.5 w-3.5 fill-current" />
 {isConnecting ? (<div className="flex items-center">
            <svg className="animate-spin h-3.5 w-3.5 text-current mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="flex items-center">连接中...</span>
</div>) : (<span>连接</span>)}
 </Button>
 )}
 </div>
 )}
 </div>

 {/* Collapsible SSH Command Preview */}
 {!tunnel.is_general_config && (
 <div className="mt-3 w-full">
 <button
 type="button"
 onClick={() => setShowCommand(!showCommand)}
 className="flex w-full items-center justify-between gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
 >
 <div className="flex items-center gap-1.5 min-w-0 flex-1">
 <Terminal className="h-3.5 w-3.5 text-primary shrink-0" />
 <span className="font-mono font-medium shrink-0">SSH</span>
 <span className="truncate flex-1 min-w-0 font-mono opacity-80 text-left">{command}</span>
 </div>
 <div className="flex items-center gap-1 shrink-0 text-muted-foreground ml-2">
 <span className="text-[10px] opacity-70 hidden sm:inline">{showCommand ? "收起" : "展开"}</span>
 {showCommand ? (
 <ChevronUp className="h-3.5 w-3.5" />
 ) : (
 <ChevronDown className="h-3.5 w-3.5" />
 )}
 </div>
 </button>

 {showCommand && (
 <div className="relative mt-2 w-full rounded-lg border border-border/80 bg-background/80 p-3 font-mono text-xs leading-relaxed text-foreground select-text shadow-xs min-w-0 overflow-hidden">
 <pre className="overflow-x-auto whitespace-pre-wrap break-words pr-8 min-w-0 overflow-hidden">
 {command}
 </pre>
 <button
 type="button"
 onClick={handleCopy}
 className="absolute top-2.5 right-2.5 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
 title="复制完整 SSH 命令"
 >
 {copied ? (
 <Check className="h-3.5 w-3.5 text-emerald-500" />
 ) : (
 <Copy className="h-3.5 w-3.5" />
 )}
 </button>
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 );
}
