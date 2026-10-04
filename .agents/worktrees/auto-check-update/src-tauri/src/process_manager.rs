use crate::models::{ForwardType, Tunnel, TunnelRuntimeStatus, TunnelState};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;

pub struct ProcessManager {
    running: Arc<Mutex<HashMap<String, ActiveProcess>>>,
    last_errors: Arc<Mutex<HashMap<String, String>>>,
}

struct ActiveProcess {
    child: Child,
    started_at: Instant,
}

fn classify_ssh_error(stderr: &str, exit_code: Option<i32>) -> String {
    let lower = stderr.to_lowercase();
    if lower.contains("permission denied") || lower.contains("authentication failed") || lower.contains("no more authentication methods") {
        "认证失败：请检查密钥或身份文件 (Authentication failed)".to_string()
    } else if lower.contains("connection refused") {
        "连接被拒绝：SSH 服务可能未启动或端口错误 (Connection refused)".to_string()
    } else if lower.contains("operation timed out") || lower.contains("connection timed out") || lower.contains("no route to host") || lower.contains("network is unreachable") {
        "主机不可达：请检查网络或防火墙 (Host unreachable / timed out)".to_string()
    } else if lower.contains("could not resolve hostname") || lower.contains("name or service not known") {
        "无法解析主机名：DNS 解析失败 (Could not resolve hostname)".to_string()
    } else if lower.contains("host key verification failed") || lower.contains("remote host identification has changed") {
        "主机密钥已变更：请检查或开启跳过主机检查 (Host key changed)".to_string()
    } else if lower.contains("address already in use") || lower.contains("cannot listen to port") {
        "本地端口已被占用：请更换本地端口或清理旧进程 (Port already in use)".to_string()
    } else if lower.contains("remote port forwarding failed") {
        "服务器拒绝绑定远端转发端口 (Remote port forwarding failed)".to_string()
    } else if lower.contains("administratively prohibited") || lower.contains("open failed") {
        "服务器拒绝端口转发 (Port forward administratively prohibited)".to_string()
    } else if !stderr.trim().is_empty() {
        stderr.trim().to_string()
    } else if let Some(code) = exit_code {
        format!("连接异常断开 (Exit Code: {})", code)
    } else {
        "连接发生未知错误".to_string()
    }
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            running: Arc::new(Mutex::new(HashMap::new())),
            last_errors: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Spawns an SSH background process for the given tunnel.
    pub fn start_tunnel(&self, tunnel: &Tunnel) -> Result<(), String> {
        let existing = {
            let mut map = self.running.lock().map_err(|e| e.to_string())?;
            map.remove(&tunnel.id)
        };
        
        if let Some(mut active) = existing {
            let _ = active.child.kill();
            let _ = active.child.wait();
        }
        
        let mut map = self.running.lock().map_err(|e| e.to_string())?;

        // Clear any previous error for this tunnel
        if let Ok(mut errors) = self.last_errors.lock() {
            errors.remove(&tunnel.id);
        }

        // Determine ssh binary: custom path or platform default
        let ssh_bin = tunnel
            .custom_ssh_path
            .clone()
            .unwrap_or_else(|| {
                if cfg!(target_os = "windows") {
                    r"C:\Windows\System32\OpenSSH\ssh.exe".to_string()
                } else {
                    "/usr/bin/ssh".to_string()
                }
            });

        let mut cmd = Command::new(&ssh_bin);

        // Core flags: non-interactive background tunnel
        cmd.arg("-N");

        // Assemble port forwards
        for f in &tunnel.forwards {
            if !f.is_active {
                continue;
            }
            match f.forward {
                ForwardType::Dynamic => {
                    let bind = if f.bind_address.is_empty() {
                        "127.0.0.1"
                    } else {
                        &f.bind_address
                    };
                    cmd.arg("-D").arg(format!("{}:{}", bind, f.port));
                }
                ForwardType::Local => {
                    let bind = if f.bind_address.is_empty() {
                        "127.0.0.1"
                    } else {
                        &f.bind_address
                    };
                    let clean = f.remote_host.trim_matches(|c| c == '[' || c == ']');
                    let rhost = if clean.contains(':') {
                        format!("[{}]", clean)
                    } else {
                        clean.to_string()
                    };
                    cmd.arg("-L").arg(format!("{}:{}:{}:{}", bind, f.port, rhost, f.remote_port));
                }
                ForwardType::Remote | ForwardType::ReverseDynamic => {
                    let bind = if f.bind_address.is_empty() {
                        "0.0.0.0"
                    } else {
                        &f.bind_address
                    };
                    let clean = f.remote_host.trim_matches(|c| c == '[' || c == ']');
                    let rhost = if clean.contains(':') {
                        format!("[{}]", clean)
                    } else {
                        clean.to_string()
                    };
                    cmd.arg("-R").arg(format!("{}:{}:{}:{}", bind, f.port, rhost, f.remote_port));
                }
            }
        }

        // Custom directives
        for d in &tunnel.custom_directives {
            if d.is_active && !d.value.trim().is_empty() {
                cmd.arg("-o").arg(format!("{}={}", d.key, d.value.trim()));
            }
        }

        // Connection timeout
        let timeout = tunnel.connect_timeout.unwrap_or(30);
        cmd.arg("-o").arg(format!("ConnectTimeout={}", timeout));

        // Compression
        if tunnel.compression {
            cmd.arg("-C");
        }

        // TCPKeepAlive
        if !tunnel.tcp_keep_alive {
            cmd.arg("-o").arg("TCPKeepAlive=no");
        }

        // Skip host key checking
        if tunnel.skip_host_key_check {
            cmd.arg("-o").arg("StrictHostKeyChecking=no");
            cmd.arg("-o").arg("UserKnownHostsFile=/dev/null");
        }

        // ProxyJump
        if let Some(ref pj) = tunnel.proxy_jump {
            if !pj.trim().is_empty() {
                cmd.arg("-J").arg(pj.trim());
            }
        }

        // Server alive keepalive
        let interval = tunnel.server_alive_interval.unwrap_or(30);
        let count_max = tunnel.server_alive_count_max.unwrap_or(3);
        cmd.arg("-o").arg(format!("ServerAliveInterval={}", interval));
        cmd.arg("-o").arg(format!("ServerAliveCountMax={}", count_max));

        // Standard resilience and background tunnel flags
        cmd.arg("-o").arg("ExitOnForwardFailure=yes");
        cmd.arg("-o").arg(format!("ControlMaster={}", tunnel.control_master.as_deref().unwrap_or("no")));
        cmd.arg("-o").arg("BatchMode=yes");
        cmd.arg("-o").arg("RequestTTY=no");
        cmd.arg("-o").arg("RemoteCommand=none");
        let attempts = tunnel.connection_attempts.unwrap_or(2);
        cmd.arg("-o").arg(format!("ConnectionAttempts={}", attempts));

        if let Some(ref cp) = tunnel.control_path {
            if !cp.trim().is_empty() {
                cmd.arg("-o").arg(format!("ControlPath={}", cp.trim()));
            }
        } else if tunnel.control_master.as_deref().unwrap_or("no") == "no" {
            cmd.arg("-o").arg("ControlPath=none");
        }

        if !tunnel.use_alias {
            if let Some(ref id_file) = tunnel.identity_file {
                if !id_file.is_empty() {
                    cmd.arg("-i").arg(id_file);
                    if tunnel.identities_only {
                        cmd.arg("-o").arg("IdentitiesOnly=yes");
                    }
                }
            }
        }

        // Port override
        if !tunnel.use_alias && tunnel.port != 22 && tunnel.port > 0 {
            cmd.arg("-p").arg(tunnel.port.to_string());
        }

        // Target: alias or host
        let target = if !tunnel.host.is_empty() {
            &tunnel.host
        } else {
            &tunnel.name
        };
        cmd.arg(target);

        // Capture stderr for error classification
        cmd.stdout(Stdio::null());
        cmd.stderr(Stdio::piped());

        // Spawn process
        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn SSH process: {}", e))?;

        if let Some(stderr) = child.stderr.take() {
            let id = tunnel.id.clone();
            let last_errors = self.last_errors.clone();
            thread::spawn(move || {
                let reader = BufReader::new(stderr);
                let mut last_line = String::new();
                for line in reader.lines() {
                    if let Ok(line) = line {
                        let trimmed = line.trim();
                        if !trimmed.is_empty() {
                            last_line = trimmed.to_string();
                        }
                    }
                }
                if !last_line.is_empty() {
                    if let Ok(mut errors) = last_errors.lock() {
                        let error_msg = classify_ssh_error(&last_line, None);
                        errors.insert(id, error_msg);
                    }
                }
            });
        }

        map.insert(
            tunnel.id.clone(),
            ActiveProcess {
                child,
                started_at: Instant::now(),
            },
        );

        Ok(())
    }

    /// Stops the running SSH process for a tunnel.
    pub fn stop_tunnel(&self, id: &str) -> Result<(), String> {
        let existing = {
            let mut map = self.running.lock().map_err(|e| e.to_string())?;
            map.remove(id)
        };
        if let Some(mut active) = existing {
            let _ = active.child.kill();
            let _ = active.child.wait();
        }
        if let Ok(mut errors) = self.last_errors.lock() {
            errors.remove(id);
        }
        Ok(())
    }

    /// Returns a map of all tunnel runtime states.
    pub fn get_runtime_status(&self) -> HashMap<String, TunnelRuntimeStatus> {
        let mut result = HashMap::new();
        let mut map = match self.running.lock() {
            Ok(m) => m,
            Err(_) => return result,
        };
        let mut errors_map = self.last_errors.lock().unwrap_or_else(|e| e.into_inner());

        // Check each process
        let mut dead_keys = Vec::new();
        for (id, active) in map.iter_mut() {
            match active.child.try_wait() {
                Ok(Some(status)) => {
                    // Process has terminated
                    let has_error = !status.success();
                    let state = if has_error { TunnelState::Error } else { TunnelState::Disconnected };
                    let mut err_msg = None;
                    if has_error {
                        if let Some(msg) = errors_map.get(id) {
                            err_msg = Some(msg.clone());
                        } else {
                            err_msg = Some(classify_ssh_error("", status.code()));
                            errors_map.insert(id.clone(), err_msg.clone().unwrap());
                        }
                    }
                    dead_keys.push((id.clone(), state, err_msg));
                }
                Ok(None) => {
                    // Still running
                    result.insert(
                        id.clone(),
                        TunnelRuntimeStatus {
                            id: id.clone(),
                            state: TunnelState::Connected,
                            pid: Some(active.child.id()),
                            uptime_seconds: Some(active.started_at.elapsed().as_secs()),
                            error_message: None,
                        },
                    );
                }
                Err(_e) => {
                    let err_msg = Some("无法获取进程状态".to_string());
                    errors_map.insert(id.clone(), err_msg.clone().unwrap());
                    dead_keys.push((id.clone(), TunnelState::Error, err_msg));
                }
            }
        }

        for (id, state, err_msg) in dead_keys {
            map.remove(&id);
            result.insert(
                id.clone(),
                TunnelRuntimeStatus {
                    id,
                    state,
                    pid: None,
                    uptime_seconds: None,
                    error_message: err_msg,
                },
            );
        }

        // Include any sticky errors for processes that are no longer in `running` map
        for (id, err_msg) in errors_map.iter() {
            if !result.contains_key(id) {
                result.insert(
                    id.clone(),
                    TunnelRuntimeStatus {
                        id: id.clone(),
                        state: TunnelState::Error,
                        pid: None,
                        uptime_seconds: None,
                        error_message: Some(err_msg.clone()),
                    },
                );
            }
        }

        result
    }
}