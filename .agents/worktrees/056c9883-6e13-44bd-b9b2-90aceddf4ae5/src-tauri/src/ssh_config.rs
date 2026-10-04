use crate::models::{
    CustomDirective, ForwardType, GroupDivider, PortForwarding, Tunnel,
};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

/// Returns the platform-appropriate path to the user's SSH config file.
pub fn get_ssh_config_path() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".ssh").join("config")
}

/// Reads the raw SSH config file content.
pub fn read_ssh_config_raw() -> String {
    let path = get_ssh_config_path();
    fs::read_to_string(&path).unwrap_or_default()
}

/// Parse all tunnels and group dividers from ~/.ssh/config.
pub fn parse_ssh_config(content: &str) -> (Vec<Tunnel>, Vec<GroupDivider>) {
    let mut tunnels = Vec::new();
    let mut groups = Vec::new();

    let lines: Vec<&str> = content.lines().collect();
    let mut i = 0;

    let mut current_tunnel: Option<Tunnel> = None;
    let mut current_group: Option<String> = None;

    while i < lines.len() {
        let line = lines[i];
        let trimmed = line.trim();

        // Check for Group Divider marker: # SSHTM-Divider:{"id":"...","title":"..."} or # Group: xxx
        if trimmed.starts_with("# Remark:") {
            continue;
        }

        if trimmed.starts_with("# SSHTM-Divider:") {
            let json_str = &trimmed["# SSHTM-Divider:".len()..];
            if let Ok(divider) = serde_json::from_str::<GroupDivider>(json_str) {
                current_group = Some(divider.title.clone());
                groups.push(divider);
            }
            i += 1;
            continue;
        } else if trimmed.starts_with("# Group:") {
            let gname = trimmed["# Group:".len()..].trim().to_string();
            if !gname.is_empty() {
                current_group = Some(gname.clone());
                if !groups.iter().any(|g| g.title == gname) {
                    groups.push(GroupDivider {
                        id: Uuid::new_v4().to_string(),
                        title: gname,
                    });
                }
            }
            i += 1;
            continue;
        }

        // Host header
        let lower = trimmed.to_lowercase();
        if lower.starts_with("host ") {
            if let Some(t) = current_tunnel.take() {
                tunnels.push(t);
            }

            let host_line = trimmed["host ".len()..].trim();
            let mut host_parts = host_line.splitn(2, '#');
            let host_alias = host_parts.next().unwrap_or("").trim().to_string();
            let inline_remark = host_parts.next().map(|s| s.trim().to_string());
            let is_general = host_alias == "*";

            let mut t = Tunnel {
                id: if is_general {
                    "general-config".to_string()
                } else {
                    Uuid::new_v4().to_string()
                },
                name: host_alias.clone(),
                host: if is_general { "*".to_string() } else { "".to_string() },
                port: 22,
                group: current_group.clone(),
                remark: None,
                auto_connect: false,
                is_general_config: is_general,
                use_alias: false,
                forwards: Vec::new(),
                custom_directives: Vec::new(),
                field_remarks: None,
                server_alive_interval: None,
                server_alive_count_max: None,
                connect_timeout: None,
                identity_file: None,
                certificate_file: None,
                forward_agent: false,
                identities_only: false,
                control_master: None,
                control_persist: None,
                control_path: None,
                log_level: None,
                connection_attempts: None,
                bind_address: None,
                address_family: None,
                compression: false,
                tcp_keep_alive: false,
                skip_host_key_check: false,
                proxy_jump: None,
                proxy_command: None,
                local_command: None,
                custom_ssh_path: None,
                extra_options: None,
            };

            // Check if preceding line had a remark or metadata
            if i > 0 {
                let prev = lines[i - 1].trim();
                if prev.starts_with("# Remark:") {
                    t.remark = Some(prev["# Remark:".len()..].trim().to_string());
                }
            }
            if let Some(rmk) = inline_remark {
                if !rmk.is_empty() {
                    t.remark = Some(rmk);
                }
            }

            current_tunnel = Some(t);
            i += 1;
            continue;
        }

        // Directives inside current Host block
        if let Some(ref mut t) = current_tunnel {
            // Check for SSHTM-Tunnel metadata line
            if trimmed.starts_with("# SSHTM-Tunnel:") {
                let json_str = trimmed["# SSHTM-Tunnel:".len()..].trim();
                if let Ok(meta) = serde_json::from_str::<serde_json::Value>(json_str) {
                    if let Some(id_val) = meta.get("id").and_then(|v| v.as_str()) {
                        if !id_val.is_empty() {
                            t.id = id_val.to_string();
                        }
                    }
                    if let Some(ac) = meta.get("autoConnect").and_then(|v| v.as_bool()) {
                        t.auto_connect = ac;
                    }
                    if let Some(ua) = meta.get("useAlias").and_then(|v| v.as_bool()) {
                        t.use_alias = ua;
                    }
                    if let Some(rm) = meta.get("remark").and_then(|v| v.as_str()) {
                        if !rm.is_empty() {
                            t.remark = Some(rm.to_string());
                        }
                    }
                    if let Some(grp) = meta.get("group").and_then(|v| v.as_str()) {
                        if grp.is_empty() {
                            t.group = None;
                        } else {
                            t.group = Some(grp.to_string());
                        }
                    }
                }
                i += 1;
                continue;
            }

            let mut active = true;
            let mut directive_line = trimmed;
            if directive_line.starts_with('#') {
                active = false;
                directive_line = directive_line[1..].trim();
            }

            // Split key and value
            let parts: Vec<&str> = directive_line.split_whitespace().collect();
            if !parts.is_empty() {
                let key = parts[0];
                let key_lower = key.to_lowercase();
                let raw_val = if parts.len() > 1 {
                    directive_line[key.len()..].trim()
                } else {
                    ""
                };
                
                let mut val_parts = raw_val.splitn(2, '#');
                let val = val_parts.next().unwrap_or("").trim();
                let inline_rmk = val_parts.next().map(|s| s.trim()).filter(|s| !s.is_empty());
                
                if let Some(rmk) = inline_rmk {
                    let rmk_map = t.field_remarks.get_or_insert_with(std::collections::HashMap::new);
                    rmk_map.insert(key.to_string(), rmk.to_string());
                }

                match key_lower.as_str() {
                    "hostname" => {
                        if active {
                            let curr_user = if t.host.contains('@') {
                                t.host.split('@').next().unwrap_or("")
                            } else {
                                ""
                            };
                            t.host = if !curr_user.is_empty() {
                                format!("{}@{}", curr_user, val)
                            } else {
                                val.to_string()
                            };
                        }
                    }
                    "user" => {
                        if active {
                            let curr_host = if t.host.contains('@') {
                                t.host.split('@').nth(1).unwrap_or("")
                            } else {
                                &t.host
                            };
                            t.host = if !val.is_empty() {
                                format!("{}@{}", val, curr_host)
                            } else {
                                curr_host.to_string()
                            };
                        }
                    }
                    "port" => {
                        if active {
                            t.port = val.parse::<u16>().unwrap_or(22);
                        }
                    }
                    "identityfile" => {
                        if active {
                            t.identity_file = Some(val.to_string());
                        }
                    }
                    "certificatefile" => {
                        if active {
                            t.certificate_file = Some(val.to_string());
                        }
                    }
                    "forwardagent" => {
                        if active {
                            t.forward_agent = val.eq_ignore_ascii_case("yes");
                        }
                    }
                    "identitiesonly" => {
                        if active {
                            t.identities_only = val.eq_ignore_ascii_case("yes");
                        }
                    }
                    "connecttimeout" => {
                        if active {
                            t.connect_timeout = val.parse::<u32>().ok();
                        }
                    }
                    "serveraliveinterval" => {
                        if active {
                            t.server_alive_interval = val.parse::<u32>().ok();
                        }
                    }
                    "serveralivecountmax" => {
                        if active {
                            t.server_alive_count_max = val.parse::<u32>().ok();
                        }
                    }
                    "controlmaster" => {
                        if active {
                            t.control_master = Some(val.to_string());
                        }
                    }
                    "controlpersist" => {
                        if active {
                            t.control_persist = Some(val.to_string());
                        }
                    }
                    "controlpath" => {
                        if active {
                            t.control_path = Some(val.to_string());
                        }
                    }
                    "compression" => {
                        if active {
                            t.compression = val.eq_ignore_ascii_case("yes");
                        }
                    }
                    "tcpkeepalive" => {
                        if active {
                            t.tcp_keep_alive = val.eq_ignore_ascii_case("yes");
                        }
                    }
                    "stricthostkeychecking" => {
                        if active {
                            t.skip_host_key_check = val.eq_ignore_ascii_case("no");
                        }
                    }
                    "proxyjump" => {
                        if active {
                            t.proxy_jump = Some(val.to_string());
                        }
                    }
                    "proxycommand" => {
                        if active {
                            t.proxy_command = Some(val.to_string());
                        }
                    }
                    "localcommand" => {
                        if active {
                            t.local_command = Some(val.to_string());
                        }
                    }
                    "loglevel" => {
                        if active {
                            t.log_level = Some(val.to_string());
                        }
                    }
                    "connectionattempts" => {
                        if active {
                            t.connection_attempts = val.parse::<u32>().ok();
                        }
                    }
                    "bindaddress" => {
                        if active {
                            t.bind_address = Some(val.to_string());
                        }
                    }
                    "addressfamily" => {
                        if active {
                            t.address_family = Some(val.to_string());
                        }
                    }
                    "localforward" => {
                        // format: [bind_address:]port host:hostport
                        if let Some(pf) = parse_port_forward(val, ForwardType::Local, active) {
                            t.forwards.push(pf);
                        }
                    }
                    "remoteforward" => {
                        // format: [bind_address:]port host:hostport
                        if let Some(pf) = parse_port_forward(val, ForwardType::Remote, active) {
                            t.forwards.push(pf);
                        }
                    }
                    "dynamicforward" => {
                        // format: [bind_address:]port
                        if let Some(pf) = parse_port_forward(val, ForwardType::Dynamic, active) {
                            t.forwards.push(pf);
                        }
                    }
                    _ => {
                        if !key.starts_with('#') {
                            t.custom_directives.push(CustomDirective {
                                key: key.to_string(),
                                value: val.to_string(),
                                is_active: active,
                                remark: None,
                            });
                        }
                    }
                }
            }
        }

        i += 1;
    }

    if let Some(t) = current_tunnel {
        tunnels.push(t);
    }

    // Default Host * if none exists
    if !tunnels.iter().any(|t| t.is_general_config) {
        tunnels.insert(
            0,
            Tunnel {
                id: "general-config".to_string(),
                name: "Host * (全局配置)".to_string(),
                host: "*".to_string(),
                port: 22,
                group: None,
                remark: None,
                auto_connect: false,
                is_general_config: true,
                use_alias: false,
                forwards: Vec::new(),
                custom_directives: Vec::new(),
                field_remarks: None,
                server_alive_interval: Some(30),
                server_alive_count_max: Some(3),
                connect_timeout: Some(30),
                identity_file: None,
                certificate_file: None,
                forward_agent: false,
                identities_only: false,
                control_master: Some("no".to_string()),
                control_persist: None,
                control_path: None,
                log_level: None,
                connection_attempts: None,
                bind_address: None,
                address_family: None,
                compression: false,
                tcp_keep_alive: true,
                skip_host_key_check: false,
                proxy_jump: None,
                proxy_command: None,
                local_command: None,
                custom_ssh_path: None,
                extra_options: None,
            },
        );
    }

    let mut existing_titles: std::collections::HashSet<String> = groups.iter().map(|g| g.title.trim().to_string()).collect();
    for t in &tunnels {
        if let Some(ref grp) = t.group {
            let trimmed = grp.trim();
            if !trimmed.is_empty() && existing_titles.insert(trimmed.to_string()) {
                groups.push(GroupDivider {
                    id: Uuid::new_v4().to_string(),
                    title: trimmed.to_string(),
                });
            }
        }
    }

    (tunnels, groups)
}

