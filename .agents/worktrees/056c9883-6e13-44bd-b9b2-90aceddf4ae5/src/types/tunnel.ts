export type ForwardType = "dynamic" | "local" | "remote" | "reverse_dynamic";

export interface PortForwarding {
  id: string;
  forward: ForwardType;
  bind_address: string;
  port: number;
  remote_host: string;
  remote_port: number;
  is_active: boolean;
  remark?: string;
}

export interface CustomDirective {
  key: string;
  value: string;
  is_active: boolean;
  remark?: string;
}

export interface Tunnel {
  id: string;
  name: string;
  host: string;
  port: number;
  group?: string | null;
  remark?: string | null;
  field_remarks?: Record<string, string>;
  auto_connect: boolean;
  is_general_config: boolean;
  use_alias: boolean;
  forwards: PortForwarding[];
  custom_directives: CustomDirective[];

  // Resilience
  server_alive_interval?: number | null;
  server_alive_count_max?: number | null;
  connect_timeout?: number | null;

  // Authentication
  identity_file?: string | null;
  certificate_file?: string | null;
  forward_agent?: boolean;
  identities_only?: boolean;

  // Multiplexing
  control_master?: string | null;
  control_persist?: string | null;
  control_path?: string | null;

  // Connection Behavior
  log_level?: string | null;
  connection_attempts?: number | null;
  bind_address?: string | null;
  address_family?: string | null;
  compression?: boolean;
  tcp_keep_alive?: boolean;
  skip_host_key_check?: boolean;

  // Routing & Jump
  proxy_jump?: string | null;
  proxy_command?: string | null;

  // Execution
  local_command?: string | null;
  custom_ssh_path?: string | null;
  extra_options?: string | null;
}

export type TunnelState = "disconnected" | "connecting" | "connected" | "error";

export interface TunnelRuntimeStatus {
  id: string;
  state: TunnelState;
  pid?: number;
  uptime_seconds?: number;
  bytes_in?: number;
  bytes_out?: number;
  error_message?: string;
}

export interface GroupDivider {
  id: string;
  title: string;
}

export interface SSHKeyInfo {
  path: string;
  display_title: string;
  key_type: string;
  comment?: string;
  has_passphrase?: boolean;
  fingerprint?: string;
}

export type ConfigurationTab = "general" | "connection" | "advanced";
export type WindowMode = "mini" | "full";
