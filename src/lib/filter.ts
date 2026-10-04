import { Tunnel } from "@/types/tunnel";

export function isGitHostingHost(tunnel: Tunnel): boolean {
  if (tunnel.is_general_config) return true;
  
  const host = tunnel.host || "";
  const name = tunnel.name || "";
  
  const gitDomains = [
    "github.com",
    "gitlab.",
    "gitee.com",
    "bitbucket.org",
  ];
  
  const lowerHost = host.toLowerCase();
  const lowerName = name.toLowerCase();
  
  if (lowerHost.includes("git@")) return true;
  
  for (const domain of gitDomains) {
    if (lowerHost.includes(domain) || lowerName.includes(domain)) {
      return true;
    }
  }
  
  return false;
}

export function sortMiniModeTunnels(tunnels: Tunnel[]): Tunnel[] {
  return [...tunnels].sort((a, b) => {
    const aGit = isGitHostingHost(a);
    const bGit = isGitHostingHost(b);
    
    // Git hosts at the bottom
    if (aGit && !bGit) return 1;
    if (!aGit && bGit) return -1;
    
    // Within the same Git/Non-Git category
    if (a.group && !b.group) return -1;
    if (!a.group && b.group) return 1;
    if (a.group && b.group) {
      const gCmp = a.group.localeCompare(b.group);
      if (gCmp !== 0) return gCmp;
    }
    return (a.name || "").localeCompare(b.name || "");
  });
}