fn parse_port_forward(val: &str, forward_type: ForwardType, active: bool) -> Option<PortForwarding> {
    let tokens: Vec<&str> = val.split_whitespace().collect();
    if tokens.is_empty() {
        return None;
    }

    if forward_type == ForwardType::Dynamic {
        let first = tokens[0];
        let (bind, port) = if let Some(idx) = first.rfind(':') {
            (&first[..idx], first[idx + 1..].parse::<u16>().unwrap_or(1080))
        } else {
            ("127.0.0.1", first.parse::<u16>().unwrap_or(1080))
        };
        Some(PortForwarding {
            id: Uuid::new_v4().to_string(),
            forward: ForwardType::Dynamic,
            bind_address: bind.to_string(),
            port,
            remote_host: String::new(),
            remote_port: 0,
            is_active: active,
            remark: None,
        })
    } else {
        // Local or Remote: [bind:]port remote_host:remote_port
        let first = tokens[0];
        let (bind, port) = if let Some(idx) = first.rfind(':') {
            (&first[..idx], first[idx + 1..].parse::<u16>().unwrap_or(8080))
        } else {
            ("127.0.0.1", first.parse::<u16>().unwrap_or(8080))
        };

        let second = if tokens.len() > 1 { tokens[1] } else { "" };
        let (rhost, rport) = if let Some(idx) = second.rfind(':') {
            (&second[..idx], second[idx + 1..].parse::<u16>().unwrap_or(80))
        } else {
            (second, 80)
        };

        Some(PortForwarding {
            id: Uuid::new_v4().to_string(),
            forward: forward_type,
            bind_address: bind.to_string(),
            port,
            remote_host: rhost.to_string(),
            remote_port: rport,
            is_active: active,
            remark: None,
        })
    }
}

