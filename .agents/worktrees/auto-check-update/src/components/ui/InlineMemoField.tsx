import React, { useState, useRef, useEffect } from "react";
import { FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineMemoFieldProps {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function InlineMemoField({ value, onChange, placeholder = "备注..." }: InlineMemoFieldProps) {
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
    if (!value) {
      return (
        <button
          onClick={() => setExpanded(true)}
          className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
          title="添加备注"
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
      );
    }

    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1 max-w-[75px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 h-6 rounded cursor-pointer shrink-0 transition-colors hover:bg-amber-500/20"
        title={value}
      >
        <FileText className="h-3 w-3 shrink-0" />
        <span className="truncate font-sans text-xs text-muted-foreground">{value}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center h-8 bg-background border border-border rounded-md shadow-sm w-32 px-1 overflow-hidden shrink-0 transition-all duration-300 ease-out">
      <input
        ref={inputRef}
        type="text"
        value={tempVal}
        onChange={(e) => setTempVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleCommit}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground px-1"
      />
    </div>
  );
}
