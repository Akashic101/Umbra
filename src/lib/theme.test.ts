import { describe, expect, it } from "vitest";
import {
	applyTheme,
	isDarkTheme,
	readThemePreference,
	THEME_STORAGE_KEY,
	writeThemePreference,
} from "./theme";

function memoryStorage(initial: Record<string, string> = {}): Storage {
	const data = { ...initial };
	return {
		get length() {
			return Object.keys(data).length;
		},
		clear() {
			for (const key of Object.keys(data)) {
				delete data[key];
			}
		},
		getItem(key) {
			return data[key] ?? null;
		},
		key() {
			return null;
		},
		removeItem(key) {
			delete data[key];
		},
		setItem(key, value) {
			data[key] = value;
		},
	};
}

describe("theme preference", () => {
	it("treats a missing key as system", () => {
		expect(readThemePreference(memoryStorage())).toBe("system");
	});

	it("reads Flowbite dark and light values", () => {
		expect(
			readThemePreference(memoryStorage({ [THEME_STORAGE_KEY]: "dark" })),
		).toBe("dark");
		expect(
			readThemePreference(memoryStorage({ [THEME_STORAGE_KEY]: "light" })),
		).toBe("light");
	});

	it("clears storage for system so Flowbite matches prefers-color-scheme", () => {
		const storage = memoryStorage({ [THEME_STORAGE_KEY]: "dark" });
		writeThemePreference("system", storage);
		expect(storage.getItem(THEME_STORAGE_KEY)).toBeNull();
	});

	it("maps preference to the html dark class", () => {
		expect(isDarkTheme("dark", false)).toBe(true);
		expect(isDarkTheme("light", true)).toBe(false);
		expect(isDarkTheme("system", true)).toBe(true);
		expect(isDarkTheme("system", false)).toBe(false);

		const root = {
			classList: {
				dark: false,
				toggle(_token: string, force?: boolean) {
					this.dark = Boolean(force);
				},
			},
		};
		applyTheme("dark", root, false);
		expect(root.classList.dark).toBe(true);
		applyTheme("light", root, true);
		expect(root.classList.dark).toBe(false);
	});
});
