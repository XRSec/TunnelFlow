import React from "react";
import { Server, Globe } from "lucide-react";
import { Tunnel } from "@/types/tunnel";

export type GitPlatform = "github" | "gitlab" | "gitee" | "bitbucket" | "codeberg" | "git";

export function detectGitPlatform(host?: string, name?: string): GitPlatform | null {
  const h = (host || "").toLowerCase();
  const n = (name || "").toLowerCase();
  const combined = `${h} ${n}`;

  if (combined.includes("github")) return "github";
  if (combined.includes("gitlab")) return "gitlab";
  if (combined.includes("gitee")) return "gitee";
  if (combined.includes("bitbucket")) return "bitbucket";
  if (combined.includes("codeberg")) return "codeberg";
  if (/(^|\b)git\b/.test(combined) || combined.startsWith("git.")) return "git";

  return null;
}

export function PlatformIcon({ tunnel, className }: { tunnel: Tunnel; className?: string }) {
  const platform = detectGitPlatform(tunnel.host, tunnel.name);

  if (platform === "github") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    );
  }
  if (platform === "gitlab") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.423-.73-.423-.867 0L16.418 9.45H7.582L4.919 1.263c-.137-.423-.73-.423-.868 0L1.387 9.452.045 13.587c-.121.38.016.795.334 1.026L12 23.054l11.62-8.441c.318-.231.455-.646.335-1.026z"/>
      </svg>
    );
  }
  if (platform === "gitee") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-1.274 0-2.24.226-2.86.668-.62.442-.968 1.05-.968 1.76a2.6 2.6 0 0 0 1.036 2.052c.683.528 1.637.818 2.89.85h4.153v-2.37h-2.37a.593.593 0 0 1-.593-.593V8.89a.592.592 0 0 1 .592-.592h4.74c.328 0 .593.264.593.593v6.52c0 2.223-1.002 3.96-2.825 4.966-1.52.842-3.645 1.137-6.524.908-1.517-.12-2.903-.432-4.14-1.008a.593.593 0 0 1-.343-.538v-2.174c0-.28.196-.525.467-.585 1.547-.348 3.036-.5 4.382-.44.757.03 1.408.064 1.83.136.216.035.4.154.512.336a.81.81 0 0 1 .114.417v.9h1.185c.677 0 1.18-.18 1.48-.52.29-.33.435-.85.435-1.54V12.63H9.49c-1.895 0-3.32-.468-4.228-1.393-.907-.924-1.37-2.13-1.37-3.585 0-1.635.61-2.96 1.8-3.955 1.192-.992 2.87-1.493 4.993-1.493h7.388v-.87z"/>
      </svg>
    );
  }
  if (platform === "bitbucket") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M.666 0h22.668C24 0 24 0 23.94 1.205L20.804 22.8c-.029.358-.328.6-.684.6H4.218c-.365 0-.663-.257-.688-.62L.055 1.205C0 0 0 0 .666 0zM15.7 15.111L17.15 6.02H7.13L8.601 15.11h7.098z"/>
      </svg>
    );
  }
  if (platform === "codeberg") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M11.955 0C5.352 0 0 5.352 0 11.955c0 6.602 5.352 11.955 11.955 11.955 6.602 0 11.955-5.353 11.955-11.955C23.91 5.352 18.557 0 11.955 0zM6.16 8.324L11.87 2.613l8.601 8.601c-.13 3.655-2.023 6.945-5.112 8.895l-9.2-9.785z"/>
      </svg>
    );
  }
  if (platform === "git") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M23.546 10.93L13.067.452c-.604-.603-1.582-.603-2.188 0L8.708 2.627l3.28 3.28c.456-.123.943-.03 1.32.268.423.332.624.863.535 1.385l3.228 3.227c.522-.09.1054.113 1.386.536.56.713.56 1.764 0 2.477-.713.56-1.764.56-2.477 0-.482-.38-.66-1.014-.46-1.57l-3.23-3.23c-.116.035-.237.054-.36.054-.378 0-.742-.14-1.02-.4L7.545 11.98v5.617c.18.064.354.156.51.28.713.56.713 1.61 0 2.17-.712.56-1.763.56-2.476 0-.713-.56-.713-1.61 0-2.17.29-.23.65-.365 1.02-.365V11.1c-.37-.01-.73-.14-1.02-.365-.713-.56-.713-1.61 0-2.17.712-.56 1.763-.56 2.476 0 .38.297.557.778.46 1.25l2.67-2.67L2.454 10.93c-.603.604-.603 1.584 0 2.188L10.88 23.546c.605.604 1.584.604 2.188 0l10.48-10.48c.603-.604.603-1.584 0-2.188z"/>
      </svg>
    );
  }

  return tunnel.use_alias ? <Server className={className} /> : <Globe className={className} />;
}
