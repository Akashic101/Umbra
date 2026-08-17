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
	  }
	| { id: number; type: "lunarCatalog" }
	| { id: number; type: "lunarLocalAll"; location: ObserverLocation }
	| {
			id: number;
			type: "lunarCircumstances";
			date: string;
			location: ObserverLocation;
	  }
	| {
			id: number;
			type: "lunarObserverDetails";
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
	| {
			id: number;
			ok: true;
			type: "lunarCatalog";
			payload: LunarCatalogEntry[];
	  }
	| {
			id: number;
			ok: true;
			type: "lunarLocalAll";
			payload: LunarLocalSummary[];
	  }
	| {
			id: number;
			ok: true;
			type: "lunarCircumstances";
			payload: LunarLocalCircumstances;
	  }
	| {
			id: number;
			ok: true;
			type: "lunarObserverDetails";
			payload: LunarObserverDetails;
	  }
	| { id: number; ok: false; error: string };
