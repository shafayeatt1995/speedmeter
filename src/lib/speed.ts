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
  return formatDecimal(Math.round(Math.max(0, speed)), 0);
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

export function bearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const toDegrees = (value: number) => (value * 180) / Math.PI;

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLon = toRadians(lon2 - lon1);

  const y = Math.sin(deltaLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLon);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function headingAngleDifference(from: number, to: number): number {
  const start = normalizeHeading(from);
  const end = normalizeHeading(to);
  if (start == null || end == null) {
    return 0;
  }

  let diff = end - start;
  if (diff > 180) {
    diff -= 360;
  }
  if (diff < -180) {
    diff += 360;
  }
  return diff;
}

export function smoothHeading(
  previous: number | null,
  next: number,
  options?: { deadZoneDegrees?: number; alpha?: number }
): number {
  const normalized = normalizeHeading(next);
  if (normalized == null) {
    return previous ?? 0;
  }
  if (previous == null) {
    return normalized;
  }

  const previousNormalized = normalizeHeading(previous);
  if (previousNormalized == null) {
    return normalized;
  }

  const deadZone = options?.deadZoneDegrees ?? 6;
  const alpha = options?.alpha ?? 0.25;
  const diff = headingAngleDifference(previousNormalized, normalized);

  if (Math.abs(diff) < deadZone) {
    return previousNormalized;
  }

  return normalizeHeading(previousNormalized + diff * alpha) ?? normalized;
}

const COMPASS_SHORT_LABELS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
const COMPASS_FULL_LABELS = [
  'North',
  'Northeast',
  'East',
  'Southeast',
  'South',
  'Southwest',
  'West',
  'Northwest',
] as const;

function normalizeHeading(heading: number | null | undefined): number | null {
  if (heading == null || !Number.isFinite(heading) || heading < 0) {
    return null;
  }

  return ((heading % 360) + 360) % 360;
}

function getCompassIndex(heading: number) {
  return Math.round(heading / 45) % COMPASS_SHORT_LABELS.length;
}

export function headingToCompassShort(heading: number | null | undefined): string {
  const normalized = normalizeHeading(heading);
  if (normalized == null) {
    return '--';
  }

  return COMPASS_SHORT_LABELS[getCompassIndex(normalized)];
}

export function headingToCompassLabel(heading: number | null | undefined): string {
  const normalized = normalizeHeading(heading);
  if (normalized == null) {
    return '--';
  }

  return COMPASS_FULL_LABELS[getCompassIndex(normalized)];
}
