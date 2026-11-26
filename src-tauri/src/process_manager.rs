use crate::models::{ForwardType, Tunnel, TunnelRuntimeStatus, TunnelState};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream, ToSocketAddrs};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub struct ProcessManager {
    running: Arc<Mutex<HashMap<String, ActiveProcess>>>,
    last_errors: Arc<Mutex<HashMap<String, String>>>,
    desired_tunnels: Arc<Mutex<HashMap<String, Tunnel>>>,
    reconnect_states: Arc<Mutex<HashMap<String, ReconnectState>>>,
}

struct ActiveProcess {
    child: Child,
    started_at: Instant,
    local_probe_addrs: Vec<SocketAddr>,
    ready: bool,
}

impl ActiveProcess {
    fn new(child: Child, tunnel: &Tunnel) -> Self {
        let local_probe_addrs = extract_local_probe_addrs(tunnel);
        let ready = local_probe_addrs.is_empty();
        Self {
            child,
            started_at: Instant::now(),
            local_probe_addrs,
            ready,
        }
    }
}

const PORT_PROBE_TIMEOUT: Duration = Duration::from_millis(120);

/// Extracts local listening socket addresses for active `-L` (Local) and `-D` (Dynamic) forwards.
fn extract_local_probe_addrs(tunnel: &Tunnel) -> Vec<SocketAddr> {
    let mut addrs = Vec::new();
    for f in tunnel.forwards.iter().filter(|f| f.is_active) {
        if !matches!(f.forward, ForwardType::Local | ForwardType::Dynamic) {
            continue;
        }
        let raw_bind = f.bind_address.trim().trim_start_matches('[').trim_end_matches(']');
        let mapped_host = match raw_bind {
            "" | "0.0.0.0" | "*" => "127.0.0.1",
            "::" => "::1",
            other => other,
        };
        if let Ok(ip) = mapped_host.parse::<IpAddr>() {
            let addr = SocketAddr::new(ip, f.port);
            if !addrs.contains(&addr) {
                addrs.push(addr);
            }
        } else if let Ok(mut resolved) = (mapped_host, f.port).to_socket_addrs() {
            if let Some(addr) = resolved.next() {
                if !addrs.contains(&addr) {
                    addrs.push(addr);
                }
            }
        } else {
            let fallback = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), f.port);
            if !addrs.contains(&fallback) {
                addrs.push(fallback);
            }
        }
    }
    addrs
}

/// Probes whether all local forwarding ports are actively accepting TCP connections.
fn probe_local_ports(addrs: &[SocketAddr]) -> bool {
    if addrs.is_empty() {
        return true;
    }
    addrs
        .iter()
        .all(|addr| TcpStream::connect_timeout(addr, PORT_PROBE_TIMEOUT).is_ok())
}

const MAX_RECONNECT_ATTEMPTS: u32 = 3;
const STABLE_CONNECTION_THRESHOLD: Duration = Duration::from_secs(4);

#[derive(Clone, Debug)]
struct ReconnectState {
    attempts: u32,
    next_retry_at: Instant,
    last_error: Option<String>,
}

fn format_reconnect_exhausted_error(base_err: &str) -> String {
    format!(
        "{} (已重试 {} 次均失败，已停止重连)",
        base_err, MAX_RECONNECT_ATTEMPTS
    )
}

/// Strictly increasing reconnect backoff in seconds for attempts 1..=MAX_RECONNECT_ATTEMPTS.
fn reconnect_backoff_secs(attempt: u32) -> u64 {
    match attempt {
        0 | 1 => 2,
        2 => 5,
        3 => 10,
        _ => 15,
    }
}

fn format_reconnecting_message(state: &ReconnectState) -> String {
    if let Some(ref err) = state.last_error {
        format!(
            "{} (正在自动重连第 {}/{} 次...)",
            err, state.attempts, MAX_RECONNECT_ATTEMPTS
        )
    } else {
        format!(
            "正在自动重连 (第 {}/{} 次)...",
            state.attempts, MAX_RECONNECT_ATTEMPTS
        )
    }
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
        "本地端口已被占用：请检查是否已有旧进程在运行 (Port already in use)".to_string()
    } else if lower.contains("remote port forwarding failed") {
        "服务器拒绝绑定远端转发端口 (Remote port forwarding failed)".to_string()
    } else if lower.contains("administratively prohibited") || lower.contains("open failed") {
        "服务器拒绝端口转发 (Port forward administratively prohibited)".to_string()
    } else if !stderr.trim().is_empty() {
        stderr.trim().to_string()
    } else if let Some(code) = exit_code {
        format!("连接异常断开 (Exit Code: {})", code)
    } else {
        "连接断开 (进程已终止)".to_string()
    }
}

