export type FetchFn = typeof fetch;

export class HttpError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "HttpError";
		this.status = status;
	}
}

export type GetJsonOptions = {
	fetch?: FetchFn;
	headers?: HeadersInit;
	timeoutMs?: number;
	signal?: AbortSignal;
};

export async function getJson<T>(
	url: string,
	options: GetJsonOptions = {},
): Promise<T> {
	const fetchFn = options.fetch ?? globalThis.fetch;
	const timeoutMs = options.timeoutMs ?? 10_000;
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	if (options.signal) {
		if (options.signal.aborted) {
			controller.abort();
		} else {
			options.signal.addEventListener("abort", () => controller.abort(), {
				once: true,
			});
		}
	}

	try {
		const response = await fetchFn(url, {
			headers: {
				Accept: "application/json",
				...options.headers,
			},
			signal: controller.signal,
		});
		if (!response.ok) {
			throw new HttpError(
				response.status,
				`Request failed (${response.status}) for ${url}`,
			);
		}
		return (await response.json()) as T;
	} finally {
		clearTimeout(timeout);
	}
}
