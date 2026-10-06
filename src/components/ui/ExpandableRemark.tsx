import { useTranslation } from "react-i18next";
import React, { useState, useRef, useEffect } from "react";
import { FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableRemarkProps {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function ExpandableRemark({ value, onChange, placeholder }: ExpandableRemarkProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [tempVal, setTempVal] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempVal(value || "");
  }, [value]);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  const handleCommit = () => {
    onChange(tempVal);
    setExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCommit();
    } else if (e.key === "Escape") {
      setTempVal(value || "");
      setExpanded(false);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={cn(
          "flex items-center gap-1.5 h-8 px-2.5 rounded-full transition-all duration-300 ease-out border shadow-sm shrink-0",
          value
            ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
            : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted"
        )}
      >
        <FileText className="h-3 w-3 shrink-0" />
        {value ? (
          <span className="text-[10px] font-medium truncate max-w-[120px]">{value}</span>
        ) : (
          <span className="text-[10px] font-medium">{t("common.remark", "备注")}</span>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center h-8 bg-background border border-border rounded-full shadow-sm w-56 px-2 overflow-hidden shrink-0 transition-all duration-300 ease-out">
      <FileText className="h-3 w-3 shrink-0 text-muted-foreground ml-1 mr-2" />
      <input
        ref={inputRef}
        type="text"
        value={tempVal}
        onChange={(e) => setTempVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleCommit}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground"
      />
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          handleCommit();
        }}
        className="shrink-0 p-1 rounded-full text-emerald-500 hover:bg-emerald-500/10 ml-1"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
