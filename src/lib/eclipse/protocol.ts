import type {
	CatalogEntry,
	EclipsePaths,
	LocalCircumstances,
	LocalSummary,
	ObserverEclipseDetails,
	ObserverLocation,
} from "$lib/types";

export type WorkerRequest =
	| { id: number; type: "catalog" }
	| { id: number; type: "localAll"; location: ObserverLocation }
	| {
			id: number;
			type: "circumstances";
			date: string;
			location: ObserverLocation;
	  }
	| { id: number; type: "paths"; date: string }
	| {
			id: number;
			type: "observerDetails";
			date: string;
			location: ObserverLocation;
	  };

export type WorkerResponse =
	| { id: number; ok: true; type: "catalog"; payload: CatalogEntry[] }
	| { id: number; ok: true; type: "localAll"; payload: LocalSummary[] }
	| {
			id: number;
			ok: true;
			type: "circumstances";
			payload: LocalCircumstances;
	  }
	| { id: number; ok: true; type: "paths"; payload: EclipsePaths }
	| {
			id: number;
			ok: true;
			type: "observerDetails";
			payload: ObserverEclipseDetails;
	  }
	| { id: number; ok: false; error: string };