/// Detect and cleanly terminate any stale orphan SSH processes that are occupying the target local ports.
fn cleanup_orphan_ssh_for_ports(ports: &[u16]) {
    #[cfg(unix)]
    {
        for &port in ports {
            if port == 0 {
                continue;
            }
            if let Ok(output) = Command::new("lsof")
                .arg("-ti")
                .arg(format!(":{}", port))
                .output()
            {
                if output.status.success() {
                    let pids_str = String::from_utf8_lossy(&output.stdout);
                    for pid_line in pids_str.lines() {
                        let trimmed_pid = pid_line.trim();
                        if trimmed_pid.is_empty() {
                            continue;
                        }
                        if let Ok(pid) = trimmed_pid.parse::<i32>() {
                            // Check if this process is an ssh process
                            if let Ok(comm_out) = Command::new("ps")
                                .arg("-p")
                                .arg(pid.to_string())
                                .arg("-o")
                                .arg("comm=")
                                .output()
                            {
                                let comm = String::from_utf8_lossy(&comm_out.stdout).to_lowercase();
                                if comm.contains("ssh") {
                                    // Kill orphan ssh process to release port
                                    let _ = Command::new("kill").arg("-9").arg(pid.to_string()).status();
                                    thread::sleep(Duration::from_millis(100));
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

fn spawn_ssh_child(tunnel: &Tunnel, last_errors: Arc<Mutex<HashMap<String, String>>>) -> Result<Child, String> {
    // 1. Clean up any orphan ssh processes holding our forwarding ports
    let mut ports_to_clean = Vec::new();
    for f in &tunnel.forwards {
        if f.is_active {
            ports_to_clean.push(f.port);
        }
    }
    cleanup_orphan_ssh_for_ports(&ports_to_clean);

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
        let errors_ref = last_errors.clone();
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
                if let Ok(mut errors) = errors_ref.lock() {
                    let error_msg = classify_ssh_error(&last_line, None);
                    errors.insert(id, error_msg);
                }
            }
        });
    }

    Ok(child)
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            running: Arc::new(Mutex::new(HashMap::new())),
            last_errors: Arc::new(Mutex::new(HashMap::new())),
            desired_tunnels: Arc::new(Mutex::new(HashMap::new())),
            reconnect_states: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Spawns an SSH background process for the given tunnel and registers it as desired active.
    pub fn start_tunnel(&self, tunnel: &Tunnel) -> Result<(), String> {
        // Register tunnel as desired
        if let Ok(mut desired) = self.desired_tunnels.lock() {
            desired.insert(tunnel.id.clone(), tunnel.clone());
        }

        // Clear any existing reconnect state
        if let Ok(mut re_states) = self.reconnect_states.lock() {
            re_states.remove(&tunnel.id);
        }

        // Kill any existing running process
        let existing = {
            let mut map = self.running.lock().map_err(|e| e.to_string())?;
            map.remove(&tunnel.id)
        };

        if let Some(mut active) = existing {
            let _ = active.child.kill();
            let _ = active.child.wait();
        }

        // Clear any previous error for this tunnel
        if let Ok(mut errors) = self.last_errors.lock() {
            errors.remove(&tunnel.id);
        }

        match spawn_ssh_child(tunnel, self.last_errors.clone()) {
            Ok(child) => {
                let mut map = self.running.lock().map_err(|e| e.to_string())?;
                map.insert(tunnel.id.clone(), ActiveProcess::new(child, tunnel));
                Ok(())
            }
            Err(e) => {
                // If auto_reconnect is enabled, register into reconnect_states for retrying with backoff
                if tunnel.auto_reconnect.unwrap_or(true) {
                    if let Ok(mut re_states) = self.reconnect_states.lock() {
                        re_states.insert(
                            tunnel.id.clone(),
                            ReconnectState {
                                attempts: 1,
                                next_retry_at: Instant::now()
                                    + Duration::from_secs(reconnect_backoff_secs(1)),
                                last_error: Some(e.clone()),
                            },
                        );
                    }
                }
                if let Ok(mut errors) = self.last_errors.lock() {
                    errors.insert(tunnel.id.clone(), e.clone());
                }
                Err(e)
            }
        }
    }

    /// Stops the running SSH process for a tunnel and unregisters desired active state.
    pub fn stop_tunnel(&self, id: &str) -> Result<(), String> {
        // Unregister from desired active state
        if let Ok(mut desired) = self.desired_tunnels.lock() {
            desired.remove(id);
        }

        // Unregister from reconnect states
        if let Ok(mut re_states) = self.reconnect_states.lock() {
            re_states.remove(id);
        }

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

    /// Updates cached tunnel configuration for desired active tunnels.
    pub fn update_tunnel_config(&self, tunnel: &Tunnel) {
        if let Ok(mut desired) = self.desired_tunnels.lock() {
            if desired.contains_key(&tunnel.id) {
                desired.insert(tunnel.id.clone(), tunnel.clone());
            }
        }
    }

    /// Starts the background supervisor loop that monitors processes and performs automatic reconnection.
    pub fn start_supervisor(&self, app_handle: AppHandle) {
        let running = self.running.clone();
        let last_errors = self.last_errors.clone();
        let desired_tunnels = self.desired_tunnels.clone();
        let reconnect_states = self.reconnect_states.clone();

        tauri::async_runtime::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_millis(1000)).await;

                let mut state_changed = false;

                // 1. Check existing running processes
                let mut terminated = Vec::new();
                let mut to_probe: Vec<(String, Vec<SocketAddr>)> = Vec::new();
                {
                    if let Ok(mut run_map) = running.lock() {
                        let mut errors_map = last_errors.lock().unwrap_or_else(|e| e.into_inner());
                        for (id, active) in run_map.iter_mut() {
                            match active.child.try_wait() {
                                Ok(Some(status)) => {
                                    let has_error = !status.success();
                                    let err_msg = if let Some(msg) = errors_map.get(id) {
                                        msg.clone()
                                    } else {
                                        let msg = classify_ssh_error("", status.code());
                                        errors_map.insert(id.clone(), msg.clone());
                                        msg
                                    };
                                    let uptime = active.started_at.elapsed();
                                    terminated.push((id.clone(), has_error, err_msg, uptime));
                                }
                                Ok(None) => {
                                    if !active.ready {
                                        if active.local_probe_addrs.is_empty() {
                                            active.ready = true;
                                            state_changed = true;
                                        } else {
                                            to_probe.push((id.clone(), active.local_probe_addrs.clone()));
                                        }
                                    }
                                }
                                Err(_) => {
                                    let err_msg = "无法获取进程状态".to_string();
                                    errors_map.insert(id.clone(), err_msg.clone());
                                    terminated.push((id.clone(), true, err_msg, Duration::ZERO));
                                }
                            }
                        }

                        for (id, _, _, _) in &terminated {
                            run_map.remove(id);
                        }
                    }
                }

                // 1.5 Probe local listening ports outside of locks
                if !to_probe.is_empty() {
                    let mut newly_ready = Vec::new();
                    for (id, addrs) in to_probe {
                        if probe_local_ports(&addrs) {
                            newly_ready.push(id);
                        }
                    }
                    if !newly_ready.is_empty() {
                        if let Ok(mut run_map) = running.lock() {
                            for id in newly_ready {
                                if let Some(active) = run_map.get_mut(&id) {
                                    if !active.ready {
                                        active.ready = true;
                                        state_changed = true;
                                    }
                                }
                            }
                        }
                    }
                }

                // 1.6 Clear reconnect state only after tunnel is both port-ready and past stability threshold
                {
                    if let Ok(run_map) = running.lock() {
                        if let Ok(mut re_states) = reconnect_states.lock() {
                            for (id, active) in run_map.iter() {
                                if active.ready && active.started_at.elapsed() >= STABLE_CONNECTION_THRESHOLD {
                                    if re_states.remove(id).is_some() {
                                        state_changed = true;
                                    }
                                }
                            }
                        }
                    }
                }

                if !terminated.is_empty() {
                    state_changed = true;
                    let mut desired = desired_tunnels.lock().unwrap_or_else(|e| e.into_inner());
                    let mut re_states = reconnect_states.lock().unwrap_or_else(|e| e.into_inner());

                    for (id, _has_error, err_msg, uptime) in terminated {
                        if let Some(tunnel) = desired.get(&id).cloned() {
                            if tunnel.auto_reconnect.unwrap_or(true) {
                                // If process died before stabilizing, treat it as a failed reconnect attempt.
                                let current_attempts = re_states.get(&id).map(|s| s.attempts).unwrap_or(0);
                                let new_attempts = if uptime < STABLE_CONNECTION_THRESHOLD {
                                    current_attempts.saturating_add(1)
                                } else {
                                    1
                                };
                                if new_attempts > MAX_RECONNECT_ATTEMPTS {
                                    desired.remove(&id);
                                    re_states.remove(&id);
                                    if let Ok(mut errors_map) = last_errors.lock() {
                                        errors_map.insert(
                                            id.clone(),
                                            format_reconnect_exhausted_error(&err_msg),
                                        );
                                    }
                                } else {
                                    let delay_secs = reconnect_backoff_secs(new_attempts);
                                    re_states.insert(
                                        id.clone(),
                                        ReconnectState {
                                            attempts: new_attempts,
                                            next_retry_at: Instant::now() + Duration::from_secs(delay_secs),
                                            last_error: Some(err_msg),
                                        },
                                    );
                                }
                            }
                        }
                    }
                }

                // 2. Check desired tunnels that need reconnecting
                let mut tunnels_to_retry = Vec::new();
                {
                    let desired = desired_tunnels.lock().unwrap_or_else(|e| e.into_inner());
                    let run_map = running.lock().unwrap_or_else(|e| e.into_inner());
                    let mut re_states = reconnect_states.lock().unwrap_or_else(|e| e.into_inner());
                    let now = Instant::now();

                    for (id, tunnel) in desired.iter() {
                        if run_map.contains_key(id) {
                            continue;
                        }
                        if !tunnel.auto_reconnect.unwrap_or(true) {
                            continue;
                        }

                        if let Some(state) = re_states.get_mut(id) {
                            if now >= state.next_retry_at {
                                tunnels_to_retry.push((tunnel.clone(), state.attempts));
                            }
                        } else {
                            // In desired tunnels but not in running and not in reconnect_states
                            re_states.insert(
                                id.clone(),
                                ReconnectState {
                                    attempts: 1,
                                    next_retry_at: now + Duration::from_secs(reconnect_backoff_secs(1)),
                                    last_error: None,
                                },
                            );
                            state_changed = true;
                        }
                    }
                }

                // 3. Attempt to reconnect
                for (tunnel, attempts) in tunnels_to_retry {
                    match spawn_ssh_child(&tunnel, last_errors.clone()) {
                        Ok(child) => {
                            if let Ok(mut run_map) = running.lock() {
                                run_map.insert(tunnel.id.clone(), ActiveProcess::new(child, &tunnel));
                            }
                            // Keep reconnect_states with current attempts until it runs stably for >4s
                            if let Ok(mut re_states) = reconnect_states.lock() {
                                if let Some(s) = re_states.get_mut(&tunnel.id) {
                                    s.next_retry_at = Instant::now() + Duration::from_secs(5);
                                }
                            }
                            if let Ok(mut errors) = last_errors.lock() {
                                errors.remove(&tunnel.id);
                            }
                            state_changed = true;
                        }
                        Err(e) => {
                            let next_attempts = attempts.saturating_add(1);
                            if next_attempts > MAX_RECONNECT_ATTEMPTS {
                                if let Ok(mut desired) = desired_tunnels.lock() {
                                    desired.remove(&tunnel.id);
                                }
                                if let Ok(mut re_states) = reconnect_states.lock() {
                                    re_states.remove(&tunnel.id);
                                }
                                if let Ok(mut errors) = last_errors.lock() {
                                    errors.insert(
                                        tunnel.id.clone(),
                                        format_reconnect_exhausted_error(&e),
                                    );
                                }
                            } else {
                                let delay_secs = reconnect_backoff_secs(next_attempts);
                                if let Ok(mut re_states) = reconnect_states.lock() {
                                    re_states.insert(
                                        tunnel.id.clone(),
                                        ReconnectState {
                                            attempts: next_attempts,
                                            next_retry_at: Instant::now() + Duration::from_secs(delay_secs),
                                            last_error: Some(e.clone()),
                                        },
                                    );
                                }
                                if let Ok(mut errors) = last_errors.lock() {
                                    errors.insert(tunnel.id.clone(), e);
                                }
                            }
                            state_changed = true;
                        }
                    }
                }

                // 4. If any state changed, notify tray and webview
                if state_changed {
                    let _ = crate::tray::update_tray_menu(&app_handle);

                    let mut status_map = HashMap::new();
                    {
                        let run_map = running.lock().unwrap_or_else(|e| e.into_inner());
                        let re_states = reconnect_states.lock().unwrap_or_else(|e| e.into_inner());
                        for (id, active) in run_map.iter() {
                            // Keep reporting Connecting while in the reconnect observation period
                            if re_states.contains_key(id) {
                                continue;
                            }
                            if !active.ready {
                                status_map.insert(
                                    id.clone(),
                                    TunnelRuntimeStatus {
                                        id: id.clone(),
                                        state: TunnelState::Connecting,
                                        pid: Some(active.child.id()),
                                        uptime_seconds: None,
                                        error_message: None,
                                    },
                                );
                                continue;
                            }
                            status_map.insert(
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
                        for (id, state) in re_states.iter() {
                            if !status_map.contains_key(id) {
                                status_map.insert(
                                    id.clone(),
                                    TunnelRuntimeStatus {
                                        id: id.clone(),
                                        state: TunnelState::Connecting,
                                        pid: None,
                                        uptime_seconds: None,
                                        error_message: Some(format_reconnecting_message(state)),
                                    },
                                );
                            }
                        }
                    }
                    let _ = app_handle.emit("tunnel-status-changed", status_map);
                }
            }
        });
    }

    /// Returns a map of all tunnel runtime states.
    pub fn get_runtime_status(&self) -> HashMap<String, TunnelRuntimeStatus> {
        let mut result = HashMap::new();
        let mut map = match self.running.lock() {
            Ok(m) => m,
            Err(_) => return result,
        };
        let mut errors_map = self.last_errors.lock().unwrap_or_else(|e| e.into_inner());
        let mut re_states = self.reconnect_states.lock().unwrap_or_else(|e| e.into_inner());
        let mut desired = self.desired_tunnels.lock().unwrap_or_else(|e| e.into_inner());

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
                    dead_keys.push((id.clone(), state, err_msg, active.started_at.elapsed()));
                }
                Ok(None) => {
                    // Still running: keep reporting Connecting until port probe succeeds and reconnect observation passes
                    if !re_states.contains_key(id) {
                        if active.ready {
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
                        } else {
                            result.insert(
                                id.clone(),
                                TunnelRuntimeStatus {
                                    id: id.clone(),
                                    state: TunnelState::Connecting,
                                    pid: Some(active.child.id()),
                                    uptime_seconds: None,
                                    error_message: None,
                                },
                            );
                        }
                    }
                }
                Err(_e) => {
                    let err_msg = Some("无法获取进程状态".to_string());
                    errors_map.insert(id.clone(), err_msg.clone().unwrap());
                    dead_keys.push((id.clone(), TunnelState::Error, err_msg, Duration::ZERO));
                }
            }
        }

        for (id, state, err_msg, uptime) in dead_keys {
            map.remove(&id);
            if let Some(tunnel) = desired.get(&id).cloned() {
                if tunnel.auto_reconnect.unwrap_or(true) {
                    let current_attempts = re_states.get(&id).map(|s| s.attempts).unwrap_or(0);
                    let new_attempts = if uptime < STABLE_CONNECTION_THRESHOLD {
                        current_attempts.saturating_add(1)
                    } else {
                        1
                    };
                    if new_attempts > MAX_RECONNECT_ATTEMPTS {
                        desired.remove(&id);
                        re_states.remove(&id);
                        let final_err = format_reconnect_exhausted_error(
                            err_msg.as_deref().unwrap_or("连接异常断开"),
                        );
                        errors_map.insert(id.clone(), final_err.clone());
                        result.insert(
                            id.clone(),
                            TunnelRuntimeStatus {
                                id,
                                state: TunnelState::Error,
                                pid: None,
                                uptime_seconds: None,
                                error_message: Some(final_err),
                            },
                        );
                    } else {
                        re_states.insert(
                            id.clone(),
                            ReconnectState {
                                attempts: new_attempts,
                                next_retry_at: Instant::now()
                                    + Duration::from_secs(reconnect_backoff_secs(new_attempts)),
                                last_error: err_msg,
                            },
                        );
                    }
                    continue;
                }
            }
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

        // Include reconnecting tunnels as Connecting (only if not already connected in result)
        for (id, state) in re_states.iter() {
            if !result.contains_key(id) {
                result.insert(
                    id.clone(),
                    TunnelRuntimeStatus {
                        id: id.clone(),
                        state: TunnelState::Connecting,
                        pid: None,
                        uptime_seconds: None,
                        error_message: Some(format_reconnecting_message(state)),
                    },
                );
            }
        }

        // Include any sticky errors for processes that are neither running nor reconnecting
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

impl Drop for ProcessManager {
    fn drop(&mut self) {
        if let Ok(mut map) = self.running.lock() {
            for (_, mut active) in map.drain() {
                let _ = active.child.kill();
                let _ = active.child.wait();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reconnect_constants_and_messages_match_expected_limit() {
        assert_eq!(MAX_RECONNECT_ATTEMPTS, 3);
        let d1 = reconnect_backoff_secs(1);
        let d2 = reconnect_backoff_secs(2);
        let d3 = reconnect_backoff_secs(3);
        assert!(d1 < d2 && d2 < d3, "backoff must be strictly increasing: {d1}, {d2}, {d3}");
        assert_eq!((d1, d2, d3), (2, 5, 10));

        let state = ReconnectState {
            attempts: 2,
            next_retry_at: Instant::now(),
            last_error: Some("主机不可达".to_string()),
        };
        assert_eq!(
            format_reconnecting_message(&state),
            "主机不可达 (正在自动重连第 2/3 次...)"
        );
        assert_eq!(
            format_reconnect_exhausted_error("主机不可达"),
            "主机不可达 (已重试 3 次均失败，已停止重连)"
        );
    }

    #[test]
    fn observation_period_reports_connecting_until_reconnect_state_cleared() {
        let pm = ProcessManager::new();
        let child = Command::new("sleep")
            .arg("5")
            .spawn()
            .expect("spawn sleep");

        {
            let mut running = pm.running.lock().unwrap();
            running.insert(
                "t1".to_string(),
                ActiveProcess {
                    child,
                    started_at: Instant::now(),
                    local_probe_addrs: Vec::new(),
                    ready: true,
                },
            );
        }
        {
            let mut re_states = pm.reconnect_states.lock().unwrap();
            re_states.insert(
                "t1".to_string(),
                ReconnectState {
                    attempts: 1,
                    next_retry_at: Instant::now() + Duration::from_secs(5),
                    last_error: None,
                },
            );
        }

        let status = pm.get_runtime_status();
        let t1_status = status.get("t1").expect("t1 status present");
        assert_eq!(t1_status.state, TunnelState::Connecting);

        // Once observation period passes and reconnect_states is cleared, it reports Connected
        {
            let mut re_states = pm.reconnect_states.lock().unwrap();
            re_states.remove("t1");
        }
        let status_after = pm.get_runtime_status();
        let t1_after = status_after.get("t1").expect("t1 status present");
        assert_eq!(t1_after.state, TunnelState::Connected);
    }

    #[test]
    fn unready_local_port_reports_connecting_until_ready() {
        let pm = ProcessManager::new();
        let child = Command::new("sleep")
            .arg("5")
            .spawn()
            .expect("spawn sleep");

        {
            let mut running = pm.running.lock().unwrap();
            running.insert(
                "t_probe".to_string(),
                ActiveProcess {
                    child,
                    started_at: Instant::now(),
                    local_probe_addrs: vec![SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), 17892)],
                    ready: false,
                },
            );
        }

        // Even with no reconnect_states, an unready local port must report Connecting
        let status = pm.get_runtime_status();
        let entry = status.get("t_probe").expect("t_probe status present");
        assert_eq!(entry.state, TunnelState::Connecting);

        // Once port probe marks ready = true, it reports Connected
        {
            let mut running = pm.running.lock().unwrap();
            running.get_mut("t_probe").unwrap().ready = true;
        }
        let status_ready = pm.get_runtime_status();
        let entry_ready = status_ready.get("t_probe").expect("t_probe status present");
        assert_eq!(entry_ready.state, TunnelState::Connected);
    }

    #[test]
    fn probe_local_ports_detects_listening_and_closed_ports() {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("bind ephemeral port");
        let addr = listener.local_addr().unwrap();
        assert!(probe_local_ports(&[addr]));

        drop(listener);
        assert!(!probe_local_ports(&[addr]));
    }
}
