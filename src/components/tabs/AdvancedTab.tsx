import { useTranslation } from "react-i18next";
import React, { useState, useMemo } from "react";
import { SlidersHorizontal, Search, X, ChevronDown, ChevronRight, ExternalLink, RotateCcw, Sparkles, BookOpen } from "lucide-react";
import { Tunnel } from "@/types/tunnel";
import { SSHDirectiveInfo, SSH_DIRECTIVE_GROUPS, ALL_SSH_DIRECTIVES, findDirective } from "@/lib/directiveCatalog";
import { effectiveOptionValue, getDirectOptionValue, isOptionCustomized, setEffectiveOptionValue } from "@/lib/tunnelDirectives";
import { InlineMemoField } from "@/components/ui/InlineMemoField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
interface AdvancedTabProps {
  tunnel: Tunnel;
  onChange: (updated: Tunnel) => void;
  generalConfig?: Tunnel | null;
}
export function AdvancedTab({
  tunnel,
  onChange,
  generalConfig
}: AdvancedTabProps) {
  const {
    t
  } = useTranslation();
  const [filterMode, setFilterMode] = useState<"customized" | "all">("customized");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>("AddressFamily");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Count customized directives
  const customizedCount = useMemo(() => {
    return ALL_SSH_DIRECTIVES.filter(d => isOptionCustomized(tunnel, d.key)).length;
  }, [tunnel]);
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  const selectedDirective = useMemo<SSHDirectiveInfo | undefined>(() => {
    return findDirective(selectedKey) || ALL_SSH_DIRECTIVES[0];
  }, [selectedKey]);

  // Filter directives within a group
  const filterGroupOptions = (options: SSHDirectiveInfo[]) => {
    const q = searchQuery.trim().toLowerCase();
    return options.filter(opt => {
      const isCust = isOptionCustomized(tunnel, opt.key);
      if (filterMode === "customized" && !isCust) {
        return false;
      }
      if (!q) return true;
      const matchKey = opt.key.toLowerCase().includes(q);
      const matchName = opt.nameLocalized.toLowerCase().includes(q);
      const matchDefault = opt.defaultValue.toLowerCase().includes(q);
      const matchGroup = opt.group.toLowerCase().includes(q) || opt.groupLocalized.toLowerCase().includes(q);
      const matchHelp = opt.helpText.toLowerCase().includes(q);
      return matchKey || matchName || matchDefault || matchGroup || matchHelp;
    });
  };
  const handleDirectiveChange = (key: string, val: string) => {
    const updated = setEffectiveOptionValue(tunnel, key, val);
    onChange(updated);
  };
  const handleResetDirective = (key: string) => {
    const updated = setEffectiveOptionValue(tunnel, key, null);
    onChange(updated);
  };
  return <div className="flex flex-col min-[850px]:flex-row gap-3 min-w-0 overflow-hidden h-[calc(100vh-14rem)] min-h-[500px]">
 {/* Left Pane: Directive Browser Table */}
 <div className="flex-1 flex flex-col min-w-0 rounded-xl border border-border/70 bg-card shadow-xs overflow-hidden">
 {/* Filter bar */}
 <div className="flex items-center gap-3 p-3 border-b border-border/70 bg-muted/20 shrink-0">
 {/* Segmented Filter */}
 <div className="inline-flex rounded-lg p-0.5 bg-muted/80 text-xs shrink-0 ">
 <button type="button" onClick={() => setFilterMode("customized")} className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5", filterMode === "customized" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground")}>
 <span>{t("auto_2175")}{customizedCount})</span>
 <span className={cn("rounded-full px-1.5 py-0.2 text-[10px] font-mono", customizedCount > 0 ? "bg-primary/15 text-primary font-semibold" : "bg-muted text-muted-foreground")}>
 {customizedCount}
 </span>
 </button>
 <button type="button" onClick={() => setFilterMode("all")} className={cn("px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5", filterMode === "all" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground")}>
 <span>{t("auto_2176")}</span>
 <span className="text-[10px] font-mono opacity-70">
 ({ALL_SSH_DIRECTIVES.length})
 </span>
 </button>
 </div>

 {/* Search Input */}
 <div className="relative flex-1 flex items-center">
 <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
 <input type="text" placeholder={t("auto_2177")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-8 w-full rounded-md border border-input/70 bg-background/60 pl-8 pr-7 text-xs shadow-2xs placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden" />
 {searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer" title={t("auto_2178")}>
 <X className="h-3.5 w-3.5" />
 </button>}
 </div>
 </div>

 {/* Scrollable Container for Table */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden flex flex-col min-w-0 min-h-0">
          <div className="min-w-[560px] flex-1 flex flex-col min-h-0">
            {/* 3-Column Table Header */}
 <div className="flex items-center pl-7 pr-6 py-2 border-b border-border/40 bg-muted/40 text-[11px] font-semibold text-muted-foreground shrink-0">
 <div className="w-36 shrink-0">{t("auto_2179")}</div>
 <div className="w-44 shrink-0">{t("auto_2180")}</div>
              <div className="flex-1 min-w-[200px] whitespace-nowrap">{t("auto_2181")}</div>
 </div>

 {/* Scrollable Outline List */}
 <div className="flex-1 overflow-y-auto p-3 space-y-4">
 {SSH_DIRECTIVE_GROUPS.map(group => {
              const options = filterGroupOptions(group.options);
              if (options.length === 0) return null;
              const isCollapsed = collapsedGroups[group.id];
              return <div key={group.id} className="space-y-1">
 {/* Group Header */}
 <button type="button" onClick={() => toggleGroup(group.id)} className="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold text-foreground hover:bg-muted/40 rounded transition-colors cursor-pointer ">
 <div className="flex items-center gap-1.5">
 {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
 <span className="text-foreground">{group.nameLocalized}</span>
 <span className="text-[11px] font-normal text-muted-foreground font-mono">
 ({group.name})
 </span>
 </div>
 <span className="text-[10px] font-mono text-muted-foreground">
 {options.length}{t("auto_2182")}</span>
 </button>

 {/* Directive Rows */}
 {!isCollapsed && <div className="space-y-1 pl-1">
 {options.map(opt => {
                    const isCust = isOptionCustomized(tunnel, opt.key);
                    const isSel = selectedDirective?.key.toLowerCase() === opt.key.toLowerCase();
                    const currentVal = getDirectOptionValue(tunnel, opt.key) ?? "";
                    const generalVal = generalConfig ? getDirectOptionValue(generalConfig, opt.key) : undefined;
                    const hasGeneral = !tunnel.is_general_config && generalVal !== undefined && generalVal.trim() !== "";
                    const effectiveDefault = hasGeneral ? generalVal : opt.defaultValue;
                    return <div key={opt.key} onClick={() => setSelectedKey(opt.key)} className={cn("flex items-center px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ", isSel ? "bg-primary/10 border border-primary/30 text-foreground" : isCust ? "bg-primary/5 hover:bg-primary/10 border border-transparent" : "hover:bg-muted/50 border border-transparent text-foreground")}>
 {/* Column 1: Localized Name */}
 <div className="w-36 shrink-0 flex items-center gap-1.5 pr-2 truncate">
 <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", isCust ? "bg-primary" : "bg-transparent")} />
 <span className={cn("truncate", isCust && "font-medium text-primary")} title={opt.nameLocalized}>
 {opt.nameLocalized}
 </span>
 </div>

 {/* Column 2: English Key */}
                      <div className="w-44 shrink-0 pr-2 truncate">
 <span className={cn("font-mono text-[11px] truncate", isCust ? "text-primary font-medium" : "text-muted-foreground")} title={opt.key}>
 {opt.key}
 </span>
 </div>

 {/* Column 3: Inline Editor */}
                      <div className="flex-1 min-w-[200px] flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
 {opt.type === "choice" && opt.candidates.length > 0 ? <Select value={currentVal} onChange={e => handleDirectiveChange(opt.key, e.target.value)} className={cn("h-7 text-xs font-mono py-0", isCust && "border-primary/50 text-primary font-medium")}>
 <option value="">
 {hasGeneral ? t("advancedTab.globalDefault", { val: effectiveDefault, defaultValue: `全局 (${effectiveDefault})` }) : t("advancedTab.default", { val: effectiveDefault, defaultValue: `默认 (${effectiveDefault})` })}
 </option>
 {opt.candidates.map(c => <option key={c} value={c}>
 {c}
 </option>)}
 {currentVal && !opt.candidates.includes(currentVal) && <option value={currentVal}>
 {currentVal}{t("auto_2183")}</option>}
 </Select> : <div className="relative flex-1 flex items-center">
 <Input value={currentVal} onChange={e => handleDirectiveChange(opt.key, e.target.value)} placeholder={hasGeneral ? t("advancedTab.globalDefaultPlaceholder", { val: effectiveDefault, defaultValue: `全局: ${effectiveDefault}` }) : t("advancedTab.defaultPlaceholder", { val: effectiveDefault, defaultValue: `默认: ${effectiveDefault}` })} className={cn("h-7 text-xs font-mono pr-6", isCust && "border-primary/50 text-primary font-medium")} />
 {currentVal && <button type="button" onClick={() => handleResetDirective(opt.key)} className="absolute right-1.5 p-0.5 text-muted-foreground/60 hover:text-foreground cursor-pointer rounded" title={t("auto_2184")}>
 <X className="h-3 w-3" />
 </button>}
 </div>}

 {isCust && <div className="flex items-center justify-end gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleResetDirective(opt.key)} title={t("auto_2185")}>
       <RotateCcw className="h-3.5 w-3.5" />
     </Button>
     <InlineMemoField value={tunnel.field_remarks?.[opt.key] || tunnel.field_remarks?.[opt.key.toLowerCase()] || ""} onChange={(rmk: string) => {
                            const current = {
                              ...(tunnel.field_remarks || {})
                            };
                            if (rmk.trim()) {
                              current[opt.key] = rmk.trim();
                            } else {
                              delete current[opt.key];
                              delete current[opt.key.toLowerCase()];
                            }
                            onChange({
                              ...tunnel,
                              field_remarks: current
                            });
                          }} />
   </div>}
 </div>
 </div>;
                  })}
 </div>}
 </div>;
            })}

 {SSH_DIRECTIVE_GROUPS.every(g => filterGroupOptions(g.options).length === 0) && <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
 <SlidersHorizontal className="h-8 w-8 mx-auto text-muted-foreground/40" />
 <div className="font-medium text-foreground">
 {filterMode === "customized" ? t("auto_2186") : t("auto_2187")}
 </div>
 <div className="text-[11px] text-muted-foreground/70">
 {filterMode === "customized" ? t("auto_2188") : t("auto_2189")}
 </div>
 </div>}
 </div>
 </div>

 </div>
</div>
      {/* Right Pane: Quick Help Pane */}
 <div className="w-full min-[850px]:w-72 xl:w-80 rounded-xl border border-border/70 bg-card p-4 shadow-xs flex flex-col shrink-0">
 <div className="flex items-center justify-between pb-3 border-b border-border/70">
 <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
 <BookOpen className="h-4 w-4 text-primary" />
 <span>{t("auto_1021")}</span>
 </div>
 <a href="https://man.openbsd.org/ssh_config.5" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-mono font-medium text-primary hover:underline">
 <span>{t("auto_1022")}</span>
 <ExternalLink className="h-3 w-3" />
 </a>
 </div>

 {selectedDirective ? <div className="flex-1 overflow-y-auto pt-4 space-y-4">
 {/* Header info */}
 <div>
 <h2 className="text-base font-bold text-foreground">
 {selectedDirective.nameLocalized}
 </h2>
 <div className="flex items-center gap-2 mt-1">
 <span className="font-mono text-xs font-semibold text-primary">
 {selectedDirective.key}
 </span>
 <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-medium">
 {selectedDirective.groupLocalized}
 </span>
 </div>
 </div>

 {/* Status & Reset */}
 {(() => {
          const isCust = isOptionCustomized(tunnel, selectedDirective.key);
          const curVal = getDirectOptionValue(tunnel, selectedDirective.key);
          const genVal = generalConfig ? getDirectOptionValue(generalConfig, selectedDirective.key) : undefined;
          const hasGen = !tunnel.is_general_config && genVal && genVal.trim() !== "";
          return <div className="rounded-lg border border-border/70 bg-background/50 p-2.5 space-y-2 text-xs">
 <div className="flex items-center justify-between gap-2">
 <span className="text-muted-foreground">{t("auto_2190")}</span>
 {isCust ? <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary border border-primary/20">{t("auto_2191")}{curVal}
 </span> : hasGen ? <span className="rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-400 border border-sky-500/20">{t("auto_2192")}{genVal}
 </span> : <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground font-mono">{t("auto_2193")}{selectedDirective.defaultValue}
 </span>}
 </div>

 {isCust && <Button variant="outline" size="xs" className="w-full text-xs" onClick={() => handleResetDirective(selectedDirective.key)}>
 <RotateCcw className="h-3 w-3 mr-1" />
 <span>{t("auto_2194")}</span>
 </Button>}
 </div>;
        })()}

 {/* Candidates quick selector */}
 {selectedDirective.candidates.length > 0 && <div className="space-y-1.5">
 <span className="text-[11px] font-medium text-muted-foreground">{t("auto_1023")}</span>
 <div className="flex flex-wrap gap-1.5">
 {selectedDirective.candidates.map(c => {
              const active = getDirectOptionValue(tunnel, selectedDirective.key) === c;
              return <button key={c} type="button" onClick={() => handleDirectiveChange(selectedDirective.key, c)} className={cn("px-2 py-1 rounded text-xs font-mono border transition-all cursor-pointer", active ? "bg-primary text-primary-foreground border-primary font-semibold shadow-2xs" : "bg-muted/50 border-border/70 text-foreground hover:bg-muted hover:border-border")}>
 {c}
 </button>;
            })}
 </div>
 </div>}

 {/* Documentation body */}
 <div className="space-y-2 pt-2 border-t border-border/70">
 <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t("auto_2195")}</span>
 <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap select-text">
 {selectedDirective.helpText}
 </p>
 </div>
 </div> : <div className="flex-1 flex flex-col items-center justify-center text-center text-xs text-muted-foreground p-6">
 <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-2" />
 <span>{t("auto_2196")}</span>
 <span className="text-[11px] text-muted-foreground/60 mt-1">{t("auto_1024")}</span>
 </div>}
 </div>
 </div>;
}