import { Tunnel, ForwardType } from "@/types/tunnel";

/**
 * Normalizes host/IPv6 format:
 * - If it's an IPv6 (contains ':'), ensure it has exactly one pair of brackets: `[::]`
 * - If IPv4 or domain, no brackets.
 */
export function formatHostForPortForward(host: string): string {
  if (!host) return "";
  // Strip any existing brackets
  const clean = host.replace(/^\[+|\]+$/g, "").trim();
  if (clean.includes(":")) {
    return `[${clean}]`;
  }
  return clean;
}

/**
 * Builds the exact SSH command arguments matching OpenSSH & SSHTunnelManager standards.
 */
export function buildSSHArguments(tunnel: Tunnel, generalConfig?: Tunnel | null): string[] {
  const args: string[] = ["-N"];

  // 1. Port Forwards
  tunnel.forwards
    .filter((f) => f.is_active)
    .forEach((f) => {
      const localBind = f.bind_address || "127.0.0.1";
      const localHost = formatHostForPortForward(localBind);
      const remoteHost = formatHostForPortForward(f.remote_host || "127.0.0.1");

      switch (f.forward) {
        case "local":
          args.push("-L", `${localHost}:${f.port}:${remoteHost}:${f.remote_port}`);
          break;
        case "remote":
          const remoteBind = f.bind_address || "0.0.0.0";
          const formattedRemoteBind = formatHostForPortForward(remoteBind);
          args.push("-R", `${formattedRemoteBind}:${f.port}:${localHost}:${f.remote_port}`);
          break;
        case "dynamic":
          args.push("-D", `${localHost}:${f.port}`);
          break;
        case "reverse_dynamic":
          const rBind = !f.bind_address || f.bind_address === "127.0.0.1"
            ? `${f.port}`
            : `${formatHostForPortForward(f.bind_address)}:${f.port}`;
          args.push("-R", rBind);
          break;
      }
    });

  // 2. Custom directives (active and non-empty)
  tunnel.custom_directives
    .filter((d) => d.is_active && d.value?.trim())
    .forEach((d) => {
      args.push("-o", `${d.key}=${d.value.trim()}`);
    });

  // 3. User & Port & Identity (when not using alias)
  if (!tunnel.use_alias) {
    if (tunnel.port && tunnel.port !== 22) {
      args.push("-p", `${tunnel.port}`);
    }
    const identity = tunnel.identity_file || generalConfig?.identity_file;
    if (identity && identity.trim()) {
      args.push("-i", identity.trim());
      if (tunnel.identities_only || generalConfig?.identities_only) {
        args.push("-o", "IdentitiesOnly=yes");
      }
    }
  }

  // 4. Timeout
  const timeout = tunnel.connect_timeout ?? generalConfig?.connect_timeout ?? 30;
  args.push("-o", `ConnectTimeout=${timeout}`);

  // 5. Compression
  const compression = tunnel.compression ?? generalConfig?.compression ?? false;
  if (compression) {
    args.push("-C");
  }

  // 6. TCPKeepAlive
  // Note: tunnel.tcp_keep_alive === false means disabled -> TCPKeepAlive=no
  // In ssh-tunnel-manager: `if disableTCPKeepAlive { args += ["-o", "TCPKeepAlive=no"] }`
  const tcpKeepAlive = tunnel.tcp_keep_alive ?? generalConfig?.tcp_keep_alive ?? false;
  if (!tcpKeepAlive) {
    args.push("-o", "TCPKeepAlive=no");
  }

  // 7. Skip host key check
  const skipHostKeyCheck = tunnel.skip_host_key_check ?? generalConfig?.skip_host_key_check ?? false;
  if (skipHostKeyCheck) {
    args.push("-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null");
  }

  // 8. ProxyJump
  const proxyJump = tunnel.proxy_jump || generalConfig?.proxy_jump;
  if (proxyJump && proxyJump.trim()) {
    args.push("-J", proxyJump.trim());
  }

  // 9. Server Alive Interval & CountMax
  const interval = tunnel.server_alive_interval ?? generalConfig?.server_alive_interval ?? 30;
  const countMax = tunnel.server_alive_count_max ?? generalConfig?.server_alive_count_max ?? 3;
  args.push("-o", `ServerAliveInterval=${interval}`, "-o", `ServerAliveCountMax=${countMax}`);

  // 10. Core Safety and Tunneling Standards
  const standardOptions: [string, string][] = [
    ["ExitOnForwardFailure", "yes"],
    ["ControlMaster", tunnel.control_master || generalConfig?.control_master || "no"],
    ["BatchMode", "yes"],
    ["RequestTTY", "no"],
    ["RemoteCommand", "none"],
    ["ConnectionAttempts", `${tunnel.connection_attempts || 2}`],
  ];

  standardOptions.forEach(([key, val]) => {
    // Check if custom_directives already overrides this
    const hasCustom = tunnel.custom_directives.some(
      (d) => d.is_active && d.key.toLowerCase() === key.toLowerCase()
    );
    if (!hasCustom) {
      args.push("-o", `${key}=${val}`);
    }
  });

  // 11. ControlPath
  const controlPath = tunnel.control_path || generalConfig?.control_path;
  if (controlPath && controlPath.trim()) {
    args.push("-o", `ControlPath=${controlPath.trim()}`);
  } else if (!tunnel.control_master || tunnel.control_master === "no") {
    args.push("-o", "ControlPath=none");
  }

  // 12. Destination Target
  const target = tunnel.host || tunnel.name;
  args.push(target);

  return args;
}

/**
 * Formats command line string with proper shell quoting.
 */
export function formatSSHCommand(tunnel: Tunnel, generalConfig?: Tunnel | null): string {
  const args = buildSSHArguments(tunnel, generalConfig);
  const safeTokens = args.map((token) => {
    // If simple token, no quotes needed
    if (!token) return "''";
    if (/^[a-zA-Z0-9_./:@%+=,-]+$/.test(token)) {
      return token;
    }
    // Escape single quotes for POSIX sh
    return `'${token.replace(/'/g, "'\\''")}'`;
  });
  return `ssh ${safeTokens.join(" ")}`;
}
