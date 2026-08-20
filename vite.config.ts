import { paraglideVitePlugin } from "@inlang/paraglide-js";
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	envPrefix: ["VITE_", "TAURI_ENV_", "TAURI_"],
	plugins: [
		tailwindcss(),
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/lib/paraglide",
			emitTsDeclarations: true,
			strategy: ["localStorage", "cookie", "preferredLanguage", "baseLocale"],
		}),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
			},
			// Absolute asset URLs keep the SPA fallback from requesting assets
			// relative to the current path.
			paths: { relative: false },
			adapter: adapter({
				fallback: "200.html",
				strict: true,
			}),
			serviceWorker: {
				register: false,
			},
		}),
	],
	server: {
		strictPort: true,
		watch: {
			ignored: ["**/src-tauri/**"],
		},
	},
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: "v8",
			include: ["src/lib/services/**/*.ts"],
			exclude: ["src/lib/services/**/*.test.ts"],
			thresholds: {
				100: true,
			},
		},
		projects: [
			{
				extends: "./vite.config.ts",
				test: {
					name: "unit",
					environment: "node",
					include: [
						"src/lib/services/**/*.{test,spec}.{js,ts}",
						"src/lib/units.test.ts",
						"src/lib/theme.test.ts",
					],
				},
			},
		],
	},
});
