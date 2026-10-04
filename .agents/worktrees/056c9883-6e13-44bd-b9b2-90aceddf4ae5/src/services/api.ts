import { Tunnel, GroupDivider, SSHKeyInfo, TunnelRuntimeStatus } from "@/types/tunnel";

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

// Initial sample data if in standalone browser or initial load
const MOCK_TUNNELS: Tunnel[] = [
  {
    id: "general-config",
    name: "Host * (全局配置)",
    host: "*",
    port: 22,
    auto_connect: false,
    is_general_config: true,
    use_alias: false,
    forwards: [],
    custom_directives: [],
    server_alive_interval: 30,
    server_alive_count_max: 3,
    connect_timeout: 30,
    control_master: "no",
  },
  {
    id: "vps1-p",
    name: "vps1-p",
    host: "vps1-ipv6",
    port: 22,
    group: "端口转发",
    remark: "测试 VPS IPv6 节点",
    auto_connect: false,
    is_general_config: false,
    use_alias: true,
    forwards: [
      {
        id: "f-1",
        forward: "local",
        bind_address: "127.0.0.1",
        port: 17892,
        remote_host: "::",
        remote_port: 7890,
        is_active: true,
      },
      {
        id: "f-2",
        forward: "dynamic",
        bind_address: "127.0.0.1",
        port: 10808,
        remote_host: "",
        remote_port: 0,
        is_active: false,
      },
    ],
    custom_directives: [],
    server_alive_interval: 30,
    server_alive_count_max: 3,
    connect_timeout: 30,
    control_master: "auto",
    control_persist: "600",
    control_path: "~/.ssh/cm-%C",
    compression: true,
    skip_host_key_check: true,
  },
  {
    id: "github-com",
    name: "github.com",
    host: "git@ssh.github.com",
    port: 443,
    group: "github.com",
    auto_connect: false,
    is_general_config: false,
    use_alias: false,
    forwards: [],
    custom_directives: [],
    identity_file: "~/.ssh/id_ed25519",
  },
  {
    id: "sopp-ipv4",
    name: "sopp-ipv4",
    host: "root@107.148.31.165",
    port: 22,
    group: "SSH Configs",
    remark: "海外主力云服务器",
    auto_connect: false,
    is_general_config: false,
    use_alias: false,
    forwards: [
      {
        id: "f-3",
        forward: "dynamic",
        bind_address: "127.0.0.1",
        port: 1080,
        remote_host: "",
        remote_port: 0,
        is_active: true,
      },
    ],
    custom_directives: [],
    server_alive_interval: 15,
    server_alive_count_max: 3,
  },
];

const MOCK_GROUPS: GroupDivider[] = [
  { id: "g-1", title: "端口转发" },
  { id: "g-2", title: "github.com" },
  { id: "g-3", title: "SSH Configs" },
];

const MOCK_KEYS: SSHKeyInfo[] = [
  {
    path: "~/.ssh/id_ed25519",
    display_title: "id_ed25519",
    key_type: "ED25519",
    comment: "xr@MacBook-Pro",
  },
  {
    path: "~/.ssh/id_rsa",
    display_title: "id_rsa",
    key_type: "RSA 4096",
    comment: "xr-legacy-key",
  },
];

export async function fetchTunnels(): Promise<Tunnel[]> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<Tunnel[]>("get_tunnels");
    } catch (e) {
      console.warn("Tauri get_tunnels failed, falling back to mock", e);
    }
  }
  return MOCK_TUNNELS;
}

export async function saveTunnel(tunnel: Tunnel): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_tunnel", { tunnel });
      return;
    } catch (e) {
      console.warn("Tauri save_tunnel failed", e);
    }
  }
  const idx = MOCK_TUNNELS.findIndex((t) => t.id === tunnel.id);
  if (idx >= 0) {
    MOCK_TUNNELS[idx] = tunnel;
  } else {
    MOCK_TUNNELS.push(tunnel);
  }
}

export async function deleteTunnel(id: string, name?: string): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("delete_tunnel", { id, name: name || null });
      return;
    } catch (e) {
      console.warn("Tauri delete_tunnel failed", e);
    }
  }
  const idx = MOCK_TUNNELS.findIndex((t) => t.id === id || (name && t.name === name));
  if (idx >= 0) MOCK_TUNNELS.splice(idx, 1);
}

export async function startTunnel(id: string): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("start_tunnel", { id });
      return;
    } catch (e) {
      console.warn("Tauri start_tunnel failed", e);
      throw e;
    }
  }
}

export async function stopTunnel(id: string): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("stop_tunnel", { id });
      return;
    } catch (e) {
      console.warn("Tauri stop_tunnel failed", e);
      throw e;
    }
  }
}

export async function fetchGroups(): Promise<GroupDivider[]> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<GroupDivider[]>("get_groups");
    } catch (e) {
      console.warn("Tauri get_groups failed", e);
    }
  }
  return MOCK_GROUPS;
}

export async function fetchSSHKeys(): Promise<SSHKeyInfo[]> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<SSHKeyInfo[]>("list_keys");
    } catch (e) {
      console.warn("Tauri list_keys failed", e);
    }
  }
  return MOCK_KEYS;
}

export async function fetchRuntimeStatus(): Promise<Record<string, TunnelRuntimeStatus>> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<Record<string, TunnelRuntimeStatus>>("get_runtime_status");
    } catch (e) {
      console.warn("Tauri get_runtime_status failed", e);
    }
  }
  return {};
}

export async function fetchKnownHosts(): Promise<string[]> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<string[]>("get_known_hosts");
    } catch (e) {
      console.warn("Tauri get_known_hosts failed", e);
    }
  }
  return ["107.148.31.165", "192.168.1.1", "frp.xrsec.fun", "ssh.github.com"];
}

export async function reorderTunnels(orderedIds: string[]): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("reorder_tunnels", { orderedIds });
      return;
    } catch (e) {
      console.warn("Tauri reorder_tunnels failed", e);
    }
  }
}

export async function setWindowMode(mode: "mini" | "full" | "full_min" | "mini_snap"): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("set_window_mode", { mode });
    } catch (e) {
      console.warn("Tauri set_window_mode failed", e);
    }
  }
}

export async function resizeMiniWindow(height: number): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("resize_mini_window", { height });
  }
}
