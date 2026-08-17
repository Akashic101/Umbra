#[cfg(any(target_os = "macos", target_os = "windows"))]
use std::process::Command;

#[cfg(target_os = "macos")]
mod macos_location;

#[cfg(target_os = "macos")]
const MACOS_LOCATION_SETTINGS: &str =
	"x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_LocationServices";

#[tauri::command]
fn open_location_settings() -> Result<(), String> {
	#[cfg(target_os = "macos")]
	{
		macos_location::ensure_permission();
		let status = Command::new("open")
			.arg(MACOS_LOCATION_SETTINGS)
			.status()
			.map_err(|error| error.to_string())?;
		if status.success() {
			return Ok(());
		}
		return Err(format!("open exited with {status}"));
	}
	#[cfg(target_os = "windows")]
	{
		let status = Command::new("cmd")
			.args(["/C", "start", "", "ms-settings:privacy-location"])
			.status()
			.map_err(|error| error.to_string())?;
		if status.success() {
			return Ok(());
		}
		return Err(format!("start exited with {status}"));
	}
	#[cfg(not(any(target_os = "macos", target_os = "windows")))]
	Err("Location settings are not available on this platform".into())
}

#[derive(serde::Serialize)]
struct GeoPos {
	lat: f64,
	lon: f64,
	height: f64,
}

#[tauri::command]
async fn get_macos_location() -> Result<GeoPos, String> {
	#[cfg(target_os = "macos")]
	{
		let pos = tauri::async_runtime::spawn_blocking(macos_location::get_location)
			.await
			.map_err(|error| error.to_string())??;
		return Ok(GeoPos {
			lat: pos.lat,
			lon: pos.lon,
			height: pos.height,
		});
	}
	#[cfg(not(target_os = "macos"))]
	Err("macOS location is not available on this platform".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_opener::init())
		.plugin(tauri_plugin_http::init())
		.plugin(tauri_plugin_geolocation::init())
		.plugin(tauri_plugin_deep_link::init())
		.invoke_handler(tauri::generate_handler![
			open_location_settings,
			get_macos_location
		])
		.setup(|app| {
			if cfg!(debug_assertions) {
				app.handle().plugin(
					tauri_plugin_log::Builder::default()
						.level(log::LevelFilter::Info)
						.build(),
				)?;
			}
			#[cfg(any(windows, target_os = "linux"))]
			{
				use tauri_plugin_deep_link::DeepLinkExt;
				let _ = app.deep_link().register_all();
			}
			Ok(())
		})
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
