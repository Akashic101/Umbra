import { normalizeObserverDetails } from "$lib/eclipse/normalize-details";
import type { WorkerRequest, WorkerResponse } from "$lib/eclipse/protocol";
import type {
	CatalogEntry,
	EclipsePaths,
	LocalCircumstances,
	LocalSummary,
	LunarCatalogEntry,
	LunarLocalCircumstances,
	LunarLocalSummary,
	LunarObserverDetails,
	ObserverEclipseDetails,
	ObserverLocation,
} from "$lib/types";

export type EclipseService = {
	getCatalog: () => Promise<CatalogEntry[]>;
	getLocalSummaries: (location: ObserverLocation) => Promise<LocalSummary[]>;
	getCircumstances: (
		date: string,
		location: ObserverLocation,
	) => Promise<LocalCircumstances>;
	getPaths: (date: string) => Promise<EclipsePaths>;
	getObserverDetails: (
		date: string,
		location: ObserverLocation,
	) => Promise<ObserverEclipseDetails>;
	getLunarCatalog: () => Promise<LunarCatalogEntry[]>;
	getLunarLocalSummaries: (
		location: ObserverLocation,
	) => Promise<LunarLocalSummary[]>;
	getLunarCircumstances: (
		date: string,
		location: ObserverLocation,
	) => Promise<LunarLocalCircumstances>;
	getLunarObserverDetails: (
		date: string,
		location: ObserverLocation,
	) => Promise<LunarObserverDetails>;
};

export type EclipseServiceDeps = {
	createWorker?: () => Worker;
};

type WorkerRequestBody = WorkerRequest extends infer T
	? T extends { id: number }
		? Omit<T, "id">
		: never
	: never;

type Pending = {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
};

/** Plain clone so Svelte $state proxies are safe for Worker postMessage. */
function cloneLocation(location: ObserverLocation): ObserverLocation {
	return {
		lat: location.lat,
		lon: location.lon,
		height: location.height,
		label: location.label,
	};
}

function looksLikeCurrentDetails(value: unknown): boolean {
	if (!value || typeof value !== "object") {
		return false;
	}
	const record = value as Record<string, unknown>;
	return Array.isArray(record.series) && Array.isArray(record.contactDaylight);
}

export function createEclipseService(
	deps: EclipseServiceDeps = {},
): EclipseService {
	let worker: Worker | null = null;
	let nextId = 1;
	const pending = new Map<number, Pending>();

	function rejectAll(error: Error): void {
		for (const waiter of pending.values()) {
			waiter.reject(error);
		}
		pending.clear();
	}

	function restartWorker(): void {
		if (worker) {
			worker.terminate();
			worker = null;
		}
		rejectAll(new Error("Eclipse worker restarted."));
	}

	function ensureWorker(): Worker {
		if (worker) {
			return worker;
		}
		worker = deps.createWorker
			? deps.createWorker()
			: new Worker(new URL("../eclipse/worker.ts", import.meta.url), {
					type: "module",
				});
		worker.addEventListener(
			"message",
			(event: MessageEvent<WorkerResponse>) => {
				const response = event.data;
				const waiter = pending.get(response.id);
				if (!waiter) {
					return;
				}
				pending.delete(response.id);
				if (response.ok) {
					waiter.resolve(response.payload);
				} else {
					waiter.reject(new Error(response.error));
				}
			},
		);
		worker.addEventListener("error", (event) => {
			const error = new Error(event.message || "Eclipse worker failed.");
			rejectAll(error);
			worker = null;
		});
		return worker;
	}

	function request<T>(message: WorkerRequestBody): Promise<T> {
		const id = nextId++;
		return new Promise<T>((resolve, reject) => {
			pending.set(id, {
				resolve: (value) => resolve(value as T),
				reject,
			});
			ensureWorker().postMessage({ id, ...message });
		});
	}

	async function getObserverDetails(
		date: string,
		location: ObserverLocation,
	): Promise<ObserverEclipseDetails> {
		const body = {
			type: "observerDetails" as const,
			date,
			location: cloneLocation(location),
		};
		let raw = await request<unknown>(body);
		if (!looksLikeCurrentDetails(raw)) {
			restartWorker();
			raw = await request<unknown>(body);
		}
		return normalizeObserverDetails(raw, {
			date,
			location: cloneLocation(location),
		});
	}

	return {
		getCatalog: () => request<CatalogEntry[]>({ type: "catalog" }),
		getLocalSummaries: (location) =>
			request<LocalSummary[]>({
				type: "localAll",
				location: cloneLocation(location),
			}),
		getCircumstances: (date, location) =>
			request<LocalCircumstances>({
				type: "circumstances",
				date,
				location: cloneLocation(location),
			}),
		getPaths: (date) => request<EclipsePaths>({ type: "paths", date }),
		getObserverDetails,
		getLunarCatalog: () =>
			request<LunarCatalogEntry[]>({ type: "lunarCatalog" }),
		getLunarLocalSummaries: (location) =>
			request<LunarLocalSummary[]>({
				type: "lunarLocalAll",
				location: cloneLocation(location),
			}),
		getLunarCircumstances: (date, location) =>
			request<LunarLocalCircumstances>({
				type: "lunarCircumstances",
				date,
				location: cloneLocation(location),
			}),
		getLunarObserverDetails: (date, location) =>
			request<LunarObserverDetails>({
				type: "lunarObserverDetails",
				date,
				location: cloneLocation(location),
			}),
	};
}

export const eclipseService = createEclipseService();
