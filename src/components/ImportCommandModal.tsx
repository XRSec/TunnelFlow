import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { Download, X, Terminal, AlertCircle, Check } from "lucide-react";
import { Tunnel, PortForwarding, ForwardType } from "@/types/tunnel";
import { Button } from "@/components/ui/Button";
import { generateUUID } from "@/lib/utils";
interface ImportCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (tunnel: Tunnel) => void;
}
export function ImportCommandModal({
  isOpen,
  onClose,
  onImport
}: ImportCommandModalProps) {
  const {
    t
  } = useTranslation();
  const [command, setCommand] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!isOpen) return null;
  const parseCommand = () => {
    setError(null);
    const trimmed = command.trim();
    if (!trimmed) {
      setError(t("auto_2222"));
      return;
    }
    try {
      // Split command respecting quotes
      const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
      const tokens: string[] = [];
      let match;
      while ((match = regex.exec(trimmed)) !== null) {
        tokens.push(match[1] || match[2] || match[0]);
      }
      if (tokens.length === 0 || tokens[0] !== "ssh") {
        setError(t("auto_2223"));
        return;
      }
      let host = "";
      let port = 22;
      const forwards: PortForwarding[] = [];
      let connectTimeout: number | null = null;
      let serverAliveInterval: number | null = null;
      let serverAliveCountMax: number | null = null;
      let compression = false;
      let identityFile: string | null = null;
      for (let i = 1; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === "-p" && i + 1 < tokens.length) {
          port = parseInt(tokens[++i]) || 22;
        } else if (token === "-i" && i + 1 < tokens.length) {
          identityFile = tokens[++i];
        } else if (token === "-C") {
          compression = true;
        } else if (token === "-L" && i + 1 < tokens.length) {
          const spec = tokens[++i];
          const parts = spec.split(":");
          if (parts.length === 4) {
            forwards.push({
              id: generateUUID(),
              forward: "local",
              bind_address: parts[0],
              port: parseInt(parts[1]) || 0,
              remote_host: parts[2],
              remote_port: parseInt(parts[3]) || 0,
              is_active: true
            });
          } else if (parts.length === 3) {
            forwards.push({
              id: generateUUID(),
              forward: "local",
              bind_address: "127.0.0.1",
              port: parseInt(parts[0]) || 0,
              remote_host: parts[1],
              remote_port: parseInt(parts[2]) || 0,
              is_active: true
            });
          }
        } else if (token === "-D" && i + 1 < tokens.length) {
          const spec = tokens[++i];
          const parts = spec.split(":");
          if (parts.length === 2) {
            forwards.push({
              id: generateUUID(),
              forward: "dynamic",
              bind_address: parts[0],
              port: parseInt(parts[1]) || 0,
              remote_host: "",
              remote_port: 0,
              is_active: true
            });
          } else {
            forwards.push({
              id: generateUUID(),
              forward: "dynamic",
              bind_address: "127.0.0.1",
              port: parseInt(parts[0]) || 0,
              remote_host: "",
              remote_port: 0,
              is_active: true
            });
          }
        } else if (token === "-R" && i + 1 < tokens.length) {
          const spec = tokens[++i];
          const parts = spec.split(":");
          if (parts.length === 4) {
            forwards.push({
              id: generateUUID(),
              forward: "remote",
              bind_address: parts[0],
              port: parseInt(parts[1]) || 0,
              remote_host: parts[2],
              remote_port: parseInt(parts[3]) || 0,
              is_active: true
            });
          }
        } else if (token === "-o" && i + 1 < tokens.length) {
          const opt = tokens[++i];
          const [k, v] = opt.split("=");
          if (k && v) {
            if (k.toLowerCase() === "connecttimeout") connectTimeout = parseInt(v) || null;
            if (k.toLowerCase() === "serveraliveinterval") serverAliveInterval = parseInt(v) || null;
            if (k.toLowerCase() === "serveralivecountmax") serverAliveCountMax = parseInt(v) || null;
          }
        } else if (!token.startsWith("-") && i === tokens.length - 1) {
          host = token;
        }
      }
      if (!host) {
        setError(t("auto_2224"));
        return;
      }
      const name = host.includes("@") ? host.split("@")[1] : host;
      const newTunnel: Tunnel = {
        id: generateUUID(),
        name: `${t("import.importedPrefix", "导入")}-${name}`,
        host,
        port,
        auto_connect: false,
        is_general_config: false,
        use_alias: false,
        forwards,
        custom_directives: [],
        compression,
        connect_timeout: connectTimeout,
        server_alive_interval: serverAliveInterval,
        server_alive_count_max: serverAliveCountMax,
        identity_file: identityFile
      };
      onImport(newTunnel);
      setCommand("");
      onClose();
    } catch (e: any) {
      setError(`解析命令失败: ${e.message || e}`);
    }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">{t("auto_1032")}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">{t("auto_1033")}{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{t("auto_1034")}</code>{t("auto_1035")}</p>

          <textarea value={command} onChange={e => setCommand(e.target.value)} placeholder="ssh -N -L 127.0.0.1:17892:[::]:7890 -o ConnectTimeout=30 vps1-ipv6" className="h-28 w-full rounded-lg border border-input bg-background/80 p-3 font-mono text-xs focus:border-primary focus:outline-hidden resize-none" />

          {error && <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>{t("auto_2225")}</Button>
          <Button variant="primary" size="sm" onClick={parseCommand}>
            <Download className="h-3.5 w-3.5" />
            <span>{t("auto_2226")}</span>
          </Button>
        </div>
      </div>
    </div>;
}