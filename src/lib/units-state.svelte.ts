import {
	type DistanceUnit,
	readDistanceUnit,
	readTemperatureUnit,
	type TemperatureUnit,
	writeDistanceUnit,
	writeTemperatureUnit,
} from "./units";

class UnitsState {
	distance = $state<DistanceUnit>(readDistanceUnit());
	temperature = $state<TemperatureUnit>(readTemperatureUnit());

	setDistance(unit: DistanceUnit): void {
		writeDistanceUnit(unit);
		this.distance = unit;
	}

	setTemperature(unit: TemperatureUnit): void {
		writeTemperatureUnit(unit);
		this.temperature = unit;
	}
}

export const unitsState = new UnitsState();
