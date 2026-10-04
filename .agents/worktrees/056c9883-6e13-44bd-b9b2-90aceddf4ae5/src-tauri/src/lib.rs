pub mod commands;
pub mod key_manager;
pub mod models;
pub mod process_manager;
pub mod ssh_config;
pub mod tray;
pub mod updater;

use tauri::{tray::{MouseButtonState, TrayIconBuilder, TrayIconEvent}, Manager, WindowEvent};
use commands::{check_for_updates, download_and_install_update, play_system_sound, set_window_mode,
            open_main_window,
            resize_tray_window, resize_mini_window, 
    delete_tunnel, get_groups, get_known_hosts, get_runtime_status, get_tunnels, list_keys, reorder_tunnels,
    save_tunnel, start_tunnel, stop_tunnel, AppState,
};
use process_manager::ProcessManager;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let raw = crate::ssh_config::read_ssh_config_raw();
    let (tunnels, groups) = crate::ssh_config::parse_ssh_config(&raw);
    let app_state = AppState {
        process_mgr: ProcessManager::new(),
        cached_tunnels: Mutex::new(tunnels),
        cached_groups: Mutex::new(groups),
        last_blur_time: Mutex::new(None),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, Some(vec!["--autostart"])))
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_tunnels,
            save_tunnel,
            delete_tunnel,
            start_tunnel,
            stop_tunnel,
            get_runtime_status,
            get_groups,
            list_keys, reorder_tunnels,
            get_known_hosts,
            play_system_sound,
            set_window_mode,
            open_main_window,
            resize_tray_window, resize_mini_window,
            check_for_updates,
            download_and_install_update
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::menu::{Menu, Submenu, MenuItem, PredefinedMenuItem, IsMenuItem};
                use tauri::Emitter;
                
                let about_item = MenuItem::with_id(app, "about", "关于 TunnelFlow", true, None::<&str>).unwrap();
                let sep1 = PredefinedMenuItem::separator(app).unwrap();
                let services = PredefinedMenuItem::services(app, None).unwrap();
                let sep2 = PredefinedMenuItem::separator(app).unwrap();
                let hide = PredefinedMenuItem::hide(app, None).unwrap();
                let hide_others = PredefinedMenuItem::hide_others(app, None).unwrap();
                let show_all = PredefinedMenuItem::show_all(app, None).unwrap();
                let sep3 = PredefinedMenuItem::separator(app).unwrap();
                let quit = PredefinedMenuItem::quit(app, None).unwrap();

                let items: &[&dyn IsMenuItem<_>] = &[
                    &about_item,
                    &sep1,
                    &services,
                    &sep2,
                    &hide,
                    &hide_others,
                    &show_all,
                    &sep3,
                    &quit,
                ];

                if let Ok(app_menu) = Submenu::with_id_and_items(
                    app,
                    "app_menu",
                    "TunnelFlow",
                    true,
                    items,
                ) {
                    if let Ok(menu) = Menu::with_items(app, &[&app_menu]) {
                        let _ = app.set_menu(menu);
                    }
                }
                
                app.on_menu_event(move |app, event| {
                    if event.id() == "about" {
                        let _ = app.emit("open-about", ());
                        crate::commands::open_main_window(app.clone());
                    }
                });
            }

            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| crate::tray::handle_tray_menu_event(app, event.id.as_ref()))
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button_state: MouseButtonState::Up, rect, .. } = event {
                        let state = tray.app_handle().state::<AppState>();
                        let just_lost_focus = state.last_blur_time.lock().unwrap().map(|t| t.elapsed().as_millis() < 250).unwrap_or(false);
                        
                        if just_lost_focus {
                            return;
                        }

                        if let Some(tray_win) = tray.app_handle().get_webview_window("tray") {
                            if tray_win.is_visible().unwrap_or(false) {
                                let _ = tray_win.hide();
                            } else {
                                let monitor = tray_win.current_monitor().unwrap_or_default().or_else(|| tray_win.primary_monitor().unwrap_or_default());
                                let scale_factor = monitor.as_ref().map(|m| m.scale_factor()).unwrap_or(1.0);
                                
                                let icon_pos = rect.position.to_logical::<f64>(scale_factor);
                                let icon_size = rect.size.to_logical::<f64>(scale_factor);
                                let win_size = tray_win.outer_size().unwrap_or_default().to_logical::<f64>(scale_factor);
                                
                                let mut x = icon_pos.x + (icon_size.width / 2.0) - (win_size.width / 2.0);
                                let mut y = icon_pos.y + icon_size.height + 4.0;
                                
                                if let Some(m) = monitor {
                                    let m_size = m.size().to_logical::<f64>(scale_factor);
                                    x = x.clamp(8.0, m_size.width - win_size.width - 8.0);
                                    y = y.clamp(0.0, m_size.height - win_size.height - 8.0);
                                }
                                
                                let _ = tray_win.set_position(tauri::LogicalPosition::new(x, y));
                                let _ = tray_win.show();
                                let _ = tray_win.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;
            crate::tray::update_tray_menu(app.handle()).unwrap_or_default();
            
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_millis(600)).await;
                let state = app_handle.state::<crate::commands::AppState>();
                let tunnels = {
                    let guard = state.cached_tunnels.lock().unwrap();
                    guard.clone()
                };
                for tunnel in tunnels {
                    if tunnel.auto_connect && !tunnel.is_general_config {
                        let _ = state.process_mgr.start_tunnel(&tunnel);
                    }
                }
                let _ = crate::tray::update_tray_menu(&app_handle);
            });

            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            WindowEvent::Focused(false) => {
                if window.label() == "tray" {
                    let state = window.app_handle().state::<AppState>();
                    *state.last_blur_time.lock().unwrap() = Some(std::time::Instant::now());
                    let _ = window.hide();
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
