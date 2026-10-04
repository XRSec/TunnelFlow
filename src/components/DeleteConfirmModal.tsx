import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Tunnel } from "@/types/tunnel";
import { Button } from "@/components/ui/Button";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  tunnel: Tunnel | null;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  tunnel,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter") {
        onConfirm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onConfirm, onClose]);

  if (!isOpen || !tunnel) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-in fade-in-50 duration-150">
      <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-5 text-card-foreground shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 text-destructive">
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground">
                删除主机配置
              </h2>
              <span className="text-[11px] text-muted-foreground">
                该操作不可逆，将永久从配置文件中移除
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="rounded-lg border border-border/70 bg-background/50 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">主机名称 / 别名:</span>
            <strong className="font-mono text-foreground font-semibold">
              {tunnel.name}
            </strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">连接目标:</span>
            <span className="font-mono text-muted-foreground truncate max-w-[200px]">
              {tunnel.host || "(同别名)"}
            </span>
          </div>
          {tunnel.forwards && tunnel.forwards.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">包含端口转发:</span>
              <span className="font-mono text-muted-foreground">
                {tunnel.forwards.length} 条转发规则
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          确认删除后，此主机的所有配置将从{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
            ~/.ssh/config
          </code>{" "}
          中彻底抹除，运行中的隧道也将被终止。
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
          <Button variant="outline" size="sm" onClick={onClose}>
            取消 (Esc)
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            <span>确定删除 (Enter)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
