import React, { useState, useEffect } from "react";
import { X, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface UpdateInfo {
  has_update: boolean;
  latest_version: string;
  current_version: string;
  release_notes: string;
  asset_download_url: string;
  release_date: string;
}

export function UpdateModal({
  isOpen,
  onClose,
  updateInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
}) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const unlisten = listen<number>("update-download-progress", (event) => {
      setProgress(event.payload);
    });
    return () => {
      unlisten.then(f => f());
    };
  }, [isOpen]);

  if (!isOpen || !updateInfo) return null;

  const handleUpdate = async () => {
    try {
      setDownloading(true);
      setError("");
      await invoke("download_and_install_update", { downloadUrl: updateInfo.asset_download_url });
    } catch (e) {
      setError(String(e));
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Download size={14} className="text-primary" />
            发现新版本
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            disabled={downloading}
          >
            <X size={14} />
          </button>
        </div>
        
        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">当前版本: <span className="font-mono">{updateInfo.current_version}</span></span>
            <span className="text-primary font-medium">最新版本: <span className="font-mono">{updateInfo.latest_version}</span></span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
            <Info size={10} /> 发布日期: {updateInfo.release_date}
          </div>

          <div className="mt-2 flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-foreground">更新日志:</span>
            <div className="bg-muted/30 p-2.5 rounded-lg border border-border/40 text-[11px] text-muted-foreground whitespace-pre-wrap max-h-[150px] overflow-y-auto custom-scrollbar">
              {updateInfo.release_notes || "无更新日志"}
            </div>
          </div>

          {error && (
            <div className="mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
              更新失败: {error}
            </div>
          )}

          {downloading && (
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                <span>下载中...</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted overflow-hidden rounded-full">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/40 bg-muted/20 px-5 py-3 flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-xs h-7"
            disabled={downloading}
          >
            取消
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleUpdate}
            className="text-xs h-7"
            disabled={downloading}
          >
            {downloading ? "更新中..." : "立即更新"}
          </Button>
        </div>
      </div>
    </div>
  );
}
