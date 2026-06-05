export type SpeedUnit = 'kmh' | 'mph';

const MPS_TO_KMH = 3.6;
const MPS_TO_MPH = 2.23694;
const METERS_TO_KM = 0.001;
const METERS_TO_MILES = 0.000621371;
const MAX_DECIMALS = 2;

export function formatDecimal(value: number, maximumFractionDigits = MAX_DECIMALS): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function metersPerSecondToUnit(speedMps: number, unit: SpeedUnit): number {
  const value = unit === 'kmh' ? speedMps * MPS_TO_KMH : speedMps * MPS_TO_MPH;
  return Math.max(0, value);
}

export function formatSpeed(speed: number, _unit?: SpeedUnit): string {
  return formatDecimal(Math.max(0, speed));
}

export function averageSpeedFromDistance(
  distanceMeters: number,
  durationSeconds: number,
  unit: SpeedUnit
): number {
  if (durationSeconds <= 0 || distanceMeters <= 0) {
    return 0;
  }

  return metersPerSecondToUnit(distanceMeters / durationSeconds, unit);
}

export function formatDistance(meters: number, unit: SpeedUnit): string {
  if (unit === 'kmh') {
    return meters >= 1000
      ? `${formatDecimal(meters * METERS_TO_KM)} km`
      : `${formatDecimal(meters)} m`;
  }

  const miles = meters * METERS_TO_MILES;
  return miles >= 0.1
    ? `${formatDecimal(miles)} mi`
    : `${formatDecimal(meters * 3.28084)} ft`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function formatHeading(heading: number | null): string {
  if (heading == null || Number.isNaN(heading)) {
    return '--';
  }

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
}

export function formatAltitude(meters: number | null, unit: SpeedUnit): string {
  if (meters == null || Number.isNaN(meters)) {
    return '--';
  }

  if (unit === 'kmh') {
    return `${formatDecimal(meters)} m`;
  }

  return `${formatDecimal(meters * 3.28084)} ft`;
}

export function getUnitLabel(unit: SpeedUnit): string {
  return unit === 'kmh' ? 'km/h' : 'mph';
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function resolveSpeedMps(
  gpsSpeed: number | null,
  previous: { latitude: number; longitude: number; timestamp: number } | null,
  current: { latitude: number; longitude: number; timestamp: number }
): number {
  if (gpsSpeed != null && gpsSpeed >= 0) {
    return gpsSpeed;
  }

  if (!previous) {
    return 0;
  }

  const elapsedSeconds = (current.timestamp - previous.timestamp) / 1000;
  if (elapsedSeconds <= 0) {
    return 0;
  }

  const distance = haversineDistanceMeters(
    previous.latitude,
    previous.longitude,
    current.latitude,
    current.longitude
  );

  return distance / elapsedSeconds;
}
