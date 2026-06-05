import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SpeedUnit } from "@/lib/speed";

export type TripRoutePoint = {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: number;
};

/** @deprecated Use TripRoutePoint */
export type TripCoordinate = Pick<TripRoutePoint, "latitude" | "longitude">;

export type SavedTrip = {
  id: string;
  startedAt: number;
  endedAt: number;
  unit: SpeedUnit;
  maxSpeed: number;
  avgSpeedWithRest: number;
  avgSpeedWithoutRest: number;
  distanceMeters: number;
  movingDurationSeconds: number;
  totalDurationSeconds: number;
  altitude: number | null;
  routePoints?: TripRoutePoint[];
};

const STORAGE_KEY = "@speedometer/trips";

export async function getSavedTrips(): Promise<SavedTrip[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const trips = JSON.parse(raw) as SavedTrip[];
    return trips.sort((a, b) => b.endedAt - a.endedAt);
  } catch {
    return [];
  }
}

export async function getSavedTrip(id: string): Promise<SavedTrip | null> {
  const trips = await getSavedTrips();
  return trips.find((trip) => trip.id === id) ?? null;
}

export async function saveTrip(trip: SavedTrip): Promise<void> {
  const trips = await getSavedTrips();
  trips.unshift(trip);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

export async function deleteTrip(id: string): Promise<void> {
  const trips = await getSavedTrips();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(trips.filter((trip) => trip.id !== id)),
  );
}

export function createTripId(): string {
  return `trip-${Date.now()}`;
}

export function tripHasRoute(trip: SavedTrip) {
  return (trip.routePoints?.length ?? 0) >= 2;
}
