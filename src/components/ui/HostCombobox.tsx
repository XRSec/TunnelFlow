import { useTranslation } from "react-i18next";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, X, Check, Server, Globe, Laptop } from "lucide-react";
import { Tunnel } from "@/types/tunnel";
import { cn } from "@/lib/utils";

export interface HostOption {
  value: string;
  label?: string;
  category: "tunnels" | "known_hosts" | "common";
  badge?: string;
}

interface HostComboboxProps {
  currentTunnelId?: string;
  excludeName?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  tunnels?: Tunnel[];
  knownHosts?: string[];
  className?: string;
  mode?: "address" | "alias";
}

export function HostCombobox({
  value,
  onChange,
  placeholder,
  disabled = false,
  tunnels = [],
  knownHosts = [],
  className,
  mode = "address",
  currentTunnelId,
  excludeName,
}: HostComboboxProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectivePlaceholder =
    placeholder ||
    (mode === "alias"
      ? t("hostCombobox.placeholderAlias", "选择或输入 ~/.ssh/config 主机别名...")
      : t("hostCombobox.placeholderHost", "输入或选择主机地址 (IP / 域名)..."));

  // Common loopback / local hosts (for address mode)
  const commonHosts: HostOption[] = [
    { value: "127.0.0.1", label: t("hostCombobox.loopback", "本地环回 (Loopback)"), category: "common", badge: "IPv4" },
    { value: "localhost", label: t("hostCombobox.localDomain", "本机域名"), category: "common", badge: "Local" },
    { value: "0.0.0.0", label: t("hostCombobox.allInterfaces", "所有网络接口"), category: "common", badge: "All Bind" },
    { value: "::1", label: t("hostCombobox.ipv6Loopback", "IPv6 本地环回"), category: "common", badge: "IPv6" },
  ];

  // Extract hosts from existing tunnels based on mode
  const tunnelHosts = useMemo<HostOption[]>(() => {
    const list: HostOption[] = [];
    const seen = new Set<string>();

    if (mode === "alias") {
      // In ALIAS mode: value is the alias name (tunnelItem.name)
      tunnels.forEach((tunnelItem) => {
        if (tunnelItem.id === currentTunnelId || tunnelItem.name === excludeName) return;
        if (tunnelItem.is_general_config || tunnelItem.name === "*") {
          list.push({
            value: "*",
            label: "Host * (全局配置，所有主机的默认继承值)",
            category: "tunnels",
            badge: "全局默认",
          });
          return;
        }
        
        const alias = tunnelItem.name?.trim();
        if (!alias || alias === "*" || seen.has(alias)) return;
        seen.add(alias);

        const hostPart = tunnelItem.host.includes("@") ? tunnelItem.host.split("@")[1] : tunnelItem.host;
        list.push({
          value: alias, // Fills in the alias!
          label: hostPart && hostPart !== alias ? hostPart : undefined,
          category: "tunnels",
          badge: tunnelItem.group || t("hostCombobox.existingAliases", "已有别名"),
        });
      });
    } else {
      // In ADDRESS mode: value is the real host/IP address (hostPart)
      tunnels.forEach((tunnelItem) => {
        if (tunnelItem.is_general_config) return;
        if (tunnelItem.id === currentTunnelId || tunnelItem.name === excludeName) return;
        const hostPart = tunnelItem.host.includes("@") ? tunnelItem.host.split("@")[1] : tunnelItem.host;
        if (!hostPart || hostPart === "*" || seen.has(hostPart)) return;
        seen.add(hostPart);

        list.push({
          value: hostPart, // Fills in the address!
          label: tunnelItem.name && tunnelItem.name !== hostPart ? tunnelItem.name : undefined,
          category: "tunnels",
          badge: tunnelItem.group || t("hostCombobox.existingHosts", "已有主机"),
        });
      });
    }

    return list;
  }, [tunnels, mode]);

  // Extract from known_hosts (only in address mode)
  const knownHostOptions = useMemo<HostOption[]>(() => {
    if (mode === "alias") return [];
    const seen = new Set(tunnelHosts.map((h) => h.value));
    return knownHosts
      .filter((h) => h && !seen.has(h))
      .map((h) => ({
        value: h,
        category: "known_hosts",
        badge: "Known Host",
      }));
  }, [knownHosts, tunnelHosts, mode]);

  // Filtered options based on current input text
  const filteredOptions = useMemo(() => {
    const q = (value || "").toLowerCase().trim();
    const all =
      mode === "alias"
        ? tunnelHosts
        : [...tunnelHosts, ...knownHostOptions, ...commonHosts];
    if (!q) return all;

    return all.filter((opt) => {
      const matchVal = opt.value.toLowerCase().includes(q);
      const matchLabel = opt.label?.toLowerCase().includes(q);
      const matchBadge = opt.badge?.toLowerCase().includes(q);
      return matchVal || matchLabel || matchBadge;
    });
  }, [value, tunnelHosts, knownHostOptions, commonHosts, mode]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(0);
      } else {
        setActiveIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setActiveIndex(filteredOptions.length - 1);
      } else {
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
      }
    } else if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && activeIndex < filteredOptions.length) {
        e.preventDefault();
        selectOption(filteredOptions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const selectOption = (opt: HostOption) => {
    setIsTyping(false);
    onChange(opt.value);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Group filtered options by category
  const grouped = useMemo(() => {
    const tunnelsGroup = filteredOptions.filter((o) => o.category === "tunnels");
    const knownGroup = filteredOptions.filter((o) => o.category === "known_hosts");
    const commonGroup = filteredOptions.filter((o) => o.category === "common");
    return { tunnelsGroup, knownGroup, commonGroup };
  }, [filteredOptions]);

  let globalIndexCounter = -1;

  return (
    <div ref={containerRef} className={cn("relative w-full z-30", className)}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={effectivePlaceholder}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onFocus={() => {
            if (!disabled) {
              setIsTyping(false);
              setIsOpen(true);
            }
          }}
          onClick={() => {
            if (!disabled) {
              setIsTyping(false);
              setIsOpen(true);
            }
          }}
          onChange={(e) => {
            setIsTyping(true);
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-9 w-full rounded-md border border-input/80 bg-background/60 px-3 py-1 text-xs font-mono shadow-2xs transition-colors",
            "pr-14 placeholder:text-muted-foreground/60 placeholder:font-sans",
            "focus-visible:outline-hidden focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20",
            disabled && "cursor-not-allowed opacity-50 bg-muted/30"
          )}
        />

        <div className="absolute right-1.5 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => {
                setIsTyping(false);
                onChange("");
                inputRef.current?.focus();
              }}
              className="p-1 text-muted-foreground/60 hover:text-foreground rounded transition-colors cursor-pointer"
              title={t("hostCombobox.clearInput", "清除输入")}
            >
              <X className="h-3 w-3" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setIsTyping(false);
              setIsOpen(!isOpen);
            }}
            className={cn(
              "p-1 text-muted-foreground hover:text-foreground rounded transition-transform cursor-pointer",
              isOpen && "rotate-180 text-foreground"
            )}
            title={t("hostCombobox.selectKnown", "选择已有或已知主机")}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div onMouseDown={(e) => e.preventDefault()} className="absolute top-full left-0 mt-1.5 w-full z-50 rounded-lg border border-border/80 bg-popover/95 backdrop-blur-md shadow-xl overflow-hidden py-1 max-h-64 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2.5 text-center text-xs text-muted-foreground">
              {mode === "alias" ? (tunnelHosts.length === 0 ? t("hostCombobox.noAliases", "暂无其他可引用的 Host 别名 (请先在侧边栏添加其他 Host 隧道)") : t("hostCombobox.noMatchAlias", "未找到匹配的 Host 别名")) : t("hostCombobox.noMatchHost", "未找到匹配的主机地址")}
              <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                {t("hostCombobox.customInputHint", "直接按回车或失焦即可使用当前输入:")} <strong className="font-mono text-foreground">{value}</strong>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {/* 1. Tunnels Group */}
              {grouped.tunnelsGroup.length > 0 && (
                <div className="py-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <Server className="h-3 w-3 text-primary" />
                    <span>{mode === "alias" ? t("hostCombobox.sshConfigAlias", "~/.ssh/config 中的 Host 别名") : t("hostCombobox.existingHosts", "已有主机地址")}</span>
                    <span className="text-[9px] font-normal text-muted-foreground/70">({grouped.tunnelsGroup.length})</span>
                  </div>
                  {grouped.tunnelsGroup.map((opt) => {
                    globalIndexCounter++;
                    const index = globalIndexCounter;
                    const isSelected = opt.value === value;
                    const isActive = activeIndex === index;
                    return (
                      <div
                        key={`t-${opt.value}-${opt.label}`}
                        onClick={() => selectOption(opt)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-1.5 text-xs cursor-pointer select-none transition-colors",
                          isActive ? "bg-muted/90 text-foreground" : "text-foreground hover:bg-muted/60",
                          isSelected && "font-medium text-primary"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}
                          <span className="font-mono text-xs font-semibold text-foreground truncate">{opt.value}</span>
                          {opt.label && (
                            <span className="text-[11px] text-muted-foreground truncate font-mono">
                              ({opt.label})
                            </span>
                          )}
                        </div>
                        {opt.badge && (
                          <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground border border-border/40 font-mono">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. Known Hosts Group */}
              {grouped.knownGroup.length > 0 && (
                <div className="py-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <Globe className="h-3 w-3 text-sky-500" />
                    <span>{t("hostCombobox.knownHosts", "系统已知主机 (known_hosts)")}</span>
                    <span className="text-[9px] font-normal text-muted-foreground/70">({grouped.knownGroup.length})</span>
                  </div>
                  {grouped.knownGroup.map((opt) => {
                    globalIndexCounter++;
                    const index = globalIndexCounter;
                    const isSelected = opt.value === value;
                    const isActive = activeIndex === index;
                    return (
                      <div
                        key={`k-${opt.value}`}
                        onClick={() => selectOption(opt)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-1.5 text-xs cursor-pointer select-none transition-colors",
                          isActive ? "bg-muted/90 text-foreground" : "text-foreground hover:bg-muted/60",
                          isSelected && "font-medium text-primary"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}
                          <span className="font-mono text-xs truncate">{opt.value}</span>
                        </div>
                        <span className="ml-2 shrink-0 rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] text-sky-600 dark:text-sky-400 border border-sky-500/20 font-mono">
                          known_hosts
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. Common Hosts Group */}
              {grouped.commonGroup.length > 0 && (
                <div className="py-1">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <Laptop className="h-3 w-3 text-emerald-500" />
                    <span>{t("hostCombobox.commonHosts", "常用回环及网络地址")}</span>
                  </div>
                  {grouped.commonGroup.map((opt) => {
                    globalIndexCounter++;
                    const index = globalIndexCounter;
                    const isSelected = opt.value === value;
                    const isActive = activeIndex === index;
                    return (
                      <div
                        key={`c-${opt.value}`}
                        onClick={() => selectOption(opt)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-1.5 text-xs cursor-pointer select-none transition-colors",
                          isActive ? "bg-muted/90 text-foreground" : "text-foreground hover:bg-muted/60",
                          isSelected && "font-medium text-primary"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <span className="w-3.5 shrink-0" />
                          )}
                          <span className="font-mono text-xs truncate">{opt.value}</span>
                          {opt.label && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              ({opt.label})
                            </span>
                          )}
                        </div>
                        {opt.badge && (
                          <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground border border-border/40 font-mono">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
