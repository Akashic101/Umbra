use std::sync::mpsc::{self, Sender};
use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;

#[derive(Serialize)]
pub struct GeoPos {
	pub lat: f64,
	pub lon: f64,
	pub height: f64,
}

struct LocationFix {
	code: i32,
	lat: f64,
	lon: f64,
	alt: f64,
}

type Callback = extern "C" fn(i32, f64, f64, f64);

extern "C" {
	fn umbra_request_location(callback: Callback);
	fn umbra_ensure_location_permission();
	fn umbra_location_status() -> i32;
}

static SENDER: Mutex<Option<Sender<LocationFix>>> = Mutex::new(None);

extern "C" fn on_location(code: i32, lat: f64, lon: f64, alt: f64) {
	if let Ok(mut slot) = SENDER.lock() {
		if let Some(tx) = slot.take() {
			let _ = tx.send(LocationFix {
				code,
				lat,
				lon,
				alt,
			});
		}
	}
}

pub fn ensure_permission() {
	unsafe {
		umbra_ensure_location_permission();
	}
}

pub fn location_status() -> &'static str {
	let status = unsafe { umbra_location_status() };
	match status {
		0 => "prompt",
		3 | 4 => "granted",
		_ => "denied",
	}
}

pub fn get_location() -> Result<GeoPos, String> {
	let (tx, rx) = mpsc::channel();
	{
		let mut slot = SENDER.lock().map_err(|error| error.to_string())?;
		*slot = Some(tx);
	}
	unsafe {
		umbra_request_location(on_location);
	}
	match rx.recv_timeout(Duration::from_secs(20)) {
		Ok(fix) if fix.code == 0 => Ok(GeoPos {
			lat: fix.lat,
			lon: fix.lon,
			height: if fix.alt.is_finite() { fix.alt } else { 0.0 },
		}),
		Ok(fix) if fix.code == 1 => Err("permission-denied".into()),
		Ok(_) => Err("unavailable".into()),
		Err(_) => Err("timeout".into()),
	}
}
