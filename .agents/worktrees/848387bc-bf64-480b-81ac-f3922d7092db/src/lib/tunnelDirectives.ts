import { Tunnel, CustomDirective } from "@/types/tunnel";

/**
 * Gets a custom directive value by case-insensitive key from tunnel.custom_directives.
 */
export function getCustomDirectiveValue(tunnel: Tunnel, key: string): string | undefined {
  const k = key.toLowerCase();
  const found = tunnel.custom_directives?.find(
    (d) => d.key.toLowerCase() === k && d.is_active
  );
  return found?.value;
}

/**
 * Gets the direct / explicit value of an SSH directive on this tunnel.
 */
export function getDirectOptionValue(tunnel: Tunnel, key: string): string | undefined {
  const k = key.toLowerCase();
  switch (k) {
    case "compression":
      if (tunnel.compression !== undefined) return tunnel.compression ? "yes" : "no";
      break;
    case "tcpkeepalive":
      if (tunnel.tcp_keep_alive !== undefined) return tunnel.tcp_keep_alive ? "yes" : "no";
      break;
    case "stricthostkeychecking":
      if (tunnel.skip_host_key_check !== undefined) return tunnel.skip_host_key_check ? "no" : "ask";
      break;
    case "proxyjump":
      if (tunnel.proxy_jump) return tunnel.proxy_jump;
      break;
    case "proxycommand":
      if (tunnel.proxy_command) return tunnel.proxy_command;
      break;
    case "connecttimeout":
      if (tunnel.connect_timeout !== undefined && tunnel.connect_timeout !== null)
        return String(tunnel.connect_timeout);
      break;
    case "serveraliveinterval":
      if (tunnel.server_alive_interval !== undefined && tunnel.server_alive_interval !== null)
        return String(tunnel.server_alive_interval);
      break;
    case "serveralivecountmax":
      if (tunnel.server_alive_count_max !== undefined && tunnel.server_alive_count_max !== null)
        return String(tunnel.server_alive_count_max);
      break;
    case "identityfile":
      if (tunnel.identity_file) return tunnel.identity_file;
      break;
    case "certificatefile":
      if (tunnel.certificate_file) return tunnel.certificate_file;
      break;
    case "localcommand":
      if (tunnel.local_command) return tunnel.local_command;
      break;
    case "controlpath":
      if (tunnel.control_path) return tunnel.control_path;
      break;
    case "controlmaster":
      if (tunnel.control_master) return tunnel.control_master;
      break;
    case "controlpersist":
      if (tunnel.control_persist) return tunnel.control_persist;
      break;
    case "bindaddress":
      if (tunnel.bind_address) return tunnel.bind_address;
      break;
    case "addressfamily":
      if (tunnel.address_family) return tunnel.address_family;
      break;
    case "loglevel":
      if (tunnel.log_level) return tunnel.log_level;
      break;
    case "connectionattempts":
      if (tunnel.connection_attempts !== undefined && tunnel.connection_attempts !== null)
        return String(tunnel.connection_attempts);
      break;
    case "forwardagent":
      if (tunnel.forward_agent !== undefined) return tunnel.forward_agent ? "yes" : "no";
      break;
    case "identitiesonly":
      if (tunnel.identities_only !== undefined) return tunnel.identities_only ? "yes" : "no";
      break;
  }

  // Fallback to custom_directives
  return getCustomDirectiveValue(tunnel, key);
}

/**
 * Reads the effective string value for an option key, checking tunnel's own configuration
 * first, and falling back to generalConfig (Host *) if not customized on this tunnel.
 */
export function effectiveOptionValue(
  tunnel: Tunnel,
  key: string,
  generalConfig?: Tunnel | null
): string | undefined {
  const direct = getDirectOptionValue(tunnel, key);
  if (direct !== undefined && direct.trim() !== "") {
    return direct;
  }

  if (generalConfig && !tunnel.is_general_config) {
    const generalDirect = getDirectOptionValue(generalConfig, key);
    if (generalDirect !== undefined && generalDirect.trim() !== "") {
      return generalDirect;
    }
  }

  return undefined;
}

