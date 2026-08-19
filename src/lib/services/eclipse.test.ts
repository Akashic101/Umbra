import { describe, expect, it, vi } from "vitest";
import type { WorkerRequest, WorkerResponse } from "$lib/eclipse/protocol";
import { createEclipseService } from "./eclipse";

type WorkerListener = (event: { data: WorkerResponse } | ErrorEvent) => void;

function createWorkerStub(
	responder: (message: WorkerRequest) => WorkerResponse["payload"] | Error,
) {
	const listeners = new Map<string, Set<WorkerListener>>();
	let terminated = false;
	const worker = {
		addEventListener(type: string, listener: WorkerListener) {
			if (!listeners.has(type)) {
				listeners.set(type, new Set());
			}
			listeners.get(type)?.add(listener);
		},
		postMessage(message: WorkerRequest) {
			if (terminated) {
				return;
			}
			try {
				const payload = responder(message);
				if (payload instanceof Error) {
					for (const listener of listeners.get("message") ?? []) {
						listener({
							data: {
								id: message.id,
								ok: false,
								error: payload.message,
							},
						});
					}
					return;
				}
				for (const listener of listeners.get("message") ?? []) {
					listener({
						data: {
							id: message.id,
							ok: true,
							payload,
						},
					});
				}
			} catch (error) {
				for (const listener of listeners.get("error") ?? []) {
					listener({
						message: error instanceof Error ? error.message : String(error),
					} as ErrorEvent);
				}
			}
		},
		terminate() {
			terminated = true;
		},
	} as unknown as Worker;
	return worker;
}

const location = {
	lat: 48.137,
	lon: 11.576,
	height: 520,
	label: "Munich",
};

const observerDetails = {
	series: [],
	contactDaylight: [],
};

