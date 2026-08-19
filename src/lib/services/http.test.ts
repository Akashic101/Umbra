import { afterEach, describe, expect, it, vi } from "vitest";
import { getJson, HttpError } from "./http";

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("HttpError", () => {
	it("stores the status code", () => {
		const error = new HttpError(404, "missing");
		expect(error.name).toBe("HttpError");
		expect(error.status).toBe(404);
		expect(error.message).toBe("missing");
	});
});

describe("getJson", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns parsed JSON for successful responses", async () => {
		const fetchFn = vi.fn(async () => jsonResponse({ ok: true }));
		await expect(
			getJson<{ ok: boolean }>("https://example.com/data", { fetch: fetchFn }),
		).resolves.toEqual({ ok: true });
		expect(fetchFn).toHaveBeenCalledWith(
			"https://example.com/data",
			expect.objectContaining({
				headers: expect.objectContaining({ Accept: "application/json" }),
			}),
		);
	});

	it("throws HttpError for non-OK responses", async () => {
		await expect(
			getJson("https://example.com/missing", {
				fetch: async () => jsonResponse(null, 503),
			}),
		).rejects.toMatchObject({
			name: "HttpError",
			status: 503,
			message: expect.stringContaining("503"),
		});
	});

	it("merges custom headers", async () => {
		const fetchFn = vi.fn(async () => jsonResponse({ ok: true }));
		await getJson("https://example.com/data", {
			fetch: fetchFn,
			headers: { "X-Test": "1" },
		});
		expect(fetchFn).toHaveBeenCalledWith(
			"https://example.com/data",
			expect.objectContaining({
				headers: expect.objectContaining({
					Accept: "application/json",
					"X-Test": "1",
				}),
			}),
		);
	});

	it("aborts when the external signal is already aborted", async () => {
		const controller = new AbortController();
		controller.abort();
		const fetchFn = vi.fn(async (_url, init) => {
			expect(init?.signal?.aborted).toBe(true);
			throw new DOMException("Aborted", "AbortError");
		});
		await expect(
			getJson("https://example.com/data", {
				fetch: fetchFn,
				signal: controller.signal,
			}),
		).rejects.toBeInstanceOf(DOMException);
	});

	it("aborts when the external signal aborts later", async () => {
		const controller = new AbortController();
		const fetchFn = vi.fn(
			(_url, init) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () => {
						reject(new DOMException("Aborted", "AbortError"));
					});
				}),
		);
		const pending = getJson("https://example.com/data", {
			fetch: fetchFn,
			signal: controller.signal,
		});
		controller.abort();
		await expect(pending).rejects.toBeInstanceOf(DOMException);
	});

	it("aborts on timeout", async () => {
		vi.useFakeTimers();
		const fetchFn = vi.fn(
			(_url, init) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener("abort", () => {
						reject(new DOMException("Aborted", "AbortError"));
					});
				}),
		);
		const pending = getJson("https://example.com/data", {
			fetch: fetchFn,
			timeoutMs: 50,
		});
		vi.advanceTimersByTime(50);
		await expect(pending).rejects.toBeInstanceOf(DOMException);
	});

	it("uses global fetch when no custom fetch is provided", async () => {
		const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
		vi.stubGlobal("fetch", fetchMock);
		await expect(getJson<{ ok: boolean }>("https://example.com/data")).resolves.toEqual(
			{ ok: true },
		);
		expect(fetchMock).toHaveBeenCalledOnce();
		vi.unstubAllGlobals();
	});
});
