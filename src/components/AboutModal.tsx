import React, { useState, useEffect } from "react";
import { X, ExternalLink, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from "@tauri-apps/api/core";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

export function AboutModal({
  isOpen,
  onClose,
  onCheckUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCheckUpdate: () => void;
}) {
  const [version, setVersion] = useState("1.0.0");
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [upToDateMsg, setUpToDateMsg] = useState("");
  const [autoCheckUpdate, setAutoCheckUpdate] = useState(true);

  useEffect(() => {
    if (isOpen) {
      getVersion().then(setVersion).catch(console.error);
      isEnabled().then(setAutostartEnabled).catch(console.error);
      setUpToDateMsg("");
      const autoCheckStr = localStorage.getItem("tunnelflow:auto_check_update");
      setAutoCheckUpdate(autoCheckStr !== "false");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleAutostart = async () => {
    try {
      if (autostartEnabled) {
        await disable();
        setAutostartEnabled(false);
      } else {
        await enable();
        setAutostartEnabled(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAutoCheckUpdate = () => {
    const nextState = !autoCheckUpdate;
    setAutoCheckUpdate(nextState);
    localStorage.setItem("tunnelflow:auto_check_update", String(nextState));
  };

  const handleUpdateCheck = async () => {
    try {
      setCheckingUpdate(true);
      setUpToDateMsg("");
      const info: any = await invoke("check_for_updates");
      if (info && info.has_update) {
        onCheckUpdate(); // Trigger parent to open update modal
        onClose(); // Close this modal
      } else {
        setUpToDateMsg("当前已是最新版本");
      }
    } catch (e) {
      setUpToDateMsg("检查更新失败: " + String(e));
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/50 backdrop-blur-sm">
      <div className="relative w-full max-w-[340px] sm:max-w-md w-full overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            关于
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        
        <div className="px-6 py-6 flex flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm font-bold text-lg">
            TF
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground">TunnelFlow</h1>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full mt-1">v{version}</span>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-1 mb-2">
            现代化的跨平台 SSH 隧道管理器。<br/>
            本地、远程、动态端口转发，SSH Config 双向同步。
          </p>

          <div className="w-full h-px bg-border/50 my-2" />

          <div className="w-full flex items-center justify-between text-xs mb-1">
            <span className="text-foreground font-medium flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> 开机自动启动</span>
            <button 
              onClick={toggleAutostart}
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${autostartEnabled ? 'bg-primary' : 'bg-input'}`}
            >
              <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${autostartEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="w-full flex items-center justify-between text-xs mb-1">
            <span className="text-foreground font-medium flex items-center gap-1.5"><RefreshCw size={14} className="text-blue-500" /> 自动检测更新</span>
            <button 
              onClick={toggleAutoCheckUpdate}
              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${autoCheckUpdate ? 'bg-primary' : 'bg-input'}`}
            >
              <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${autoCheckUpdate ? 'translate-x-3' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="w-full flex flex-col gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleUpdateCheck}
              disabled={checkingUpdate}
              className="text-xs h-8 w-full flex items-center justify-center gap-1.5"
            >
              {checkingUpdate ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              {checkingUpdate ? "正在检查..." : "检查更新"}
            </Button>
            {upToDateMsg && (
              <span className="text-[10px] text-center text-muted-foreground animate-in fade-in">{upToDateMsg}</span>
            )}
          </div>
        </div>

        <div className="border-t border-border/40 bg-muted/20 px-5 py-3 flex items-center justify-between">
          <a href="https://github.com/XRSec/TunnelFlow" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            GitHub <ExternalLink size={10} />
          </a>
          <span className="text-[10px] text-muted-foreground/60">MIT License © XRSec</span>
        </div>
      </div>
    </div>
  );
}
