pub mod commands;
pub mod key_manager;
pub mod models;
pub mod process_manager;
pub mod ssh_config;
pub mod tray;

use tauri::{tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent}, Manager, Emitter, WindowEvent};
use commands::{play_system_sound, set_window_mode, 
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
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
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
            set_window_mode
        ])
        .setup(|app| {
            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| crate::tray::handle_tray_menu_event(app, event.id.as_ref()))
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.emit("window-reset-mini", ());
                            let _ = window.set_resizable(false);
                            let _ = window.set_min_size(Some(tauri::LogicalSize::new(370.0, 670.0)));
                            let _ = window.set_size(tauri::LogicalSize::new(370.0, 670.0));
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            crate::tray::update_tray_menu(app.handle()).unwrap_or_default();
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
