pub mod commands;
pub mod key_manager;
pub mod models;
pub mod process_manager;
pub mod ssh_config;
pub mod tray;
pub mod updater;

use tauri::{tray::{MouseButtonState, TrayIconBuilder, TrayIconEvent}, Manager, WindowEvent};
use commands::{is_mouse_button_down, check_for_updates, download_and_install_update, play_system_sound, set_window_mode,
            open_main_window, exit_app,
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
            exit_app,
            is_mouse_button_down,
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
                let lang_system = MenuItem::with_id(app, "lang_system", "跟随系统 (System)", true, None::<&str>).unwrap();
                let lang_zh_cn = MenuItem::with_id(app, "lang_zh_cn", "简体中文", true, None::<&str>).unwrap();
                let lang_en = MenuItem::with_id(app, "lang_en", "English", true, None::<&str>).unwrap();
                let lang_submenu = Submenu::with_id_and_items(
                    app,
                    "lang_submenu",
                    "语言 (Language)",
                    true,
                    &[&lang_system, &lang_zh_cn, &lang_en],
                ).unwrap();
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
                    &lang_submenu,
                    &sep1,
                    &services,
                    &sep2,
                    &hide,
                    &hide_others,
                    &show_all,
                    &sep3,
                    &quit,
                ];

                let undo = PredefinedMenuItem::undo(app, None).unwrap();
                let redo = PredefinedMenuItem::redo(app, None).unwrap();
                let edit_sep1 = PredefinedMenuItem::separator(app).unwrap();
                let cut = PredefinedMenuItem::cut(app, None).unwrap();
                let copy = PredefinedMenuItem::copy(app, None).unwrap();
                let paste = PredefinedMenuItem::paste(app, None).unwrap();
                let edit_sep2 = PredefinedMenuItem::separator(app).unwrap();
                let select_all = PredefinedMenuItem::select_all(app, None).unwrap();

                let edit_menu = Submenu::with_id_and_items(
                    app,
                    "edit_menu",
                    "Edit",
                    true,
                    &[
                        &undo,
                        &redo,
                        &edit_sep1,
                        &cut,
                        &copy,
                        &paste,
                        &edit_sep2,
                        &select_all,
                    ],
                ).unwrap();

                if let Ok(app_menu) = Submenu::with_id_and_items(
                    app,
                    "app_menu",
                    "TunnelFlow",
                    true,
                    items,
                ) {
                    if let Ok(menu) = Menu::with_items(app, &[&app_menu, &edit_menu]) {
                        let _ = app.set_menu(menu);
                    }
                }
                
                app.on_menu_event(move |app, event| {
                    match event.id().as_ref() {
                        "about" => {
                            crate::commands::open_main_window(app.clone());
                            let _ = app.emit("open-about", ());
                        }
                        "lang_system" => {
                            let _ = app.emit("change-language", "system");
                        }
                        "lang_zh_cn" => {
                            let _ = app.emit("change-language", "zh-CN");
                        }
                        "lang_en" => {
                            let _ = app.emit("change-language", "en");
                        }
                        _ => {}
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
                                let monitors = tray_win.available_monitors().unwrap_or_default();
                                let (icon_px, icon_py) = match rect.position {
                                    tauri::Position::Physical(p) => (p.x, p.y),
                                    tauri::Position::Logical(l) => (l.x as i32, l.y as i32),
                                };
                                let (icon_pw, icon_ph) = match rect.size {
                                    tauri::Size::Physical(s) => (s.width as i32, s.height as i32),
                                    tauri::Size::Logical(l) => (l.width as i32, l.height as i32),
                                };
                                let icon_center_x = icon_px + icon_pw / 2;
                                let icon_center_y = icon_py + icon_ph / 2;

                                let target_monitor = monitors
                                    .iter()
                                    .find(|m| {
                                        let m_pos = m.position();
                                        let m_size = m.size();
                                        icon_center_x >= m_pos.x
                                            && icon_center_x < m_pos.x + m_size.width as i32
                                            && icon_center_y >= m_pos.y
                                            && icon_center_y < m_pos.y + m_size.height as i32
                                    })
                                    .or_else(|| {
                                        monitors.iter().find(|m| {
                                            let m_pos = m.position();
                                            let m_size = m.size();
                                            let rect_x2 = icon_px + icon_pw;
                                            let rect_y2 = icon_py + icon_ph;
                                            let m_x2 = m_pos.x + m_size.width as i32;
                                            let m_y2 = m_pos.y + m_size.height as i32;

                                            icon_px < m_x2
                                                && rect_x2 > m_pos.x
                                                && icon_py < m_y2
                                                && rect_y2 > m_pos.y
                                        })
                                    })
                                    .or_else(|| {
                                        monitors.iter().min_by_key(|m| {
                                            let m_pos = m.position();
                                            let m_size = m.size();
                                            let dx = if icon_center_x < m_pos.x {
                                                m_pos.x - icon_center_x
                                            } else if icon_center_x > m_pos.x + m_size.width as i32 {
                                                icon_center_x - (m_pos.x + m_size.width as i32)
                                            } else {
                                                0
                                            };
                                            let dy = if icon_center_y < m_pos.y {
                                                m_pos.y - icon_center_y
                                            } else if icon_center_y > m_pos.y + m_size.height as i32 {
                                                icon_center_y - (m_pos.y + m_size.height as i32)
                                            } else {
                                                0
                                            };
                                            dx as i64 * dx as i64 + dy as i64 * dy as i64
                                        })
                                    })
                                    .cloned()
                                    .or_else(|| tray_win.current_monitor().ok().flatten())
                                    .or_else(|| tray_win.primary_monitor().ok().flatten());

                                let scale_factor = target_monitor.as_ref().map(|m| m.scale_factor()).unwrap_or(1.0);

                                let icon_pos = rect.position.to_logical::<f64>(scale_factor);
                                let icon_size = rect.size.to_logical::<f64>(scale_factor);

                                let win_scale = tray_win.scale_factor().unwrap_or(scale_factor);
                                let outer_size_logical = tray_win.outer_size().unwrap_or_default().to_logical::<f64>(win_scale);
                                let win_width = if outer_size_logical.width >= 100.0 && outer_size_logical.width <= 500.0 {
                                    outer_size_logical.width
                                } else {
                                    260.0
                                };
                                let win_height = if outer_size_logical.height >= 100.0 && outer_size_logical.height <= 800.0 {
                                    outer_size_logical.height
                                } else {
                                    260.0
                                };

                                let mut x = icon_pos.x + (icon_size.width / 2.0) - (win_width / 2.0);
                                let mut y = icon_pos.y + icon_size.height + 4.0;

                                if let Some(ref m) = target_monitor {
                                    let m_scale = m.scale_factor();
                                    let m_pos = m.position().to_logical::<f64>(m_scale);
                                    let m_size = m.size().to_logical::<f64>(m_scale);

                                    if y + win_height > m_pos.y + m_size.height {
                                        let candidate_y = icon_pos.y - win_height - 4.0;
                                        if candidate_y >= m_pos.y {
                                            y = candidate_y;
                                        }
                                    }

                                    let min_x = m_pos.x + 8.0;
                                    let max_x = (m_pos.x + m_size.width - win_width - 8.0).max(min_x);
                                    x = x.clamp(min_x, max_x);

                                    let min_y = m_pos.y;
                                    let max_y = (m_pos.y + m_size.height - win_height - 8.0).max(min_y);
                                    y = y.clamp(min_y, max_y);
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
                #[cfg(target_os = "macos")]
                {
                    if window.label() == "main" || window.label() == "TunnelFlow" {
                        let _ = window.app_handle().set_activation_policy(tauri::ActivationPolicy::Accessory);
                    }
                }
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
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match event {
            #[cfg(target_os = "macos")]
            tauri::RunEvent::Reopen { .. } => {
                crate::commands::open_main_window(app_handle.clone());
            }
            _ => {}
        });
}
