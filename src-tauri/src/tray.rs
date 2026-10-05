use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::{AppHandle, Manager, Emitter};
use crate::commands::AppState;
use crate::models::{TunnelRuntimeStatus, TunnelState};
use crate::ssh_config::{parse_ssh_config, read_ssh_config_raw};

pub fn update_tray_menu(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let state = app.state::<AppState>();
    let runtime_status = state.process_mgr.get_runtime_status();

    let (tunnels, groups) = {
        let mut cached_tunnels = state.cached_tunnels.lock().unwrap();
        let mut cached_groups = state.cached_groups.lock().unwrap();
        if cached_tunnels.is_empty() {
            let raw = read_ssh_config_raw();
            let (t, g) = parse_ssh_config(&raw);
            *cached_tunnels = t.clone();
            *cached_groups = g.clone();
        }
        (cached_tunnels.clone(), cached_groups.clone())
    };

    let forwarding_tunnels: Vec<_> = tunnels.into_iter().filter(|t| t.forwards.iter().any(|f| f.is_active)).collect();
    let menu = Menu::new(app)?;

    if forwarding_tunnels.is_empty() {
        let empty_item = MenuItem::with_id(app, "empty", "暂无已配置转发的隧道", false, None::<&str>)?;
        menu.append(&empty_item)?;
    } else {
        let mut rendered_ids = std::collections::HashSet::new();
        
        let mut all_group_titles = Vec::new();
        let mut seen_titles = std::collections::HashSet::new();
        
        for g in &groups {
            let title = g.title.trim().to_string();
            if !title.is_empty() && seen_titles.insert(title.clone()) {
                all_group_titles.push(title);
            }
        }
        
        let mut tunnels_by_group = std::collections::HashMap::new();
        let mut ungrouped_tunnels = Vec::new();
        
        for t in &forwarding_tunnels {
            if let Some(ref grp) = t.group {
                let title = grp.trim().to_string();
                if !title.is_empty() {
                    if seen_titles.insert(title.clone()) {
                        all_group_titles.push(title.clone());
                    }
                    tunnels_by_group.entry(title).or_insert_with(Vec::new).push(t);
                } else {
                    ungrouped_tunnels.push(t);
                }
            } else {
                ungrouped_tunnels.push(t);
            }
        }

        for title in all_group_titles {
            if let Some(group_tunnels) = tunnels_by_group.get(&title) {
                if !group_tunnels.is_empty() {
                    let header = MenuItem::with_id(app, &format!("group_header:{}", title), &title, false, None::<&str>)?;
                    menu.append(&header)?;

                    for tunnel in group_tunnels {
                        let default_status = TunnelRuntimeStatus { id: tunnel.id.clone(), state: TunnelState::Disconnected, pid: None, uptime_seconds: None, error_message: None };
                        let status = runtime_status.get(&tunnel.id).unwrap_or(&default_status);
                        let (symbol, is_connected) = match status.state {
                            TunnelState::Connected => ("●", true),
                            TunnelState::Connecting => ("◐", false),
                            TunnelState::Error => ("✕", false),
                            TunnelState::Disconnected => ("○", false),
                        };

                        let ports = tunnel.forwards.iter().filter(|f| f.is_active).map(|f| format!(":{}", f.port)).collect::<Vec<_>>().join(", ");
                        let title_str = format!("{} {} ({})", symbol, tunnel.name, ports);

                        let item = CheckMenuItem::with_id(app, &format!("tunnel_toggle:{}", tunnel.id), &title_str, true, is_connected, None::<&str>)?;
                        menu.append(&item)?;
                        rendered_ids.insert(tunnel.id.clone());
                    }
                    menu.append(&PredefinedMenuItem::separator(app)?)?;
                }
            }
        }

        if !ungrouped_tunnels.is_empty() {
            for tunnel in ungrouped_tunnels {
                if rendered_ids.contains(&tunnel.id) { continue; }
                let default_status = TunnelRuntimeStatus { id: tunnel.id.clone(), state: TunnelState::Disconnected, pid: None, uptime_seconds: None, error_message: None };
                let status = runtime_status.get(&tunnel.id).unwrap_or(&default_status);
                let (symbol, is_connected) = match status.state {
                    TunnelState::Connected => ("●", true),
                    TunnelState::Connecting => ("◐", false),
                    TunnelState::Error => ("✕", false),
                    TunnelState::Disconnected => ("○", false),
                };

                let ports = tunnel.forwards.iter().filter(|f| f.is_active).map(|f| format!(":{}", f.port)).collect::<Vec<_>>().join(", ");
                let title_str = format!("{} {} ({})", symbol, tunnel.name, ports);

                let item = CheckMenuItem::with_id(app, &format!("tunnel_toggle:{}", tunnel.id), &title_str, true, is_connected, None::<&str>)?;
                menu.append(&item)?;
            }
        }
    }

    menu.append(&PredefinedMenuItem::separator(app)?)?;
    let show_i = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "退出 TunnelFlow", true, None::<&str>)?;
    menu.append(&show_i)?;

    menu.append(&quit_i)?;

    if let Some(tray) = app.tray_by_id("main-tray") {
        // let _ = tray.set_menu(Some(menu)); // Disabled for native popover
    }
    Ok(())
}

pub fn handle_tray_menu_event(app: &AppHandle, event_id: &str) {
    if event_id == "show" {
        crate::commands::open_main_window(app.clone());
    } else if event_id == "quit" {
        std::process::exit(0);
    } else if event_id.starts_with("tunnel_toggle:") {
        let tunnel_id = event_id.strip_prefix("tunnel_toggle:").unwrap_or(event_id);
        let state = app.state::<AppState>();
        let status = state.process_mgr.get_runtime_status().get(tunnel_id).cloned().unwrap_or(TunnelRuntimeStatus { id: tunnel_id.to_string(), state: TunnelState::Disconnected, pid: None, uptime_seconds: None, error_message: None });

        if status.state == TunnelState::Connected || status.state == TunnelState::Connecting {
            let _ = state.process_mgr.stop_tunnel(tunnel_id);
        } else {
            let tunnel = {
                let cached_tunnels = state.cached_tunnels.lock().unwrap();
                cached_tunnels.iter().find(|t| t.id == tunnel_id).cloned()
            };
            if let Some(t) = tunnel {
                let _ = state.process_mgr.start_tunnel(&t);
            }
        }

        let _ = update_tray_menu(app);
        let runtime_status = state.process_mgr.get_runtime_status();
        let _ = app.emit("tunnel-status-changed", runtime_status);
    }
}
