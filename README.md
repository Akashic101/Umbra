# Umbra

Local solar and lunar eclipse circumstances, computed on-device and offline-capable. The product is a **native app** built with Tauri 2

## Features

### Solar eclipses

- Browse every solar eclipse from 1900–2100 (Besselian elements catalog)
- Interactive map with eclipse path overlay (central line, umbral limits)
- Detailed observer circumstances: contacts (C1–C4), obscuration, sun altitude/azimuth, local eclipse type
- Coverage disk animation with time scrubber
- Real-time "Now" mode during an eclipse (live countdown/progress)
- Sun altitude, azimuth, and obscuration charts over time
- Path preview map with central line
- Compare up to 2 extra locations against your primary observer (persisted across sessions)
- "Greatest eclipse on land" auto-snap to nearest landfall point
- Cloud cover forecast card (total/low/mid/high layers)
- Filtering by type, year range, coverage, altitude



### Lunar eclipses

- Catalog of 459 lunar eclipses 1900–2100 (Espenak & Meeus data)
- Moon altitude chart, umbral magnitude over time
- Lunar coverage scrubber and umbra-on-disk visualization
- Compare locations (persisted)
- Zenith point lookup
- Filtering by type, duration, magnitude



### General

- Favorites: bookmark any eclipse + location combination
- Deep links (`umbra:/details?date=...&lat=...&lon=...`)
- Internationalization: English and German (Paraglide)
- GPS geolocation (Tauri plugin on native, browser API on web)
- Elevation lookup via Open-Meteo DEM
- Geocoding search (Nominatim / OpenStreetMap)
- Dictionary/glossary of eclipse terminology
- Settings page (theme, location permissions)
- Responsive design: mobile cards + desktop tables
- Eclipse computations run in a Web Worker (non-blocking UI)



## Data sources


| Data                  | Source                                                                   | Notes                                                            |
| --------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Solar eclipse catalog | `@astronomy-bundle/solar-eclipse`                                        | Besselian elements, local computation via `astronomy-engine`     |
| Lunar eclipse catalog | Espenak & Meeus "Five Millennium Catalog"                                | Imported at build-time into `src/lib/eclipse/lunar-catalog.json` |
| Elevation             | [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api) | Copernicus GLO-90 DEM (~90 m resolution), no API key required    |
| Cloud cover forecast  | [Open-Meteo Weather API](https://open-meteo.com/en/docs)                 | Hourly forecast (~16 days) + ERA5 archive (from 1940)            |
| Geocoding             | [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap)        | Forward + reverse, throttled to 1 req/1.1 s                      |
| Map tiles             | OpenStreetMap                                                            | Standard raster tiles via Leaflet                                |


All external API calls are free and require no API keys.

## Tech stack


| Layer        | Technology                                      |
| ------------ | ----------------------------------------------- |
| UI framework | Svelte 5 + SvelteKit                            |
| Native shell | Tauri 2 (Rust)                                  |
| Bundler      | Vite 8                                          |
| Styling      | Tailwind CSS 4 + Flowbite Svelte                |
| Maps         | Leaflet                                         |
| Language     | TypeScript                                      |
| i18n         | Paraglide JS (EN, DE)                           |
| Linting      | Biome                                           |
| Testing      | Vitest                                          |
| Adapter      | `@sveltejs/adapter-static` (SPA, `ssr = false`) |




## Prerequisites

- **Node.js** (v20+)
- **Rust** (1.77.2+ via [rustup](https://rustup.rs/))
- Platform WebView SDK:
  - macOS: WebKit (included with macOS)
  - Windows: WebView2 (usually pre-installed on Windows 10/11)
  - Linux: WebKitGTK (`libwebkit2gtk-4.1-dev`)
- For mobile: Xcode (iOS 14.0+) or Android Studio (SDK 24+)



## Running locally

```sh
npm install
```



### Web dev server

```sh
npm run dev
```

Opens a Vite dev server at `http://localhost:5173`. Hot module replacement is active.

### Native app (Tauri)

```sh
npm run tauri:dev
```

This launches the Tauri desktop app with a dev server backend. On macOS, grant Location permission to the **terminal** process that launched the command.

### Mobile

After installing Xcode or Android Studio:

```sh
npx tauri ios init
npx tauri ios dev

npx tauri android init
npx tauri android dev
```



## Building for production



### Desktop installers

```sh
npm run tauri:build
```

Produces platform-specific installers (`.dmg` on macOS, `.msi`/`.exe` on Windows, `.deb`/`.AppImage` on Linux).

### Static web SPA

```sh
npm run build
npm run preview   # preview the output
```

Outputs to `build/` with a `200.html` fallback for SPA routing. Not a PWA — no service worker or install manifest. Prefer the native app for daily use.

## Scripts reference


| Command                | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Vite dev server (web)                            |
| `npm run build`        | Production static build                          |
| `npm run preview`      | Preview production build                         |
| `npm run tauri:dev`    | Native app with dev server                       |
| `npm run tauri:build`  | Build desktop installers                         |
| `npm run check`        | Svelte + TypeScript type checking                |
| `npm run lint`         | Biome lint                                       |
| `npm run format`       | Biome auto-format                                |
| `npm run test`         | Run unit tests (Vitest)                          |
| `npm run knip`         | Dead code detection                              |
| `npm run import:lunar` | Re-import lunar eclipse catalog from source data |




## Project structure

```
umbra/
├── src/
│   ├── routes/                 # SvelteKit pages
│   │   ├── +page.svelte        # Home (solar eclipse list + map)
│   │   ├── details/            # Solar eclipse detail view
│   │   ├── lunar/              # Lunar eclipse list + details/
│   │   ├── dictionary/         # Eclipse terminology glossary
│   │   └── settings/           # App settings
│   └── lib/
│       ├── components/         # Svelte components
│       ├── eclipse/            # Eclipse math (catalog, circumstances, paths, worker)
│       ├── services/           # API clients (elevation, clouds, geocoding, favorites, compare-locations)
│       ├── map/                # Leaflet map utilities
│       ├── paraglide/          # Generated i18n runtime
│       ├── app-state.svelte.ts # Global solar state
│       └── lunar-state.svelte.ts # Global lunar state
├── messages/                   # Translation files (en.json, de.json)
├── scripts/                    # Data import scripts
├── src-tauri/                  # Tauri Rust backend + config
│   ├── tauri.conf.json         # App config, CSP, plugins, bundle
│   ├── capabilities/           # Permission capabilities
│   └── icons/                  # App icons
├── package.json
└── biome.json
```



## Deep links

The app registers the `umbra:` URI scheme. Examples:

```
umbra:/details?date=2026-08-12&lat=48.137&lon=11.576
umbra:/lunar/details?date=2025-09-07&lat=52.52&lon=13.405
```



## License

Private / All rights reserved.