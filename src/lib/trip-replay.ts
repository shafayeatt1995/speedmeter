import { getUnitLabel } from '@/lib/speed';
import type { SavedTrip, TripRoutePoint } from '@/lib/trip-storage';

export type ReplayFrame = {
  latitude: number;
  longitude: number;
  speed: number;
  progressMs: number;
  pointIndex: number;
};

export const MIN_PLAYBACK_RATE = 1;
export const MAX_PLAYBACK_RATE = 32;

export function clampPlaybackRate(rate: number) {
  return Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, Math.round(rate)));
}

function getTripDurationMs(trip: SavedTrip) {
  return Math.max(trip.endedAt - trip.startedAt, 1);
}

export function normalizeRoutePoints(trip: SavedTrip): TripRoutePoint[] {
  const raw = trip.routePoints ?? [];
  if (raw.length === 0) {
    return [];
  }

  const tripStart = trip.startedAt;
  const tripDuration = getTripDurationMs(trip);

  if (raw.length === 1) {
    const point = raw[0];
    return [
      {
        latitude: point.latitude,
        longitude: point.longitude,
        speed: point.speed ?? 0,
        timestamp: tripStart,
      },
      {
        latitude: point.latitude,
        longitude: point.longitude,
        speed: point.speed ?? 0,
        timestamp: tripStart + tripDuration,
      },
    ];
  }

  return raw.map((point, index) => ({
    latitude: point.latitude,
    longitude: point.longitude,
    speed: typeof point.speed === 'number' && !Number.isNaN(point.speed) ? point.speed : 0,
    timestamp: tripStart + (index / (raw.length - 1)) * tripDuration,
  }));
}

export function getReplayDurationMs(trip: SavedTrip, points: TripRoutePoint[]) {
  if (points.length < 2) {
    return 0;
  }

  return getTripDurationMs(trip);
}

export function getReplayFrame(points: TripRoutePoint[], progressMs: number): ReplayFrame | null {
  if (points.length === 0) {
    return null;
  }

  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      speed: points[0].speed,
      progressMs: 0,
      pointIndex: 0,
    };
  }

  const startTime = points[0].timestamp;
  const endTime = points[points.length - 1].timestamp;
  const durationMs = Math.max(endTime - startTime, 1);
  const absoluteTime = startTime + Math.min(Math.max(progressMs, 0), durationMs);

  if (absoluteTime <= startTime) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      speed: points[0].speed,
      progressMs: 0,
      pointIndex: 0,
    };
  }

  if (absoluteTime >= endTime) {
    const last = points[points.length - 1];
    return {
      latitude: last.latitude,
      longitude: last.longitude,
      speed: last.speed,
      progressMs: durationMs,
      pointIndex: points.length - 1,
    };
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];

    if (absoluteTime >= current.timestamp && absoluteTime <= next.timestamp) {
      const segmentDuration = Math.max(next.timestamp - current.timestamp, 1);
      const ratio = (absoluteTime - current.timestamp) / segmentDuration;

      return {
        latitude: current.latitude + (next.latitude - current.latitude) * ratio,
        longitude: current.longitude + (next.longitude - current.longitude) * ratio,
        speed: Math.round(current.speed + (next.speed - current.speed) * ratio),
        progressMs: absoluteTime - startTime,
        pointIndex: index,
      };
    }
  }

  const fallback = points[points.length - 1];
  return {
    latitude: fallback.latitude,
    longitude: fallback.longitude,
    speed: fallback.speed,
    progressMs: durationMs,
    pointIndex: points.length - 1,
  };
}

export function formatReplayClock(progressMs: number, durationMs: number) {
  const format = (ms: number) => {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return `${format(progressMs)} / ${format(durationMs)}`;
}

export function getTripUnitLabel(trip: SavedTrip) {
  return getUnitLabel(trip.unit);
}