describe("createEclipseService", () => {
	it("forwards catalog requests to the worker", async () => {
		const service = createEclipseService({
			createWorker: () =>
				createWorkerStub((message) => {
					if (message.type === "catalog") {
						return [{ date: "2026-08-12" }];
					}
					throw new Error(`unexpected ${message.type}`);
				}),
		});
		await expect(service.getCatalog()).resolves.toEqual([
			{ date: "2026-08-12" },
		]);
	});

	it("forwards location-bearing requests with cloned locations", async () => {
		const service = createEclipseService({
			createWorker: () =>
				createWorkerStub((message) => {
					if (message.type === "localAll") {
						expect(message.location).toEqual(location);
						return [{ date: "2026-08-12", type: "total" }];
					}
					if (message.type === "circumstances") {
						return { date: "2026-08-12", type: "total" };
					}
					if (message.type === "paths") {
						return { date: "2026-08-12", paths: [] };
					}
					if (message.type === "lunarCatalog") {
						return [{ date: "2026-08-12" }];
					}
					if (message.type === "lunarLocalAll") {
						return [{ date: "2026-08-12" }];
					}
					if (message.type === "lunarCircumstances") {
						return { date: "2026-08-12" };
					}
					if (message.type === "lunarObserverDetails") {
						return { date: "2026-08-12" };
					}
					throw new Error(`unexpected ${message.type}`);
				}),
		});
		await expect(service.getLocalSummaries(location)).resolves.toEqual([
			{ date: "2026-08-12", type: "total" },
		]);
		await expect(service.getCircumstances("2026-08-12", location)).resolves.toEqual(
			{ date: "2026-08-12", type: "total" },
		);
		await expect(service.getPaths("2026-08-12")).resolves.toEqual({
			date: "2026-08-12",
			paths: [],
		});
		await expect(service.getLunarCatalog()).resolves.toEqual([
			{ date: "2026-08-12" },
		]);
		await expect(service.getLunarLocalSummaries(location)).resolves.toEqual([
			{ date: "2026-08-12" },
		]);
		await expect(service.getLunarCircumstances("2026-08-12", location)).resolves.toEqual(
			{ date: "2026-08-12" },
		);
		await expect(service.getLunarObserverDetails("2026-08-12", location)).resolves.toEqual(
			{ date: "2026-08-12" },
		);
	});

	it("normalizes observer details and restarts stale workers", async () => {
		let calls = 0;
		const service = createEclipseService({
			createWorker: () =>
				createWorkerStub((message) => {
					if (message.type !== "observerDetails") {
						throw new Error(`unexpected ${message.type}`);
					}
					calls += 1;
					if (calls === 1) {
						return { stale: true };
					}
					return {
						...observerDetails,
						date: "2026-08-12",
						location,
					};
				}),
		});
		const details = await service.getObserverDetails("2026-08-12", location);
		expect(calls).toBe(2);
		expect(details.series).toEqual([]);
		expect(details.contactDaylight).toEqual([]);
	});

	it("restarts the worker when the first payload is not an object", async () => {
		let calls = 0;
		const service = createEclipseService({
			createWorker: () =>
				createWorkerStub((message) => {
					if (message.type !== "observerDetails") {
						throw new Error(`unexpected ${message.type}`);
					}
					calls += 1;
					if (calls === 1) {
						return null;
					}
					return {
						...observerDetails,
						date: "2026-08-12",
						location,
					};
				}),
		});
		await service.getObserverDetails("2026-08-12", location);
		expect(calls).toBe(2);
	});

	it("accepts observer details on the first worker response", async () => {
		let calls = 0;
		const service = createEclipseService({
			createWorker: () =>
				createWorkerStub((message) => {
					if (message.type !== "observerDetails") {
						throw new Error(`unexpected ${message.type}`);
					}
					calls += 1;
					return {
						...observerDetails,
						date: "2026-08-12",
						location,
					};
				}),
		});
		await service.getObserverDetails("2026-08-12", location);
		expect(calls).toBe(1);
	});

	it("restarts when only one details field is present", async () => {
		let calls = 0;
		const service = createEclipseService({
			createWorker: () =>
				createWorkerStub((message) => {
					if (message.type !== "observerDetails") {
						throw new Error(`unexpected ${message.type}`);
					}
					calls += 1;
					if (calls === 1) {
						return { series: [] };
					}
					return {
						...observerDetails,
						date: "2026-08-12",
						location,
					};
				}),
		});
		await service.getObserverDetails("2026-08-12", location);
		expect(calls).toBe(2);
	});

	it("reuses the same worker for back-to-back requests", async () => {
		let workers = 0;
		const service = createEclipseService({
			createWorker: () => {
				workers += 1;
				return createWorkerStub((message) => {
					if (message.type === "catalog") {
						return [];
					}
					throw new Error(`unexpected ${message.type}`);
				});
			},
		});
		await service.getCatalog();
		await service.getCatalog();
		expect(workers).toBe(1);
	});

	it("ignores orphan worker messages", async () => {
		const listeners = new Map<string, Set<WorkerListener>>();
		const worker = {
			addEventListener(type: string, listener: WorkerListener) {
				if (!listeners.has(type)) {
					listeners.set(type, new Set());
				}
				listeners.get(type)?.add(listener);
				if (type === "message") {
					listener({
						data: {
							id: 999,
							ok: true,
							payload: [],
						},
					});
				}
			},
			postMessage(message: WorkerRequest) {
				for (const listener of listeners.get("message") ?? []) {
					listener({
						data: {
							id: message.id,
							ok: true,
							payload: [{ date: "2026-08-12" }],
						},
					});
				}
			},
			terminate: vi.fn(),
		} as unknown as Worker;
		const service = createEclipseService({ createWorker: () => worker });
		await expect(service.getCatalog()).resolves.toEqual([
			{ date: "2026-08-12" },
		]);
	});

	it("uses a fallback message when the worker error is blank", async () => {
		const listeners = new Map<string, Set<WorkerListener>>();
		const worker = {
			addEventListener(type: string, listener: WorkerListener) {
				if (!listeners.has(type)) {
					listeners.set(type, new Set());
				}
				listeners.get(type)?.add(listener);
			},
			postMessage(_message: WorkerRequest) {
				for (const listener of listeners.get("error") ?? []) {
					listener({ message: "" } as ErrorEvent);
				}
			},
			terminate: vi.fn(),
		} as unknown as Worker;
		const service = createEclipseService({ createWorker: () => worker });
		await expect(service.getCatalog()).rejects.toThrow("Eclipse worker failed.");
	});

	it("rejects when the worker returns an error response", async () => {
		const service = createEclipseService({
			createWorker: () =>
				createWorkerStub(() => new Error("worker failed")),
		});
		await expect(service.getCatalog()).rejects.toThrow("worker failed");
	});

	it("rejects pending requests when the worker crashes", async () => {
		const listeners = new Map<string, Set<WorkerListener>>();
		const worker = {
			addEventListener(type: string, listener: WorkerListener) {
				if (!listeners.has(type)) {
					listeners.set(type, new Set());
				}
				listeners.get(type)?.add(listener);
			},
			postMessage(message: WorkerRequest) {
				for (const listener of listeners.get("error") ?? []) {
					listener({ message: "boom" } as ErrorEvent);
				}
				for (const listener of listeners.get("message") ?? []) {
					listener({
						data: {
							id: message.id,
							ok: true,
							payload: [],
						},
					});
				}
			},
			terminate: vi.fn(),
		} as unknown as Worker;
		const service = createEclipseService({ createWorker: () => worker });
		await expect(service.getCatalog()).rejects.toThrow("boom");
	});

	it("uses a fallback message when the worker error is blank", async () => {
		const listeners = new Map<string, Set<WorkerListener>>();
		const worker = {
			addEventListener(type: string, listener: WorkerListener) {
				if (!listeners.has(type)) {
					listeners.set(type, new Set());
				}
				listeners.get(type)?.add(listener);
			},
			postMessage(_message: WorkerRequest) {
				for (const listener of listeners.get("error") ?? []) {
					listener({ message: "" } as ErrorEvent);
				}
			},
			terminate: vi.fn(),
		} as unknown as Worker;
		const service = createEclipseService({ createWorker: () => worker });
		await expect(service.getCatalog()).rejects.toThrow("Eclipse worker failed.");
	});

	it("creates a real worker when no factory is provided", async () => {
		class MockWorker {
			static instances: MockWorker[] = [];
			onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
			onerror: ((event: ErrorEvent) => void) | null = null;

			constructor(_url: URL, _options?: WorkerOptions) {
				MockWorker.instances.push(this);
			}

			addEventListener(type: string, listener: WorkerListener) {
				if (type === "message") {
					this.onmessage = listener as (event: MessageEvent<WorkerResponse>) => void;
				}
				if (type === "error") {
					this.onerror = listener as (event: ErrorEvent) => void;
				}
			}

			postMessage(message: WorkerRequest) {
				this.onmessage?.({
					data: {
						id: message.id,
						ok: true,
						payload: [{ date: "2026-08-12" }],
					},
				});
			}

			terminate() {}
		}

		vi.stubGlobal("Worker", MockWorker);
		const service = createEclipseService();
		await expect(service.getCatalog()).resolves.toEqual([{ date: "2026-08-12" }]);
		expect(MockWorker.instances).toHaveLength(1);
		vi.unstubAllGlobals();
	});

	it("restarts cleanly when the worker was already torn down", async () => {
		let calls = 0;
		const service = createEclipseService({
			createWorker: () =>
				createWorkerStub((message) => {
					if (message.type !== "observerDetails") {
						throw new Error(`unexpected ${message.type}`);
					}
					calls += 1;
					if (calls === 1) {
						return { stale: true };
					}
					return {
						...observerDetails,
						date: "2026-08-12",
						location,
					};
				}),
		});
		await service.getObserverDetails("2026-08-12", location);
		await service.getObserverDetails("2026-08-12", location);
		expect(calls).toBe(3);
	});
});
