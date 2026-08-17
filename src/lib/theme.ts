/** Flowbite DarkMode stores this literal key, not `color-theme`. */
export const THEME_STORAGE_KEY = "THEME_PREFERENCE_KEY";

export type ThemePreference = "light" | "dark" | "system";

export type ThemeStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readThemePreference(
	storage: ThemeStorage | null = defaultStorage(),
): ThemePreference {
	const raw = storage?.getItem(THEME_STORAGE_KEY);
	if (raw === "dark" || raw === "light") {
		return raw;
	}
	return "system";
}

export function writeThemePreference(
	preference: ThemePreference,
	storage: ThemeStorage | null = defaultStorage(),
): void {
	if (!storage) {
		return;
	}
	if (preference === "system") {
		storage.removeItem(THEME_STORAGE_KEY);
		return;
	}
	storage.setItem(THEME_STORAGE_KEY, preference);
}

export function prefersDarkScheme(
	matchMedia:
		| ((query: string) => { matches: boolean })
		| null = defaultMatchMedia(),
): boolean {
	return matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function isDarkTheme(
	preference: ThemePreference,
	darkPreferred = prefersDarkScheme(),
): boolean {
	if (preference === "dark") {
		return true;
	}
	if (preference === "light") {
		return false;
	}
	return darkPreferred;
}

export function applyTheme(
	preference: ThemePreference,
	root?: { classList: { toggle: (token: string, force?: boolean) => unknown } },
	darkPreferred = prefersDarkScheme(),
): void {
	const el =
		root ?? (typeof document === "undefined" ? null : document.documentElement);
	el?.classList.toggle("dark", isDarkTheme(preference, darkPreferred));
}

export function setTheme(
	preference: ThemePreference,
	storage: ThemeStorage | null = defaultStorage(),
	root?: { classList: { toggle: (token: string, force?: boolean) => unknown } },
): void {
	writeThemePreference(preference, storage);
	if (typeof document !== "undefined" || root) {
		applyTheme(preference, root ?? document.documentElement);
	}
}

function defaultStorage(): ThemeStorage | null {
	return typeof localStorage === "undefined" ? null : localStorage;
}

function defaultMatchMedia(): ((query: string) => { matches: boolean }) | null {
	return typeof window === "undefined" ? null : window.matchMedia.bind(window);
}
