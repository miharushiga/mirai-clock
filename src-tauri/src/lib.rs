use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, RunEvent, WindowEvent,
};
use tauri_plugin_store::StoreExt;

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let stored_on_top = app
        .store("settings.json")
        .ok()
        .and_then(|store| store.get("alwaysOnTop"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    if stored_on_top {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.set_always_on_top(true);
        }
    }

    let always_on_top = CheckMenuItem::with_id(
        app,
        "always_on_top",
        "常に最前面に表示",
        true,
        stored_on_top,
        None::<&str>,
    )?;
    let toggle_visible =
        MenuItem::with_id(app, "toggle_visible", "表示/非表示", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "終了", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&always_on_top, &toggle_visible, &separator, &quit])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().expect("app icon not found").clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window_visibility(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "always_on_top" => {
                if let Some(window) = app.get_webview_window("main") {
                    let current = window.is_always_on_top().unwrap_or(false);
                    let _ = window.set_always_on_top(!current);
                    let _ = window.emit("always-on-top-changed", !current);
                }
            }
            "toggle_visible" => {
                toggle_window_visibility(app);
            }
            "quit" => {
                save_store(app);
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn toggle_window_visibility(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn save_store(app: &tauri::AppHandle) {
    if let Ok(store) = app.store("settings.json") {
        let _ = store.save();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let RunEvent::ExitRequested { .. } = &event {
            save_store(app_handle);
        }
    });
}
