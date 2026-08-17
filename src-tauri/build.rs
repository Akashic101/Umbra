fn main() {
	// Build scripts run on the host, so `cfg(target_os = "macos")` is true
	// even when compiling the crate for Android. Gate on the crate target.
	let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
	if target_os == "macos" {
		println!("cargo:rerun-if-changed=src/macos/location.m");
		println!("cargo:rerun-if-changed=src/macos/location.h");
		cc::Build::new()
			.file("src/macos/location.m")
			.flag("-fobjc-arc")
			.compile("umbra_location");
		println!("cargo:rustc-link-lib=framework=CoreLocation");
		println!("cargo:rustc-link-lib=framework=Foundation");
	}
	tauri_build::build();
}
