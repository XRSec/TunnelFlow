import React, { useState, useEffect, useRef, useCallback } from "react";
import { Tunnel } from "@/types/tunnel";
import { ALL_SSH_DIRECTIVES } from "@/lib/directiveCatalog";
import { Lock, Code2 } from "lucide-react";

interface SourceEditorProps {
  tunnel: Tunnel;
  onChange: (updated: Tunnel) => void;
  onSave?: (tunnel: Tunnel) => void;
  generalConfig?: Tunnel | null;
}

const tokenizeLine = (line: string) => {
  const directiveMatch = line.match(/^(\s*)([A-Za-z0-9_-]+)(\s*)(.*)$/);
  if (directiveMatch) {
    const [_, space1, key, space2, rest] = directiveMatch;
    
    let valPart = rest;
    let commentPart = "";
    const hashIndex = rest.indexOf("#");
    if (hashIndex !== -1) {
      valPart = rest.slice(0, hashIndex);
      commentPart = rest.slice(hashIndex);
    }

    let keyClass = "text-sky-600 dark:text-sky-400 font-semibold";
    if (key.toLowerCase() === "host") {
      keyClass = "text-purple-600 dark:text-purple-400 font-bold";
    }

    const formattedRest = valPart.split(/(\s+)/).map((part, i) => {
      if (/^\d+$/.test(part)) return <span key={i} className="text-amber-600 dark:text-amber-400">{part}</span>;
      if (/^(yes|no|ask|confirm)$/i.test(part)) return <span key={i} className="text-rose-600 dark:text-rose-400 font-medium">{part}</span>;
      if (key.toLowerCase() === "host") return <span key={i} className="text-emerald-600 dark:text-emerald-400 font-semibold">{part}</span>;
      return part;
    });

    return (
      <React.Fragment>
        {space1}
        <span className={keyClass}>{key}</span>
        {space2}
        {formattedRest}
        {commentPart && <span className="text-muted-foreground/60 italic">{commentPart}</span>}
      </React.Fragment>
    );
  }

  const commentMatch = line.match(/^(\s*)(#.*)$/);
  if (commentMatch) {
    return (
      <React.Fragment>
        {commentMatch[1]}
        <span className="text-muted-foreground/60 italic">{commentMatch[2]}</span>
      </React.Fragment>
    );
  }
  
  return line;
};

export function SourceEditor({ tunnel, onChange, onSave, generalConfig }: SourceEditorProps) {
  const [text, setText] = useState("");
  
  // Undo/Redo stacks
  const undoStackRef = useRef<{ text: string; cursor: number }[]>([]);
  const redoStackRef = useRef<{ text: string; cursor: number }[]>([]);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveHistory = useCallback((newText: string, cursor: number) => {
    const current = undoStackRef.current;
    if (current.length === 0 || current[current.length - 1].text !== newText) {
      undoStackRef.current.push({ text: newText, cursor });
      if (undoStackRef.current.length > 100) undoStackRef.current.shift();
      redoStackRef.current = [];
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length > 0) {
      const lastUndo = undoStackRef.current[undoStackRef.current.length - 1];
      if (text !== lastUndo.text) {
        redoStackRef.current.push({ text, cursor: textareaRef.current?.selectionStart || 0 });
        if (redoStackRef.current.length > 100) redoStackRef.current.shift();
      } else {
        redoStackRef.current.push(undoStackRef.current.pop()!);
        if (redoStackRef.current.length > 100) redoStackRef.current.shift();
      }
      
      if (undoStackRef.current.length > 0) {
        const prev = undoStackRef.current.pop()!;
        undoStackRef.current.push(prev);
        setText(prev.text);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = prev.cursor;
          }
        }, 0);
      }
    }
  }, [text]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length > 0) {
      const next = redoStackRef.current.pop()!;
      undoStackRef.current.push({ text, cursor: textareaRef.current?.selectionStart || 0 });
      if (undoStackRef.current.length > 100) undoStackRef.current.shift();
      setText(next.text);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = next.cursor;
        }
      }, 0);
    }
  }, [text]);
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompleteFilter, setAutoCompleteFilter] = useState("");
  const [autoCompleteIndex, setAutoCompleteIndex] = useState(0);
  const gutterRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoCompleteListRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (showAutoComplete && autoCompleteListRef.current) {
      const container = autoCompleteListRef.current;
      const selectedEl = container.children[autoCompleteIndex] as HTMLElement;
      if (selectedEl) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elTop = selectedEl.offsetTop;
        const elBottom = elTop + selectedEl.offsetHeight;
        
        if (elTop < containerTop) {
          container.scrollTop = elTop;
        } else if (elBottom > containerBottom) {
          container.scrollTop = elBottom - container.clientHeight;
        }
      }
    }
  }, [autoCompleteIndex, showAutoComplete]);

  const isEditingRef = useRef(false);
  const lastSyncedTextRef = useRef<string>("");

  const parseAndSync = useCallback((textToParse: string) => {
    if (textToParse === lastSyncedTextRef.current) return;
    lastSyncedTextRef.current = textToParse;

    const lines = textToParse.split("\n");
    let custom = [];
    let customSeen = new Set();
    
    let newTunnel = { ...tunnel };
    let newFieldRemarks: Record<string, string> = {};
    newTunnel.remark = "";

    let parsedUser = "";
    let parsedHostName = "";
    let newPort = 22;
    let newIdentityFile = null as string | null;

    if (tunnel.is_general_config || tunnel.name === "*") {
      newTunnel.server_alive_interval = null;
      newTunnel.server_alive_count_max = null;
      newTunnel.connect_timeout = null;
      newTunnel.identity_file = null;
      newTunnel.compression = false;
      newTunnel.control_master = null;
      newTunnel.control_path = null;
      (newTunnel as any).log_level = null;
      (newTunnel as any).connection_attempts = null;
      (newTunnel as any).bind_address = null;
      (newTunnel as any).address_family = null;
      (newTunnel as any).tcp_keep_alive = false;
    }
    
    for (const line of lines) {
      const lineTrim = line.trim();
      const parts = lineTrim.split('#');
      const kvPart = parts[0].trim();
      const inlineRemark = parts.slice(1).join('#').trim();
      
      const match = kvPart.match(/^([A-Za-z0-9]+)\s+(.+)$/);
      if (match) {
        const key = match[1];
        const val = match[2];
        const lowerKey = key.toLowerCase();
        
        if (inlineRemark) {
           newFieldRemarks[lowerKey] = inlineRemark;
        }
        
        if (tunnel.is_general_config || tunnel.name === "*") {
          if (lowerKey === "serveraliveinterval") newTunnel.server_alive_interval = parseInt(val) || null;
          else if (lowerKey === "serveralivecountmax") newTunnel.server_alive_count_max = parseInt(val) || null;
          else if (lowerKey === "connecttimeout") newTunnel.connect_timeout = parseInt(val) || null;
          else if (lowerKey === "identityfile") newTunnel.identity_file = val;
          else if (lowerKey === "compression") newTunnel.compression = (val.toLowerCase() === "yes");
          else if (lowerKey === "controlmaster") newTunnel.control_master = val;
          else if (lowerKey === "controlpath") newTunnel.control_path = val;
          else if (lowerKey !== "host") {
            const dedupKey = lowerKey + " " + val.trim();
            if (!customSeen.has(dedupKey)) {
              customSeen.add(dedupKey);
              custom.push({ key, value: val, is_active: true, remark: "" });
            }
          }
        } else {
          if (lowerKey === "hostname") {
            parsedHostName = val;
          } else if (lowerKey === "user") {
            if (tunnel.use_alias) {
              const dedupKey = lowerKey + " " + val.trim();
              if (!customSeen.has(dedupKey)) {
                customSeen.add(dedupKey);
                custom.push({ key, value: val, is_active: true, remark: "" });
              }
            } else {
              parsedUser = val;
            }
          }
          else if (lowerKey === "port") newPort = parseInt(val) || 22;
          else if (lowerKey === "identityfile") newIdentityFile = val;
          else if (lowerKey !== "host" && lowerKey !== "localforward" && lowerKey !== "remoteforward" && lowerKey !== "dynamicforward") {
            const dedupKey = lowerKey + " " + val.trim();
            if (!customSeen.has(dedupKey)) {
              customSeen.add(dedupKey);
              custom.push({ key, value: val, is_active: true, remark: "" });
            }
          }
        }
      } else if (lineTrim.toLowerCase().startsWith('host ')) {
         if (inlineRemark) {
            newTunnel.remark = inlineRemark;
         } else {
            newTunnel.remark = "";
         }
      }
    }
    
    if (!(tunnel.is_general_config || tunnel.name === "*")) {
      newTunnel.host = parsedUser ? `${parsedUser}@${parsedHostName}` : parsedHostName;
      newTunnel.port = newPort;
      newTunnel.identity_file = newIdentityFile;
    } else {
      newTunnel.host = "";
    }
    newTunnel.custom_directives = [...custom, ...tunnel.custom_directives.filter(d => !d.is_active)];
    newTunnel.field_remarks = newFieldRemarks;
    onChange(newTunnel);
  }, [tunnel, onChange]);

  useEffect(() => {
    if (isEditingRef.current) return;
    const getRmk = (key: string) => {
      const rmk = tunnel.field_remarks?.[key];
      return rmk ? ` # ${rmk}` : "";
    };
    let lines: string[] = [];
    
    const pushForwards = () => {
      tunnel.forwards.filter(f => f.is_active).forEach(f => {
        if (f.forward === "local") lines.push(`  LocalForward ${f.bind_address}:${f.port} ${f.remote_host}:${f.remote_port}`);
        if (f.forward === "remote") lines.push(`  RemoteForward ${f.bind_address}:${f.port} ${f.remote_host}:${f.remote_port}`);
        if (f.forward === "dynamic") lines.push(`  DynamicForward ${f.bind_address}:${f.port}`);
      });
    };

    const pushCustomDirectives = (excludeIdentity: boolean = false) => {
      tunnel.custom_directives.filter(d => d.is_active).forEach(d => {
        if (excludeIdentity && d.key.toLowerCase() === "identityfile") return;
        lines.push(`  ${d.key} ${d.value}${getRmk(d.key.toLowerCase())}`);
      });
    };

    if (tunnel.is_general_config || tunnel.name === "*") {
      lines.push("Host *");
      if (tunnel.server_alive_interval) lines.push(`  ServerAliveInterval ${tunnel.server_alive_interval}`);
      if (tunnel.server_alive_count_max) lines.push(`  ServerAliveCountMax ${tunnel.server_alive_count_max}`);
      if (tunnel.connect_timeout) lines.push(`  ConnectTimeout ${tunnel.connect_timeout}`);
      
      const hasIdentityFile = !!tunnel.identity_file;
      if (hasIdentityFile) lines.push(`  IdentityFile ${tunnel.identity_file}${getRmk("identityfile")}`);
      
      if (tunnel.compression) lines.push(`  Compression yes`);
      if (tunnel.control_master) lines.push(`  ControlMaster ${tunnel.control_master}`);
      if (tunnel.control_path) lines.push(`  ControlPath ${tunnel.control_path}`);
      if ((tunnel as any).log_level) lines.push(`  LogLevel ${(tunnel as any).log_level}`);
      if ((tunnel as any).connection_attempts) lines.push(`  ConnectionAttempts ${(tunnel as any).connection_attempts}`);
      if ((tunnel as any).bind_address) lines.push(`  BindAddress ${(tunnel as any).bind_address}`);
      if ((tunnel as any).address_family) lines.push(`  AddressFamily ${(tunnel as any).address_family}`);
      if ((tunnel as any).tcp_keep_alive !== undefined) lines.push(`  TCPKeepAlive ${(tunnel as any).tcp_keep_alive ? "yes" : "no"}`);
      
      pushCustomDirectives(hasIdentityFile);
    } else if (tunnel.use_alias) {
      lines.push(`Host ${tunnel.name}${tunnel.remark ? ` # ${tunnel.remark}` : ""}`);
      const pureHost = tunnel.host.includes("@") ? tunnel.host.split("@")[1] : tunnel.host;
      if (pureHost) {
        lines.push(`  HostName ${pureHost}${getRmk("hostname")}`);
      }
      pushForwards();
      pushCustomDirectives(false);
    } else {
      lines.push(`Host ${tunnel.name || "Default"}${tunnel.remark ? ` # ${tunnel.remark}` : ""}`);
      
      const userPart = tunnel.host.includes("@") ? tunnel.host.split("@")[0] : "";
      const pureHost = tunnel.host.includes("@") ? tunnel.host.split("@")[1] : tunnel.host;

      if (userPart) {
        lines.push(`  User ${userPart}${getRmk("user")}`);
      }
      if (pureHost) {
        lines.push(`  HostName ${pureHost}${getRmk("hostname")}`);
      }
      if (tunnel.port !== 22) {
        lines.push(`  Port ${tunnel.port}${getRmk("port")}`);
      }
      if (tunnel.identity_file) {
        lines.push(`  IdentityFile ${tunnel.identity_file}${getRmk("identityfile")}`);
      }
      pushForwards();
      pushCustomDirectives(!!tunnel.identity_file);
    }

    const newText = lines.join("\n");
    setText(newText);
    lastSyncedTextRef.current = newText;
  }, [tunnel]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    isEditingRef.current = true;
    const val = e.target.value;
    const selectionStart = e.target.selectionStart;
    
    if (undoStackRef.current.length === 0) {
      undoStackRef.current.push({ text, cursor: textareaRef.current?.selectionStart || 0 });
    }

    setText(val);
    
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      saveHistory(val, selectionStart);
    }, 500);
    
    const textBeforeCursor = val.slice(0, selectionStart);
    const lineBeforeCursor = textBeforeCursor.split("\n").pop() || "";
    const match = lineBeforeCursor.match(/^\s*([a-zA-Z0-9_-]+)$/);
    if (match && match[1].length >= 1) {
      setAutoCompleteFilter(match[1].toLowerCase());
      setShowAutoComplete(true);
      setAutoCompleteIndex(0);
    } else {
      setShowAutoComplete(false);
    }
  };



  useEffect(() => {
    if (!isEditingRef.current) return;
    const handler = setTimeout(() => {
      parseAndSync(text);
    }, 400);
    return () => clearTimeout(handler);
  }, [text, parseAndSync]);

  const handleBlur = () => {
    isEditingRef.current = false;
    parseAndSync(text);
    setShowAutoComplete(false);
  };
  const suggestions = ALL_SSH_DIRECTIVES.filter(d => d.key.toLowerCase().includes(autoCompleteFilter)).slice(0, 8);

  const insertSuggestion = (key: string) => {
    if (!textareaRef.current) return;
    const selectionStart = textareaRef.current.selectionStart;
    const textBeforeCursor = text.slice(0, selectionStart);
    const textAfterCursor = text.slice(selectionStart);
    
    const match = textBeforeCursor.match(/([a-zA-Z0-9]+)$/);
    if (!match) return;
    const wordLen = match[1].length;
    
    const beforeWord = textBeforeCursor.slice(0, textBeforeCursor.length - wordLen);
    const newText = beforeWord + key + " " + textAfterCursor;
    setText(newText);
    setShowAutoComplete(false);
    
    const newPos = beforeWord.length + key.length + 1;
    saveHistory(newText, newPos);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === "s" || e.key === "S") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      parseAndSync(text);
      if (onSave) {
        onSave(tunnel);
      }
      return;
    }
    if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
      return;
    }
    if (e.key === "y" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleRedo();
      return;
    }

    if (showAutoComplete && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAutoCompleteIndex((prev) => (prev + 1) % suggestions.length);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setAutoCompleteIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertSuggestion(suggestions[autoCompleteIndex].key);
        return;
      } else if (e.key === "Escape") {
        setShowAutoComplete(false);
        return;
      }
    }

    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    if (e.key === "Tab") {
      e.preventDefault();
      const newText = text.slice(0, start) + "  " + text.slice(end);
      setText(newText);
      saveHistory(newText, start + 2);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      }, 0);
    } else if (e.key === "Enter") {
      const textBeforeCursor = text.slice(0, start);
      const lines = textBeforeCursor.split("\n");
      const currentLine = lines[lines.length - 1];

      let indent = currentLine.match(/^\s+/)?.[0] || "";
      if (currentLine.trim().toLowerCase().startsWith("host ")) {
        indent = "  ";
      }

      e.preventDefault();
      const insertStr = "\n" + indent;
      const newText = text.slice(0, start) + insertStr + text.slice(end);
      setText(newText);
      saveHistory(newText, start + insertStr.length);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + insertStr.length;
      }, 0);
    }
  };

  const generalConfigText = React.useMemo(() => {
    if (!generalConfig) return "";
    let lines = [
      "# ===== 全局配置 (Host *) · 兜底继承 =====",
      "Host *"
    ];
    if (generalConfig.server_alive_interval) lines.push(`    ServerAliveInterval ${generalConfig.server_alive_interval}`);
    if (generalConfig.server_alive_count_max) lines.push(`    ServerAliveCountMax ${generalConfig.server_alive_count_max}`);
    if (generalConfig.connect_timeout) lines.push(`    ConnectTimeout ${generalConfig.connect_timeout}`);
    if (generalConfig.identity_file) lines.push(`    IdentityFile ${generalConfig.identity_file}`);
    if (generalConfig.forward_agent) lines.push(`    ForwardAgent yes`);
    if (generalConfig.identities_only) lines.push(`    IdentitiesOnly yes`);
    if (generalConfig.control_master) lines.push(`    ControlMaster ${generalConfig.control_master}`);
    if (generalConfig.control_persist) lines.push(`    ControlPersist ${generalConfig.control_persist}`);
    if (generalConfig.control_path) lines.push(`    ControlPath ${generalConfig.control_path}`);
    if (generalConfig.log_level) lines.push(`    LogLevel ${generalConfig.log_level}`);
    if (generalConfig.connection_attempts) lines.push(`    ConnectionAttempts ${generalConfig.connection_attempts}`);
    if (generalConfig.bind_address) lines.push(`    BindAddress ${generalConfig.bind_address}`);
    if (generalConfig.address_family) lines.push(`    AddressFamily ${generalConfig.address_family}`);
    if (generalConfig.proxy_jump) lines.push(`    ProxyJump ${generalConfig.proxy_jump}`);
    if (generalConfig.proxy_command) lines.push(`    ProxyCommand ${generalConfig.proxy_command}`);
    
    generalConfig.custom_directives.filter(d => d.is_active).forEach(d => {
      lines.push(`    ${d.key} ${d.value}`);
    });
    return lines.join("\n");
  }, [generalConfig]);

  const lineCount = text.split('\n').length;

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-card rounded-xl overflow-hidden font-mono text-sm border border-border relative">
      <div className="flex justify-between items-center p-3 border-b border-border/50 bg-muted/10 shrink-0">
        <h3 className="text-muted-foreground font-semibold flex items-center gap-2 text-xs">
          <Code2 className="w-4 h-4" /> 源码模式 (SSH Config)
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 font-sans"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span><span>实时同步</span></div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div 
          ref={gutterRef}
          className="w-12 shrink-0 bg-muted/20 border-r border-border/40 py-3 flex flex-col items-end pr-3 text-muted-foreground/50 text-xs font-mono select-none overflow-hidden" 
          style={{ transform: `translateY(-0px)` }}
        >
          {Array.from({length: lineCount}, (_, i) => (
             <div key={i} className="h-[21px] leading-[21px]">{i + 1}</div>
          ))}
        </div>

        <div className="flex-1 relative bg-background overflow-hidden">
           <pre 
             ref={preRef}
             className="absolute inset-0 p-3 m-0 font-mono text-xs leading-[21px] whitespace-pre pointer-events-none overflow-hidden"
             aria-hidden="true"
           >
             {text.split('\n').map((line, i, arr) => (
               <React.Fragment key={i}>
                 {tokenizeLine(line)}
                 {i < arr.length - 1 && '\n'}
               </React.Fragment>
             ))}
           </pre>

           <textarea
             ref={textareaRef}
             value={text}
             onChange={handleTextChange}
             onKeyDown={handleKeyDown}
             onBlur={handleBlur}
             onScroll={(e) => {
               if (gutterRef.current) {
                 gutterRef.current.style.transform = `translateY(-${e.currentTarget.scrollTop}px)`;
               }
               if (preRef.current) {
                 preRef.current.scrollTop = e.currentTarget.scrollTop;
                 preRef.current.scrollLeft = e.currentTarget.scrollLeft;
               }
             }}
             className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-foreground font-mono text-xs p-3 m-0 leading-[21px] whitespace-pre resize-none outline-none z-10"
             spellCheck={false}
           />

        </div>
      </div>

      {(!tunnel.is_general_config && tunnel.name !== "*" && generalConfig) && (
        <div className="border-t border-border/50 shrink-0 bg-muted/5 p-4">
          <div className="flex flex-col gap-1.5 mb-2">
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-xs">
              <Lock className="h-3.5 w-3.5" />
              <span>全局配置 (Host *) · 只读兜底</span>
            </div>
            <p className="text-[10px] text-muted-foreground opacity-80">
              OpenSSH 遵循首次匹配原则（First match wins），上方特定主机的参数享有优先权，未定义的参数将自动继承此处全局规则。
            </p>
          </div>
          <pre className="w-full bg-muted/30 border border-border/40 rounded p-3 text-[11px] font-mono leading-relaxed text-muted-foreground select-text overflow-x-auto max-h-48">
            {generalConfigText}
          </pre>
        </div>
      )}

      {showAutoComplete && suggestions.length > 0 && (() => {
        const linesBefore = text.slice(0, textareaRef.current?.selectionStart || 0).split("\n");
        const lineIndex = linesBefore.length - 1;
        const lineHeight = 21;
        
        let containerRect = containerRef.current?.getBoundingClientRect();
        let textareaRect = textareaRef.current?.getBoundingClientRect();
        
        if (!containerRect || !textareaRect) return null;
        
        const editorTopOffset = textareaRect.top - containerRect.top;
        const cursorTopInEditor = 12 + lineIndex * lineHeight - (textareaRef.current?.scrollTop || 0);
        const cursorBottomInEditor = cursorTopInEditor + lineHeight;
        
        let topPos = editorTopOffset + cursorBottomInEditor;
        const popupHeightEstimate = Math.min(suggestions.length * 40 + 30, 240);
        
        if (topPos + popupHeightEstimate > containerRect.height) {
          const upwardTop = editorTopOffset + cursorTopInEditor - popupHeightEstimate;
          const headerHeight = editorTopOffset;
          if (upwardTop >= headerHeight + 8 || upwardTop > containerRect.height - topPos) {
            topPos = Math.max(headerHeight + 8, upwardTop);
          }
        }
        
        return (
          <div className="absolute z-50 bg-popover/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-xl p-1.5 min-w-[320px] max-w-md flex flex-col" style={{ top: `${topPos}px`, left: "4.5rem", maxHeight: "240px" }}>
            <div ref={autoCompleteListRef} className="relative overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
              {suggestions.map((s, idx) => (
                <div
                  key={s.key}
                  onMouseDown={(e) => { e.preventDefault(); insertSuggestion(s.key); }}
                  className={`flex flex-col px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors shrink-0 ${idx === autoCompleteIndex ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold">{s.key}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground whitespace-nowrap">{s.groupLocalized}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{s.nameLocalized}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground/70 px-2 pt-1.5 pb-0.5 mt-1 border-t border-border/50 flex justify-between shrink-0">
              <span>↑↓ 导航 · ↵ / Tab 补全 · Esc 关闭</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