/**
 * Returns true if this option is explicitly customized on this specific tunnel.
 */
export function isOptionCustomized(tunnel: Tunnel, key: string): boolean {
  const direct = getDirectOptionValue(tunnel, key);
  return direct !== undefined && direct.trim() !== "";
}

/**
 * Sets or removes an option value on the tunnel.
 */
export function setEffectiveOptionValue(
  tunnel: Tunnel,
  key: string,
  val: string | null | undefined
): Tunnel {
  const updated = { ...tunnel };
  const trimmed = val ? val.trim() : null;
  const nonNil = trimmed && trimmed.length > 0 ? trimmed : null;
  const k = key.toLowerCase();

  // Helper to remove from custom_directives
  const removeCustomDirective = (list: CustomDirective[], directiveKey: string) => {
    return list.filter((d) => d.key.toLowerCase() !== directiveKey.toLowerCase());
  };

  // Helper to set in custom_directives
  const setCustomDirective = (list: CustomDirective[], directiveKey: string, value: string) => {
    const filtered = removeCustomDirective(list, directiveKey);
    return [...filtered, { key: directiveKey, value, is_active: true }];
  };

  switch (k) {
    case "compression":
      updated.compression = nonNil ? nonNil.toLowerCase() === "yes" : false;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "Compression");
      break;
    case "tcpkeepalive":
      updated.tcp_keep_alive = nonNil ? nonNil.toLowerCase() === "yes" : false;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "TCPKeepAlive");
      break;
    case "stricthostkeychecking":
      updated.skip_host_key_check = nonNil ? nonNil.toLowerCase() === "no" : false;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "StrictHostKeyChecking");
      break;
    case "proxyjump":
      updated.proxy_jump = nonNil;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "ProxyJump");
      break;
    case "proxycommand":
      updated.proxy_command = nonNil;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "ProxyCommand");
      break;
    case "connecttimeout":
      updated.connect_timeout = nonNil ? parseInt(nonNil, 10) || null : null;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "ConnectTimeout");
      break;
    case "serveraliveinterval":
      updated.server_alive_interval = nonNil ? parseInt(nonNil, 10) || null : null;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "ServerAliveInterval");
      break;
    case "serveralivecountmax":
      updated.server_alive_count_max = nonNil ? parseInt(nonNil, 10) || null : null;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "ServerAliveCountMax");
      break;
    case "identityfile":
      updated.identity_file = nonNil;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "IdentityFile");
      break;
    case "certificatefile":
      updated.certificate_file = nonNil;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "CertificateFile");
      break;
    case "localcommand":
      updated.local_command = nonNil;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "LocalCommand");
      break;
    case "controlpath":
      updated.control_path = nonNil;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "ControlPath");
      break;
    case "controlmaster":
      updated.control_master = nonNil;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "ControlMaster");
      break;
    case "controlpersist":
      updated.control_persist = nonNil;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "ControlPersist");
      break;
    case "bindaddress":
      updated.bind_address = nonNil;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "BindAddress");
      break;
    case "addressfamily":
      updated.address_family = nonNil;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "AddressFamily");
      break;
    case "loglevel":
      updated.log_level = nonNil;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "LogLevel");
      break;
    case "connectionattempts":
      updated.connection_attempts = nonNil ? parseInt(nonNil, 10) || null : null;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "ConnectionAttempts");
      break;
    case "forwardagent":
      updated.forward_agent = nonNil ? nonNil.toLowerCase() === "yes" : false;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "ForwardAgent");
      break;
    case "identitiesonly":
      updated.identities_only = nonNil ? nonNil.toLowerCase() === "yes" : false;
      updated.custom_directives = removeCustomDirective(updated.custom_directives || [], "IdentitiesOnly");
      break;
    default:
      if (nonNil) {
        updated.custom_directives = setCustomDirective(updated.custom_directives || [], key, nonNil);
      } else {
        updated.custom_directives = removeCustomDirective(updated.custom_directives || [], key);
      }
      break;
  }

  return updated;
}
