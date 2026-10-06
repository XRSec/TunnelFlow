import React from "react";
import { Network, Zap, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfigurationTab } from "@/types/tunnel";
import { useTranslation } from "react-i18next";

interface TabsProps {
  activeTab: ConfigurationTab;
  onChange: (tab: ConfigurationTab) => void;
  isGeneralConfig?: boolean;
}

export function Tabs({ activeTab, onChange, isGeneralConfig = false }: TabsProps) {
  const { t } = useTranslation();
  const tabs: { id: ConfigurationTab; label: string; icon: React.ReactNode }[] = [
    ...(!isGeneralConfig
      ? [{ id: "general" as const, label: t("tabs.general", "通用"), icon: <Network className="h-3.5 w-3.5" /> }]
      : []),
    { id: "connection" as const, label: t("tabs.connection", "连接"), icon: <Zap className="h-3.5 w-3.5" /> },
    { id: "advanced" as const, label: t("tabs.advanced", "高级"), icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex w-full items-center justify-center px-4 py-2 border-b border-border/40 bg-card/40 backdrop-blur-sm">
      <div className="flex w-full max-w-sm items-center rounded-lg bg-muted/50 p-0.5 border border-border/50">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all select-none cursor-pointer",
                isActive
                  ? "bg-background text-foreground shadow-xs border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