/// Serialize a Tunnel back into an OpenSSH Host block.
pub fn serialize_tunnel_block(tunnel: &Tunnel) -> String {
    let mut lines = Vec::new();


        let safe_remark = tunnel.remark.as_ref().map(|r| r.replace('\n', " ").replace('\r', " ").trim().to_string());



        let get_rmk = |key: &str| -> String {
        if let Some(ref map) = tunnel.field_remarks {
            for (k, v) in map {
                if k.eq_ignore_ascii_case(key) {
                    return format!(" # {}", v.replace('\n', " ").replace('\r', " ").trim());
                }
            }
        }
        "".to_string()
    };
    
    let host_rmk = if let Some(ref r) = safe_remark { format!(" # {}", r) } else { "".to_string() };

    lines.push(format!("Host {}{}", tunnel.name, host_rmk));

    // SSHTM-Tunnel metadata marker for compatibility with SSHTunnelManager
    let meta_json = serde_json::json!({
        "id": tunnel.id,
        "autoConnect": tunnel.auto_connect,
        "useAlias": tunnel.use_alias,
        "remark": safe_remark.clone().unwrap_or_default(),
        "group": tunnel.group.clone().map(|g| g.replace('\n', " ").replace('\r', " ").trim().to_string()).unwrap_or_default()
    });
    lines.push(format!("    # SSHTM-Tunnel: {}", meta_json));

    if !tunnel.host.is_empty() && tunnel.host != "*" {
        if tunnel.host.contains('@') {
            let mut parts = tunnel.host.splitn(2, '@');
            let user = parts.next().unwrap_or("");
            let hostname = parts.next().unwrap_or("");
            if !hostname.is_empty() {
                lines.push(format!("    HostName {}{}", hostname, get_rmk("hostname")));
            }
            if !user.is_empty() && !tunnel.use_alias {
                lines.push(format!("    User {}{}", user, get_rmk("user")));
            }
        } else {
            lines.push(format!("    HostName {}{}", tunnel.host, get_rmk("hostname")));
        }
    }

    if tunnel.port != 22 && tunnel.port > 0 && !tunnel.use_alias {
        lines.push(format!("    Port {}{}", tunnel.port, get_rmk("port")));
    }

    if let Some(ref id_file) = tunnel.identity_file {
        if !id_file.is_empty() {
            lines.push(format!("    IdentityFile {}", id_file));
        }
    }

    if let Some(ref cert_file) = tunnel.certificate_file {
        if !cert_file.is_empty() {
            lines.push(format!("    CertificateFile {}", cert_file));
        }
    }

    if tunnel.forward_agent {
        lines.push(format!("    ForwardAgent yes{}", get_rmk("forwardagent")));
    }
    if tunnel.identities_only {
        lines.push(format!("    IdentitiesOnly yes{}", get_rmk("identitiesonly")));
    }

    if let Some(timeout) = tunnel.connect_timeout {
        lines.push(format!("    ConnectTimeout {}", timeout));
    }
    if let Some(interval) = tunnel.server_alive_interval {
        lines.push(format!("    ServerAliveInterval {}", interval));
    }
    if let Some(count_max) = tunnel.server_alive_count_max {
        lines.push(format!("    ServerAliveCountMax {}", count_max));
    }

    if let Some(ref cm) = tunnel.control_master {
        if !cm.is_empty() && cm != "no" {
            lines.push(format!("    ControlMaster {}", cm));
        }
    }
    if let Some(ref cp) = tunnel.control_persist {
        if !cp.is_empty() && cp != "no" {
            lines.push(format!("    ControlPersist {}", cp));
        }
    }
    if let Some(ref cpath) = tunnel.control_path {
        if !cpath.is_empty() {
            lines.push(format!("    ControlPath {}", cpath));
        }
    }

    if tunnel.compression {
        lines.push(format!("    Compression yes{}", get_rmk("compression")));
    }
    if tunnel.skip_host_key_check {
        lines.push(format!("    StrictHostKeyChecking no{}", get_rmk("stricthostkeychecking")));
    }

    if let Some(ref val) = tunnel.log_level {
        if !val.trim().is_empty() {
            lines.push(format!("    LogLevel {}{}", val.trim(), get_rmk("loglevel")));
        }
    }
    if let Some(val) = tunnel.connection_attempts {
        lines.push(format!("    ConnectionAttempts {}{}", val, get_rmk("connectionattempts")));
    }
    if let Some(ref val) = tunnel.bind_address {
        if !val.trim().is_empty() {
            lines.push(format!("    BindAddress {}{}", val.trim(), get_rmk("bindaddress")));
        }
    }
    if let Some(ref val) = tunnel.address_family {
        if !val.trim().is_empty() {
            lines.push(format!("    AddressFamily {}{}", val.trim(), get_rmk("addressfamily")));
        }
    }
    if tunnel.tcp_keep_alive {
        lines.push(format!("    TCPKeepAlive yes{}", get_rmk("tcpkeepalive")));
    }

    if let Some(ref pj) = tunnel.proxy_jump {
        if !pj.is_empty() {
            lines.push(format!("    ProxyJump {}", pj));
        }
    }
    if let Some(ref pc) = tunnel.proxy_command {
        if !pc.is_empty() {
            lines.push(format!("    ProxyCommand {}", pc));
        }
    }
    if let Some(ref lc) = tunnel.local_command {
        if !lc.is_empty() {
            lines.push(format!("    LocalCommand {}", lc));
        }
    }

    // Forwards
    for f in &tunnel.forwards {
        let prefix = if f.is_active { "    " } else { "    # " };
        match f.forward {
            ForwardType::Dynamic => {
                let bind = if f.bind_address.is_empty() {
                    "127.0.0.1"
                } else {
                    &f.bind_address
                };
                lines.push(format!("{}DynamicForward {}:{}", prefix, bind, f.port));
            }
            ForwardType::Local => {
                let bind = if f.bind_address.is_empty() {
                    "127.0.0.1"
                } else {
                    &f.bind_address
                };
                lines.push(format!(
                    "{}LocalForward {}:{} {}:{}",
                    prefix, bind, f.port, f.remote_host, f.remote_port
                ));
            }
            ForwardType::Remote | ForwardType::ReverseDynamic => {
                let bind = if f.bind_address.is_empty() {
                    "0.0.0.0"
                } else {
                    &f.bind_address
                };
                lines.push(format!(
                    "{}RemoteForward {}:{} {}:{}",
                    prefix, bind, f.port, f.remote_host, f.remote_port
                ));
            }
        }
    }

    // Custom directives
    let mut seen_directives = std::collections::HashSet::new();
    for d in &tunnel.custom_directives {
        let lower_key = d.key.to_lowercase();
        let val = d.value.trim();
        let directive_hash = format!("{} {}", lower_key, val);
        
        if seen_directives.contains(&directive_hash) {
            continue;
        }
        seen_directives.insert(directive_hash);
        
        let prefix = if d.is_active { "    " } else { "    # " };
        lines.push(format!("{}{}{}", prefix, d.key, if d.value.is_empty() { "" } else { " " }));
        if !d.value.is_empty() {
            lines.last_mut().unwrap().push_str(&d.value);
        }
        let rmk = get_rmk(&d.key.to_lowercase());
        if !rmk.is_empty() {
            lines.last_mut().unwrap().push_str(&rmk);
        }
    }

    lines.join("\n")
}

