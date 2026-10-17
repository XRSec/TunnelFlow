import React from "react";
import { Network, Zap, SlidersHorizontal } from "lucide-react";
import { ConfigurationTab } from "@/types/tunnel";
import { useTranslation } from "react-i18next";
import { SegmentedControl, SegmentedTabItem } from "@/components/ui/SegmentedControl";

interface TabsProps {
  activeTab: ConfigurationTab;
  onChange: (tab: ConfigurationTab) => void;
  isGeneralConfig?: boolean;
}

export function Tabs({ activeTab, onChange, isGeneralConfig = false }: TabsProps) {
  const { t } = useTranslation();
  const tabs: SegmentedTabItem[] = [
    ...(!isGeneralConfig
      ? [{ id: "general" as const, label: t("tabs.general", "通用"), icon: <Network className="h-3.5 w-3.5" /> }]
      : []),
    { id: "connection" as const, label: t("tabs.connection", "连接"), icon: <Zap className="h-3.5 w-3.5" /> },
    { id: "advanced" as const, label: t("tabs.advanced", "高级"), icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex w-full items-center justify-center px-4 py-2 border-b border-border/40 bg-card/40 backdrop-blur-sm">
      <div className="w-full max-w-sm">
        <SegmentedControl
          tabs={tabs}
          value={activeTab}
          onChange={(val) => onChange(val as ConfigurationTab)}
          size="sm"
        />
      </div>
    </div>
  );
}
