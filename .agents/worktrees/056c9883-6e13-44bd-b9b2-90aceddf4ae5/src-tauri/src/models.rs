use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ForwardType {
    Dynamic,
    Local,
    Remote,
    ReverseDynamic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortForwarding {
    pub id: String,
    pub forward: ForwardType,
    pub bind_address: String,
    pub port: u16,
    pub remote_host: String,
    pub remote_port: u16,
    pub is_active: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomDirective {
    pub key: String,
    pub value: String,
    pub is_active: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tunnel {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remark: Option<String>,
    #[serde(default)]
    pub field_remarks: Option<HashMap<String, String>>,
    pub auto_connect: bool,
    pub is_general_config: bool,
    pub use_alias: bool,
    pub forwards: Vec<PortForwarding>,
    pub custom_directives: Vec<CustomDirective>,

    // Resilience
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_alive_interval: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_alive_count_max: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connect_timeout: Option<u32>,

    // Authentication
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identity_file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub certificate_file: Option<String>,
    #[serde(default)]
    pub forward_agent: bool,
    #[serde(default)]
    pub identities_only: bool,

    // Multiplexing
    #[serde(skip_serializing_if = "Option::is_none")]
    pub control_master: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub control_persist: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub control_path: Option<String>,

    // Connection Behavior
    #[serde(skip_serializing_if = "Option::is_none")]
    pub log_level: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub connection_attempts: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bind_address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address_family: Option<String>,
    #[serde(default)]
    pub compression: bool,
    #[serde(default)]
    pub tcp_keep_alive: bool,
    #[serde(default)]
    pub skip_host_key_check: bool,

    // Routing & Jump
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proxy_jump: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proxy_command: Option<String>,

    // Execution
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local_command: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_ssh_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extra_options: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TunnelState {
    Disconnected,
    Connecting,
    Connected,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelRuntimeStatus {
    pub id: String,
    pub state: TunnelState,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pid: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uptime_seconds: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GroupDivider {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SSHKeyInfo {
    pub path: String,
    pub display_title: String,
    pub key_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub comment: Option<String>,
}
