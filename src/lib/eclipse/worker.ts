/// <reference lib="webworker" />

import { listCatalog } from "./catalog";
import { getObserverEclipseDetails } from "./detail";
import { getLocalCircumstances, getLocalSummaries } from "./local";
import { getEclipsePaths } from "./paths";
import type { WorkerRequest, WorkerResponse } from "./protocol";

const worker = self as unknown as DedicatedWorkerGlobalScope;

worker.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
	const request = event.data;
	try {
		const response = handle(request);
		worker.postMessage(response);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Eclipse calculation failed.";
		const failure: WorkerResponse = {
			id: request.id,
			ok: false,
			error: message,
		};
		worker.postMessage(failure);
	}
});

function handle(request: WorkerRequest): WorkerResponse {
	switch (request.type) {
		case "catalog":
			return {
				id: request.id,
				ok: true,
				type: "catalog",
				payload: listCatalog(),
			};
		case "localAll": {
			const dates = listCatalog().map((entry) => entry.date);
			return {
				id: request.id,
				ok: true,
				type: "localAll",
				payload: getLocalSummaries(dates, request.location),
			};
		}
		case "circumstances":
			return {
				id: request.id,
				ok: true,
				type: "circumstances",
				payload: getLocalCircumstances(request.date, request.location),
			};
		case "paths":
			return {
				id: request.id,
				ok: true,
				type: "paths",
				payload: getEclipsePaths(request.date),
			};
		case "observerDetails":
			return {
				id: request.id,
				ok: true,
				type: "observerDetails",
				payload: getObserverEclipseDetails(request.date, request.location),
			};
	}
}