/// Save or update a tunnel in ~/.ssh/config while preserving other blocks.
pub fn save_tunnel(tunnel: &Tunnel) -> Result<(), String> {
    let path = get_ssh_config_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let raw = fs::read_to_string(&path).unwrap_or_default();
    let new_block = serialize_tunnel_block(tunnel);

    let mut blocks: Vec<String> = Vec::new();
    let mut replaced = false;

    // Naive block separation by `Host ` line
    let lines: Vec<&str> = raw.lines().collect();
    let mut blocks_data: Vec<(Vec<String>, String, String)> = Vec::new();
    let mut current_block_lines = Vec::new();
    let mut current_host_name = String::new();
    let mut current_block_id = String::new();

    for line in lines {
        let trimmed = line.trim();
        if trimmed.starts_with("# Remark:") { continue; }
        
        if trimmed.starts_with("# SSHTM-Tunnel:") {
            let json_str = trimmed["# SSHTM-Tunnel:".len()..].trim();
            if let Ok(meta) = serde_json::from_str::<serde_json::Value>(json_str) {
                if let Some(id_val) = meta.get("id").and_then(|v| v.as_str()) {
                    current_block_id = id_val.to_string();
                }
            }
        }
        
        if trimmed.to_lowercase().starts_with("host ") {
            if !current_block_lines.is_empty() {
                blocks_data.push((current_block_lines.clone(), current_block_id.clone(), current_host_name.clone()));
                current_block_lines.clear();
            }
            current_host_name = trimmed["host ".len()..].trim().splitn(2, '#').next().unwrap_or("").trim().to_string();
            current_block_id.clear();
        }
        current_block_lines.push(line.to_string());
    }
    
    if !current_block_lines.is_empty() {
        blocks_data.push((current_block_lines, current_block_id, current_host_name));
    }

    let mut target_index = None;
    for (i, (_, id, _)) in blocks_data.iter().enumerate() {
        if !id.is_empty() && id == &tunnel.id {
            target_index = Some(i);
            break;
        }
    }
    if target_index.is_none() {
        for (i, (_, _, name)) in blocks_data.iter().enumerate() {
            if name.eq_ignore_ascii_case(&tunnel.name) {
                target_index = Some(i);
                break;
            }
        }
    }

    for (i, (b_lines, _, _)) in blocks_data.into_iter().enumerate() {
        if Some(i) == target_index {
            blocks.push(new_block.clone());
            replaced = true;
        } else {
            blocks.push(b_lines.join("\n"));
        }
    }

    if !replaced {
        blocks.push(new_block);
    }

    let final_content = cleanup_ssh_config(&blocks.join("\n\n"));
    atomic_write_ssh_config(&path, &final_content)
}

