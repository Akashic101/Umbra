# Umbra

Local solar and lunar eclipse circumstances. The product is the **native app** (Tauri). The SvelteKit static build is the UI that Tauri loads; it can still be hosted as a share-target for https links.

## Native app

Requires [Rust](https://rustup.rs/) (1.77.2+) and the platform WebView (macOS/WebKit, Windows WebView2, Linux WebKitGTK).

```sh
npm install
npm run tauri:dev
```

On macOS, GPS uses the WebView (`navigator.geolocation`). During `tauri:dev`, grant Location to the **terminal** that launched the command (not only the Umbra window). Packaged builds prompt for the app itself.

Production desktop installers:

```sh
npm run tauri:build
```

Deep links use the `umbra:` scheme, for example `umbra:/details?date=2026-08-12&lat=48.1&lon=11.6`.

iOS and Android targets share the same `src-tauri` crate. After installing Xcode / Android Studio:

```sh
npx tauri ios init
npx tauri android init
npx tauri ios dev
npx tauri android dev
```

## Website (share-target)

The static SPA is still built with `npm run build` (`adapter-static`, fallback `200.html`). It is not a PWA: there is no install manifest or service worker. Prefer the native app for day-to-day use.

```sh
npm run dev
npm run build
```
