use crate::key_manager::list_ssh_keys;
use crate::models::{GroupDivider, SSHKeyInfo, Tunnel, TunnelRuntimeStatus};
use crate::process_manager::ProcessManager;
use crate::ssh_config::{delete_tunnel_by_name, parse_ssh_config, read_ssh_config_raw, save_tunnel as save_to_config};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{State, Manager};

pub struct AppState {
    pub process_mgr: ProcessManager,
    pub cached_tunnels: Mutex<Vec<Tunnel>>,
    pub cached_groups: Mutex<Vec<GroupDivider>>,
}

#[tauri::command]
pub fn get_tunnels(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<Vec<Tunnel>, String> {
    let raw = read_ssh_config_raw();
    let (tunnels, groups) = parse_ssh_config(&raw);

    if let Ok(mut c_tunnels) = state.cached_tunnels.lock() {
        *c_tunnels = tunnels.clone();
    }
    if let Ok(mut c_groups) = state.cached_groups.lock() {
        *c_groups = groups;
    }

    let _ = crate::tray::update_tray_menu(&app);
    Ok(tunnels)
}

#[tauri::command]
pub fn save_tunnel(app: tauri::AppHandle, tunnel: Tunnel, state: State<'_, AppState>) -> Result<(), String> {
    save_to_config(&tunnel)?;

    if let Ok(mut c_tunnels) = state.cached_tunnels.lock() {
        if let Some(pos) = c_tunnels.iter().position(|t| t.id == tunnel.id) {
            c_tunnels[pos] = tunnel;
        } else {
            c_tunnels.push(tunnel);
        }
    }
    let _ = crate::tray::update_tray_menu(&app);
    Ok(())
}

#[tauri::command]
pub fn delete_tunnel(app: tauri::AppHandle, id: String, name: Option<String>, state: State<'_, AppState>) -> Result<(), String> {
    let _ = state.process_mgr.stop_tunnel(&id);

    let target_name = {
        let c_tunnels = state.cached_tunnels.lock().map_err(|e| e.to_string())?;
        name.or_else(|| {
            c_tunnels.iter().find(|t| t.id == id).map(|t| t.name.clone())
        })
    };

    if let Some(n) = target_name {
        delete_tunnel_by_name(&n)?;
        if let Ok(mut c_tunnels) = state.cached_tunnels.lock() {
            c_tunnels.retain(|t| t.id != id && !t.name.eq_ignore_ascii_case(&n));
        }
    }

    let _ = crate::tray::update_tray_menu(&app);
    Ok(())
}

#[tauri::command]
pub fn start_tunnel(app: tauri::AppHandle, id: String, state: State<'_, AppState>) -> Result<(), String> {
    let tunnel = {
        let c_tunnels = state.cached_tunnels.lock().map_err(|e| e.to_string())?;
        c_tunnels.iter().find(|t| t.id == id).cloned()
    };

    if let Some(t) = tunnel {
        {
        let res = state.process_mgr.start_tunnel(&t);
        let _ = crate::tray::update_tray_menu(&app);
        res
    }
    } else {
        Err(format!("Tunnel with id {} not found", id))
    }
}

#[tauri::command]
pub fn stop_tunnel(app: tauri::AppHandle, id: String, state: State<'_, AppState>) -> Result<(), String> {
    let res = state.process_mgr.stop_tunnel(&id);
    let _ = crate::tray::update_tray_menu(&app);
    res
}

#[tauri::command]
pub fn get_runtime_status(state: State<'_, AppState>) -> Result<HashMap<String, TunnelRuntimeStatus>, String> {
    Ok(state.process_mgr.get_runtime_status())
}

#[tauri::command]
pub fn get_groups(state: State<'_, AppState>) -> Result<Vec<GroupDivider>, String> {
    let groups = state.cached_groups.lock().map_err(|e| e.to_string())?.clone();
    Ok(groups)
}

#[tauri::command]
pub fn reorder_tunnels(app: tauri::AppHandle, ordered_ids: Vec<String>) -> Result<(), String> {
    let res = crate::ssh_config::reorder_tunnels(ordered_ids);
    let _ = crate::tray::update_tray_menu(&app);
    res
}

#[tauri::command]
pub fn list_keys() -> Result<Vec<SSHKeyInfo>, String> {
    Ok(list_ssh_keys())
}

#[tauri::command]
pub fn get_known_hosts() -> Result<Vec<String>, String> {
    let mut hosts = Vec::new();
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let known_hosts_path = home.join(".ssh").join("known_hosts");
    if known_hosts_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&known_hosts_path) {
            let mut set = std::collections::HashSet::new();
            for line in content.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') {
                    continue;
                }
                if let Some(first) = line.split_whitespace().next() {
                    if first.starts_with("|1|") {
                        // Hashed hostname, skip
                        continue;
                    }
                    for part in first.split(',') {
                        let clean = part
                            .trim_matches(|c| c == '[' || c == ']')
                            .split(':')
                            .next()
                            .unwrap_or("")
                            .trim();
                        if !clean.is_empty() && !clean.contains('*') && !clean.contains('?') {
                            set.insert(clean.to_string());
                        }
                    }
                }
            }
            hosts = set.into_iter().collect();
            hosts.sort();
        }
    }
    Ok(hosts)
}

#[tauri::command]
pub fn play_system_sound(name: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let sound_name = match name.as_str() {
            "Pop" | "connected" => "Pop",
            "Basso" | "disconnected" => "Basso",
            "Sosumi" | "conflict" => "Sosumi",
            _ => "Pop",
        };
        let _ = std::process::Command::new("afplay")
            .arg(format!("/System/Library/Sounds/{}.aiff", sound_name))
            .spawn();
    }
    Ok(())
}

#[tauri::command]
pub async fn set_window_mode(app: tauri::AppHandle, mode: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        if mode == "mini" {
            let _ = window.set_resizable(false);
            let _ = window.set_min_size(Some(tauri::LogicalSize::new(370.0, 670.0)));
            let _ = window.set_size(tauri::LogicalSize::new(370.0, 670.0));
        } else {
            let _ = window.set_resizable(true);
            let _ = window.set_min_size(Some(tauri::LogicalSize::new(850.0, 550.0)));
            let _ = window.set_size(tauri::LogicalSize::new(1050.0, 720.0));
        }
    }
    Ok(())
}
