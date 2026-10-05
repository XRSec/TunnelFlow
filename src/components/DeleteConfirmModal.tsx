import { useTranslation } from "react-i18next";
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
  onClose
}: DeleteConfirmModalProps) {
  const {
    t
  } = useTranslation();
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
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-in fade-in-50 duration-150">
      <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-5 text-card-foreground shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 text-destructive">
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-foreground">{t("auto_2208")}</h2>
              <span className="text-[11px] text-muted-foreground">{t("auto_2209")}</span>
            </div>
          </div>

          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="rounded-lg border border-border/70 bg-background/50 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("auto_2210")}</span>
            <strong className="font-mono text-foreground font-semibold">
              {tunnel.name}
            </strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("auto_2211")}</span>
            <span className="font-mono text-muted-foreground truncate max-w-[200px]">
              {tunnel.host || t("auto_2212")}
            </span>
          </div>
          {tunnel.forwards && tunnel.forwards.length > 0 && <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("auto_2213")}</span>
              <span className="font-mono text-muted-foreground">
                {tunnel.forwards.length}{t("auto_2214")}</span>
            </div>}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{t("auto_2215")}{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">{t("auto_1025")}</code>{" "}{t("auto_2216")}</p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
          <Button variant="outline" size="sm" onClick={onClose}>{t("auto_1026")}</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            <span>{t("auto_1027")}</span>
          </Button>
        </div>
      </div>
    </div>;
}