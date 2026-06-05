import {
  formatAltitude,
  formatDistance,
  formatDuration,
  formatSpeed,
  getUnitLabel,
  type SpeedUnit,
} from '@/lib/speed';
import { formatClockDateTime, formatClockTime } from '@/lib/time-format';
import type { SavedTrip } from '@/lib/trip-storage';

export function formatTripDateTime(timestamp: number): string {
  return formatClockDateTime(timestamp);
}

export function formatTripTimeRange(trip: SavedTrip): string {
  const start = formatClockTime(trip.startedAt);
  const end = formatClockTime(trip.endedAt);
  return `${start} – ${end}`;
}

export function getTripSummary(trip: SavedTrip) {
  const unit = trip.unit;
  return {
    distance: formatDistance(trip.distanceMeters, unit),
    totalTime: formatDuration(trip.totalDurationSeconds),
    movingTime: formatDuration(trip.movingDurationSeconds),
    maxSpeed: formatSpeed(trip.maxSpeed, unit),
    avgWithRest: formatSpeed(trip.avgSpeedWithRest, unit),
    avgMoving: formatSpeed(trip.avgSpeedWithoutRest, unit),
    altitude: formatAltitude(trip.altitude, unit),
    unitLabel: getUnitLabel(unit),
  };
}