/// Delete a tunnel by Host name from ~/.ssh/config.
pub fn delete_tunnel_by_name(name: &str) -> Result<(), String> {
    let path = get_ssh_config_path();
    let raw = fs::read_to_string(&path).unwrap_or_default();

    let mut blocks: Vec<String> = Vec::new();
    let lines: Vec<&str> = raw.lines().collect();
    let mut current_block_lines = Vec::new();
    let mut current_host_name = String::new();
    let target = name.trim();

    for line in lines {
        let trimmed = line.trim();
        if trimmed.starts_with("# Remark:") { continue; }
        if trimmed.to_lowercase().starts_with("host ") {
            if !current_block_lines.is_empty() {
                let matches = current_host_name
                    .split_whitespace()
                    .any(|h| h.eq_ignore_ascii_case(target));
                if !matches {
                    blocks.push(current_block_lines.join("\n"));
                }
                current_block_lines.clear();
            }
            current_host_name = trimmed["host ".len()..].trim().splitn(2, '#').next().unwrap_or("").trim().to_string();
        }
        current_block_lines.push(line);
    }

    if !current_block_lines.is_empty() {
        let matches = current_host_name
            .split_whitespace()
            .any(|h| h.eq_ignore_ascii_case(target));
        if !matches {
            blocks.push(current_block_lines.join("\n"));
        }
    }

    let final_content = cleanup_ssh_config(&blocks.join("\n\n"));
    atomic_write_ssh_config(&path, &final_content)
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_delete_tunnel_logic() {
        let sample = r#"
# Group: 默认分组

Host server-1
    HostName 1.2.3.4
    User root

Host server-2
    HostName 5.6.7.8
    User admin

Host *
    Compression yes
"#;
        let target = "server-1";
        let lines: Vec<&str> = sample.lines().collect();
        let mut blocks: Vec<String> = Vec::new();
        let mut current_block_lines = Vec::new();
        let mut current_host_name = String::new();

        for line in lines {
            let trimmed = line.trim();
            if trimmed.to_lowercase().starts_with("host ") {
                if !current_block_lines.is_empty() {
                    let matches = current_host_name
                        .split_whitespace()
                        .any(|h| h.eq_ignore_ascii_case(target));
                    if !matches {
                        blocks.push(current_block_lines.join("\n"));
                    }
                    current_block_lines.clear();
                }
                current_host_name = trimmed["host ".len()..].trim().splitn(2, '#').next().unwrap_or("").trim().to_string();
            }
            current_block_lines.push(line);
        }

        if !current_block_lines.is_empty() {
            let matches = current_host_name
                .split_whitespace()
                .any(|h| h.eq_ignore_ascii_case(target));
            if !matches {
                blocks.push(current_block_lines.join("\n"));
            }
        }

        let result = blocks.join("\n\n");
        assert!(!result.contains("server-1"));
        assert!(result.contains("server-2"));
        assert!(result.contains("Host *"));
    }
}



