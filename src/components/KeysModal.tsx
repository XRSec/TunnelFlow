import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { KeyRound, X, Copy, Check, ShieldCheck, Key } from "lucide-react";
import { SSHKeyInfo } from "@/types/tunnel";
import { Button } from "@/components/ui/Button";
interface KeysModalProps {
  isOpen: boolean;
  keys: SSHKeyInfo[];
  onClose: () => void;
}
export function KeysModal({
  isOpen,
  keys,
  onClose
}: KeysModalProps) {
  const {
    t
  } = useTranslation();
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  if (!isOpen) return null;
  const handleCopy = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-sm">{t("auto_1028")}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">{t("auto_1029")}{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{t("auto_1030")}</code>{" "}{t("auto_2217")}</p>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {keys.length === 0 ? <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">{t("auto_1031")}</div> : keys.map(k => <div key={k.path} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-background/60 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Key className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {k.display_title}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
                          {k.key_type}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground truncate mt-0.5">
                        {k.path}
                      </span>
                    </div>
                  </div>

                  <button type="button" onClick={() => handleCopy(k.path)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground shrink-0 border border-border/60 rounded px-2 py-1 bg-card hover:bg-muted" title={t("auto_2218")}>
                    {copiedPath === k.path ? <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span>{t("auto_2219")}</span>
                      </> : <>
                        <Copy className="h-3 w-3" />
                        <span>{t("auto_2220")}</span>
                      </>}
                  </button>
                </div>)}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end border-t border-border pt-3">
          <Button variant="primary" size="sm" onClick={onClose}>{t("auto_2221")}</Button>
        </div>
      </div>
    </div>;
}