#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize)]
struct UpdateInfo {
    available: bool,
    current_version: String,
    latest_version: Option<String>,
    notes: Option<String>,
}

#[tauri::command]
async fn check_for_update(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    let current_version = app.package_info().version.to_string();
    let update = app
        .updater()
        .map_err(|e| format!("Updater configuration error: {e}"))?
        .check()
        .await
        .map_err(|e| format!("Could not check for updates: {e}"))?;

    match update {
        Some(update) => Ok(UpdateInfo {
            available: true,
            current_version,
            latest_version: Some(update.version.clone()),
            notes: update.body.clone(),
        }),
        None => Ok(UpdateInfo {
            available: false,
            current_version,
            latest_version: None,
            notes: None,
        }),
    }
}

#[tauri::command]
async fn download_and_install_update(app: tauri::AppHandle) -> Result<String, String> {
    let update = app
        .updater()
        .map_err(|e| format!("Updater configuration error: {e}"))?
        .check()
        .await
        .map_err(|e| format!("Could not check for updates: {e}"))?
        .ok_or_else(|| "No newer version is available.".to_string())?;

    let version = update.version.clone();
    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| format!("Update installation failed: {e}"))?;

    Ok(format!("Version {version} was installed."))
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_for_update,
            download_and_install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running Nabd Al-Gharb desktop app");
}