fn cleanup_ssh_config(raw: &str) -> String {
    let mut result = String::with_capacity(raw.len());
    let mut current_group = String::new();
    let mut consecutive_newlines = 0;

    for line in raw.lines() {
        let trimmed = line.trim();
        
        if trimmed.is_empty() {
            consecutive_newlines += 1;
            if consecutive_newlines > 1 {
                continue;
            }
        } else {
            consecutive_newlines = 0;
        }

        if trimmed.starts_with("# Remark:") {
            continue;
        }

        if trimmed.starts_with("# SSHTM-Divider:") {
            let json_str = trimmed["# SSHTM-Divider:".len()..].trim();
            if let Ok(meta) = serde_json::from_str::<serde_json::Value>(json_str) {
                if let Some(title) = meta.get("title").and_then(|v| v.as_str()) {
                    if title == current_group {
                        continue;
                    } else {
                        current_group = title.to_string();
                    }
                }
            }
        }

        if !result.is_empty() {
            result.push('\n');
        }
        result.push_str(line);
    }
    result
}

fn atomic_write_ssh_config(path: &std::path::Path, content: &str) -> Result<(), String> {
    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;
    use std::fs;
    
    let target_path = fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let tmp_path = format!("{}.tmp.{}", target_path.display(), std::process::id());
    
    fs::write(&tmp_path, content).map_err(|e| format!("Failed to write temp SSH config: {}", e))?;
    
    #[cfg(unix)]
    if let Ok(metadata) = fs::metadata(&target_path) {
        let _ = fs::set_permissions(&tmp_path, metadata.permissions());
    } else {
        let _ = fs::set_permissions(&tmp_path, std::fs::Permissions::from_mode(0o600));
    }
    
    fs::rename(&tmp_path, &target_path).map_err(|e| format!("Failed to rename temp SSH config: {}", e))
}

