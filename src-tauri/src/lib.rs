use log::{error, info, warn};
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, RunEvent, WindowEvent,
};
use tauri_plugin_store::StoreExt;

/// ユーザーが選んだファイルだけを asset プロトコルの許可対象に加える。
/// フォルダ単位の権限を渡さないため、閲覧できるのは常に選択済みファイルのみ。
#[tauri::command]
fn allow_media_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.asset_protocol_scope()
        .allow_file(&path)
        .map_err(|e| {
            error!("Failed to allow media file {}: {}", path, e);
            e.to_string()
        })
}

/// ウィンドウを確実に目に見える状態へ戻す。
/// フルスクリーン（別 Space に隔離される）・非表示・最小化のいずれからも復帰させる。
fn show_main_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        warn!("main window not found");
        return;
    };

    if window.is_fullscreen().unwrap_or(false) {
        warn!("Window was fullscreen; exiting fullscreen");
        if let Err(e) = window.set_fullscreen(false) {
            error!("Failed to exit fullscreen: {}", e);
        }
    }
    if let Err(e) = window.unminimize() {
        warn!("Failed to unminimize window: {}", e);
    }
    if let Err(e) = window.show() {
        warn!("Failed to show window: {}", e);
    }
    if let Err(e) = window.set_focus() {
        warn!("Failed to set focus: {}", e);
    }
}

fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let stored_on_top = app
        .store("settings.json")
        .ok()
        .and_then(|store| store.get("alwaysOnTop"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    info!("Loaded alwaysOnTop setting: {}", stored_on_top);

    if stored_on_top {
        if let Some(window) = app.get_webview_window("main") {
            if let Err(e) = window.set_always_on_top(true) {
                warn!("Failed to set always on top: {}", e);
            }
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
                    let new_state = !current;
                    if let Err(e) = window.set_always_on_top(new_state) {
                        error!("Failed to set always on top: {}", e);
                    }
                    if let Err(e) = window.emit("always-on-top-changed", new_state) {
                        error!("Failed to emit always-on-top-changed: {}", e);
                    }
                    info!("Always on top toggled: {}", new_state);
                }
            }
            "toggle_visible" => {
                toggle_window_visibility(app);
            }
            "quit" => {
                info!("Application quit requested");
                save_store(app);
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    info!("Tray icon initialized");
    Ok(())
}

fn toggle_window_visibility(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            if let Err(e) = window.hide() {
                warn!("Failed to hide window: {}", e);
            }
        } else {
            show_main_window(app);
        }
    }
}

fn save_store(app: &tauri::AppHandle) {
    match app.store("settings.json") {
        Ok(store) => {
            if let Err(e) = store.save() {
                error!("Failed to save store: {}", e);
            }
        }
        Err(e) => {
            warn!("Failed to open store: {}", e);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let log_level = if cfg!(debug_assertions) {
        log::LevelFilter::Debug
    } else {
        log::LevelFilter::Warn
    };

    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    // 二重起動しようとしたら、新規プロセスを立てずに既存ウィンドウを復帰させる。
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            info!("Second instance launched; restoring window");
            show_main_window(app);
        }));
    }

    let app = builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log_level)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![allow_media_file])
        .setup(|app| {
            setup_tray(app)?;
            // 前回終了時にフルスクリーンだった場合、macOS が状態を復元して
            // 別 Space に隔離され「起動しているのに見えない」状態になるため、起動時に必ず解除する。
            if let Some(window) = app.get_webview_window("main") {
                if window.is_fullscreen().unwrap_or(false) {
                    warn!("Restored in fullscreen; forcing windowed mode");
                    if let Err(e) = window.set_fullscreen(false) {
                        error!("Failed to exit fullscreen on startup: {}", e);
                    }
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if let Err(e) = window.hide() {
                    warn!("Failed to hide window on close: {}", e);
                }
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| match &event {
        RunEvent::ExitRequested { .. } => save_store(app_handle),
        // macOS では Dock / Finder から再度開いても新しいプロセスは起動せず、
        // 実行中のアプリに Reopen が届くだけ。ここで拾わないと非表示のまま戻せなくなる。
        #[cfg(target_os = "macos")]
        RunEvent::Reopen { .. } => show_main_window(app_handle),
        _ => {}
    });
}
