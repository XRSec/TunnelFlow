use crate::key_manager::list_ssh_keys;
use crate::models::{GroupDivider, SSHKeyInfo, Tunnel, TunnelRuntimeStatus};
use crate::process_manager::ProcessManager;
use crate::ssh_config::{delete_tunnel_by_name, parse_ssh_config, read_ssh_config_raw, save_tunnel as save_to_config};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{State, Manager, Emitter};

pub struct AppState {
    pub process_mgr: ProcessManager,
    pub cached_tunnels: Mutex<Vec<Tunnel>>,
    pub cached_groups: Mutex<Vec<GroupDivider>>,
    pub last_blur_time: Mutex<Option<std::time::Instant>>,
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
        let res = state.process_mgr.start_tunnel(&t);
        let _ = crate::tray::update_tray_menu(&app);
        let _ = app.emit("tunnel-status-changed", state.process_mgr.get_runtime_status());
        res
    } else {
        Err(format!("Tunnel with id {} not found", id))
    }
}

#[tauri::command]
pub fn stop_tunnel(app: tauri::AppHandle, id: String, state: State<'_, AppState>) -> Result<(), String> {
    let res = state.process_mgr.stop_tunnel(&id);
    let _ = crate::tray::update_tray_menu(&app);
    let _ = app.emit("tunnel-status-changed", state.process_mgr.get_runtime_status());
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

fn center_window(window: &tauri::WebviewWindow, target_w: f64, target_h: f64) {
    let monitor = window.current_monitor().ok().flatten().or_else(|| window.primary_monitor().ok().flatten());
    if let Some(m) = monitor {
        let scale = m.scale_factor();
        let m_size = m.size().to_logical::<f64>(scale);
        let m_pos = m.position().to_logical::<f64>(scale);
        let new_x = m_pos.x + (m_size.width - target_w) / 2.0;
        let new_y = m_pos.y + (m_size.height - target_h) / 2.0;
        let _ = window.set_position(tauri::LogicalPosition::new(new_x, new_y));
    } else {
        let _ = window.center();
    }
}

#[tauri::command]
pub async fn set_window_mode(app: tauri::AppHandle, mode: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main").or_else(|| app.get_webview_window("TunnelFlow")) {
        let _ = window.set_resizable(true);
        let _ = window.set_min_size(Some(tauri::LogicalSize::new(370.0, 460.0)));

        if mode == "mini" {
            let _ = window.set_size(tauri::LogicalSize::new(370.0, 670.0));
            center_window(&window, 370.0, 670.0);
        } else if mode == "mini_snap" {
            let current_h = window.outer_size().map(|s| s.to_logical::<f64>(window.scale_factor().unwrap_or(1.0)).height).unwrap_or(670.0);
            let _ = window.set_size(tauri::LogicalSize::new(370.0, current_h));
        } else if mode == "full_min" {
            let current_h = window.outer_size().map(|s| s.to_logical::<f64>(window.scale_factor().unwrap_or(1.0)).height).unwrap_or(720.0);
            let _ = window.set_size(tauri::LogicalSize::new(850.0, current_h));
        } else {
            let _ = window.set_size(tauri::LogicalSize::new(1050.0, 720.0));
            center_window(&window, 1050.0, 720.0);
        }
    }
    Ok(())
}

#[tauri::command]
pub fn resize_mini_window(app: tauri::AppHandle, height: f64) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main").or_else(|| app.get_webview_window("TunnelFlow")) {
        let clamped_h = height.max(460.0).min(670.0);
        let _ = window.set_size(tauri::LogicalSize::new(370.0, clamped_h));
    }
    Ok(())
}

#[tauri::command]
pub fn open_main_window(app: tauri::AppHandle) {
    if let Some(tray_win) = app.get_webview_window("tray") {
        let _ = tray_win.hide();
    }
    if let Some(main_win) = app.get_webview_window("main").or_else(|| app.get_webview_window("TunnelFlow")) {
        let _ = main_win.set_resizable(true);
        let _ = main_win.set_min_size(Some(tauri::LogicalSize::new(370.0, 460.0)));
        let _ = main_win.set_size(tauri::LogicalSize::new(370.0, 670.0));
        let _ = main_win.center();
        let _ = main_win.unminimize();
        let _ = main_win.show();
        let _ = main_win.set_focus();
    }
}

#[tauri::command]
pub fn resize_tray_window(app: tauri::AppHandle, height: f64) {
    if let Some(tray_win) = app.get_webview_window("tray") {
        let _ = tray_win.set_size(tauri::LogicalSize::new(260.0, height));
    }
}

#[tauri::command]
pub async fn check_for_updates() -> Result<crate::updater::UpdateInfo, String> {
    crate::updater::check_github_update().await
}

#[tauri::command]
pub async fn download_and_install_update(
    app: tauri::AppHandle,
    download_url: String,
) -> Result<(), String> {
    let fname = download_url.split('?').next().unwrap_or(&download_url).split("/").last().unwrap_or("update.bin").split("\\").last().unwrap_or("update.bin").to_string();
    crate::updater::download_and_install(app, download_url, fname).await
}

#[tauri::command]
pub fn is_mouse_button_down() -> bool {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn CGEventSourceButtonState(state_id: i32, button: u32) -> bool;
        }
        unsafe { CGEventSourceButtonState(0, 0) }
    }
    #[cfg(target_os = "windows")]
    {
        extern "system" {
            fn GetAsyncKeyState(v_key: i32) -> i16;
        }
        unsafe { (GetAsyncKeyState(0x01) as u16 & 0x8000) != 0 }
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        false
    }
}
