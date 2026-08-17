fn main() {
	#[cfg(target_os = "macos")]
	{
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