pub fn reorder_tunnels(ordered_ids: Vec<String>) -> Result<(), String> {
    let path = get_ssh_config_path();
    let raw = fs::read_to_string(&path).unwrap_or_default();

    let mut blocks: Vec<(Vec<String>, String, String)> = Vec::new(); // lines, id, name
    let lines: Vec<&str> = raw.lines().collect();
    let mut current_block_lines = Vec::new();
    let mut current_block_id = String::new();
    let mut current_host_name = String::new();

    for line in lines {
        let trimmed = line.trim();
        if trimmed.starts_with("# Remark:") { continue; }
        
        if trimmed.starts_with("# SSHTM-Tunnel:") {
            let json_str = trimmed["# SSHTM-Tunnel:".len()..].trim();
            if let Ok(meta) = serde_json::from_str::<serde_json::Value>(json_str) {
                if let Some(id_val) = meta.get("id").and_then(|v| v.as_str()) {
                    current_block_id = id_val.to_string();
                }
            }
        }
        
        if trimmed.to_lowercase().starts_with("host ") {
            if !current_block_lines.is_empty() {
                blocks.push((current_block_lines.clone(), current_block_id.clone(), current_host_name.clone()));
                current_block_lines.clear();
            }
            current_host_name = trimmed["host ".len()..].trim().splitn(2, '#').next().unwrap_or("").trim().to_string();
            current_block_id.clear();
        }
        current_block_lines.push(line.to_string());
    }
    
    if !current_block_lines.is_empty() {
        blocks.push((current_block_lines, current_block_id, current_host_name));
    }

    let mut ordered_blocks = Vec::new();
    let mut processed_indices = std::collections::HashSet::new();

    // 1. Prepend the first unnamed/pre-Host block (if any)
    if let Some((first_idx, (b_lines, id, name))) = blocks.iter().enumerate().next() {
        if name.is_empty() && id.is_empty() {
            ordered_blocks.push(b_lines.join("\n"));
            processed_indices.insert(first_idx);
        }
    }

    // 2. Process ordered_ids
    for target_id in &ordered_ids {
        if let Some(pos) = blocks.iter().position(|(_, id, name)| (!id.is_empty() && id == target_id) || (!name.is_empty() && name == target_id)) {
            if blocks[pos].2 == "*" {
                continue;
            }
            if !processed_indices.contains(&pos) {
                ordered_blocks.push(blocks[pos].0.join("\n"));
                processed_indices.insert(pos);
            }
        }
    }

    // 3. Preserve original relative order for any remaining blocks except "Host *"
    let mut global_block_idx = None;
    for (i, (b_lines, _, name)) in blocks.iter().enumerate() {
        if processed_indices.contains(&i) {
            continue;
        }
        if name == "*" {
            global_block_idx = Some(i);
            continue;
        }
        ordered_blocks.push(b_lines.join("\n"));
        processed_indices.insert(i);
    }

    // 4. Append the "Host *" global block at the very end
    if let Some(idx) = global_block_idx {
        ordered_blocks.push(blocks[idx].0.join("\n"));
    }

    let final_content = cleanup_ssh_config(&ordered_blocks.join("\n\n"));
    atomic_write_ssh_config(&path, &final_content)
}
