import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  averageSpeedFromDistance,
  haversineDistanceMeters,
  metersPerSecondToUnit,
  resolveSpeedMps,
  type SpeedUnit,
} from '@/lib/speed';
import { createTripId, type SavedTrip, type TripRoutePoint } from '@/lib/trip-storage';

const ROUTE_POINT_MIN_DISTANCE_METERS = 25;

export type TrackingStatus = 'idle' | 'tracking' | 'paused';

export type SpeedometerStats = {
  currentSpeed: number;
  maxSpeed: number;
  avgSpeedWithRest: number;
  avgSpeedWithoutRest: number;
  distanceMeters: number;
  movingDurationSeconds: number;
  totalDurationSeconds: number;
  altitude: number | null;
  heading: number | null;
  accuracy: number | null;
};

const INITIAL_STATS: SpeedometerStats = {
  currentSpeed: 0,
  maxSpeed: 0,
  avgSpeedWithRest: 0,
  avgSpeedWithoutRest: 0,
  distanceMeters: 0,
  movingDurationSeconds: 0,
  totalDurationSeconds: 0,
  altitude: null,
  heading: null,
  accuracy: null,
};

type PositionSnapshot = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

function buildStats(
  unit: SpeedUnit,
  speedSamplesMps: number[],
  distanceMeters: number,
  movingDurationSeconds: number,
  totalDurationSeconds: number,
  altitude: number | null,
  heading: number | null,
  accuracy: number | null
): SpeedometerStats {
  const currentSpeedMps = speedSamplesMps.at(-1) ?? 0;
  const maxSpeedMps = speedSamplesMps.length ? Math.max(...speedSamplesMps) : 0;

  return {
    currentSpeed: metersPerSecondToUnit(currentSpeedMps, unit),
    maxSpeed: metersPerSecondToUnit(maxSpeedMps, unit),
    avgSpeedWithRest: averageSpeedFromDistance(distanceMeters, totalDurationSeconds, unit),
    avgSpeedWithoutRest: averageSpeedFromDistance(distanceMeters, movingDurationSeconds, unit),
    distanceMeters,
    movingDurationSeconds,
    totalDurationSeconds,
    altitude,
    heading,
    accuracy,
  };
}

export function useSpeedometer() {
  const [unit, setUnit] = useState<SpeedUnit>('kmh');
  const [status, setStatus] = useState<TrackingStatus>('idle');
  const [stats, setStats] = useState<SpeedometerStats>(INITIAL_STATS);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const previousPositionRef = useRef<PositionSnapshot | null>(null);
  const tripStartedAtRef = useRef<number | null>(null);
  const accumulatedMovingDurationRef = useRef(0);
  const movingSegmentStartedAtRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const speedSamplesMpsRef = useRef<number[]>([]);
  const routePointsRef = useRef<TripRoutePoint[]>([]);
  const lastRoutePointRef = useRef<Pick<TripRoutePoint, 'latitude' | 'longitude'> | null>(null);
  const latestTelemetryRef = useRef({
    altitude: null as number | null,
    heading: null as number | null,
    accuracy: null as number | null,
  });
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unitRef = useRef(unit);
  const statusRef = useRef(status);
  const autoStartAttemptedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const startTrackingRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    unitRef.current = unit;
    setStats((current) =>
      buildStats(
        unit,
        speedSamplesMpsRef.current,
        distanceRef.current,
        current.movingDurationSeconds,
        current.totalDurationSeconds,
        latestTelemetryRef.current.altitude,
        latestTelemetryRef.current.heading,
        latestTelemetryRef.current.accuracy
      )
    );
  }, [unit]);

  const clearDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  const getMovingElapsedSeconds = useCallback(() => {
    const activeSeconds = movingSegmentStartedAtRef.current
      ? (Date.now() - movingSegmentStartedAtRef.current) / 1000
      : 0;

    return accumulatedMovingDurationRef.current + activeSeconds;
  }, []);

  const getTotalElapsedSeconds = useCallback(() => {
    if (!tripStartedAtRef.current) {
      return 0;
    }

    return (Date.now() - tripStartedAtRef.current) / 1000;
  }, []);

  const syncStats = useCallback(() => {
    setStats(
      buildStats(
        unitRef.current,
        speedSamplesMpsRef.current,
        distanceRef.current,
        getMovingElapsedSeconds(),
        getTotalElapsedSeconds(),
        latestTelemetryRef.current.altitude,
        latestTelemetryRef.current.heading,
        latestTelemetryRef.current.accuracy
      )
    );
  }, [getMovingElapsedSeconds, getTotalElapsedSeconds]);

  const finalizeMovingSegment = useCallback(() => {
    if (movingSegmentStartedAtRef.current) {
      accumulatedMovingDurationRef.current +=
        (Date.now() - movingSegmentStartedAtRef.current) / 1000;
      movingSegmentStartedAtRef.current = null;
    }
  }, []);

  const stopSubscription = useCallback(async () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  }, []);

  const resetSession = useCallback(async () => {
    finalizeMovingSegment();
    await stopSubscription();
    clearDurationTimer();
    previousPositionRef.current = null;
    tripStartedAtRef.current = null;
    accumulatedMovingDurationRef.current = 0;
    movingSegmentStartedAtRef.current = null;
    distanceRef.current = 0;
    speedSamplesMpsRef.current = [];
    routePointsRef.current = [];
    lastRoutePointRef.current = null;
    latestTelemetryRef.current = { altitude: null, heading: null, accuracy: null };
    setStats(INITIAL_STATS);
    setError(null);
    setStatus('idle');
  }, [clearDurationTimer, finalizeMovingSegment, stopSubscription]);

  const requestPermission = useCallback(async () => {
    const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
    const granted = permissionStatus === Location.PermissionStatus.GRANTED;
    setPermissionGranted(granted);

    if (!granted) {
      setError('Location permission is required to track your speed.');
    } else {
      setError(null);
    }

    return granted;
  }, []);

  const recordRoutePoint = useCallback(
    (latitude: number, longitude: number, speedMps: number, timestamp: number) => {
      if (statusRef.current !== 'tracking') {
        return;
      }

      const point: TripRoutePoint = {
        latitude,
        longitude,
        speed: metersPerSecondToUnit(speedMps, unitRef.current),
        timestamp,
      };
      const lastPoint = lastRoutePointRef.current;

      if (!lastPoint) {
        routePointsRef.current.push(point);
        lastRoutePointRef.current = { latitude, longitude };
        return;
      }

      const movedEnough =
        haversineDistanceMeters(lastPoint.latitude, lastPoint.longitude, latitude, longitude) >=
        ROUTE_POINT_MIN_DISTANCE_METERS;

      if (movedEnough) {
        routePointsRef.current.push(point);
        lastRoutePointRef.current = { latitude, longitude };
      }
    },
    []
  );

  const finalizeRoutePoints = useCallback((): TripRoutePoint[] => {
    const points = [...routePointsRef.current];
    const lastPosition = previousPositionRef.current;

    if (!lastPosition) {
      return points;
    }

    const lastStored = points.at(-1);
    const isNewEndPoint =
      !lastStored ||
      lastStored.latitude !== lastPosition.latitude ||
      lastStored.longitude !== lastPosition.longitude;

    if (isNewEndPoint) {
      const lastSpeedMps = speedSamplesMpsRef.current.at(-1) ?? 0;
      points.push({
        latitude: lastPosition.latitude,
        longitude: lastPosition.longitude,
        speed: metersPerSecondToUnit(lastSpeedMps, unitRef.current),
        timestamp: Date.now(),
      });
    }

    return points;
  }, []);

  const handleLocationUpdate = useCallback(
    (location: Location.LocationObject) => {
      const { coords, timestamp } = location;
      const currentPosition: PositionSnapshot = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp,
      };

      if (previousPositionRef.current) {
        distanceRef.current += haversineDistanceMeters(
          previousPositionRef.current.latitude,
          previousPositionRef.current.longitude,
          coords.latitude,
          coords.longitude
        );
      }

      const speedMps = resolveSpeedMps(
        coords.speed,
        previousPositionRef.current,
        currentPosition
      );

      recordRoutePoint(coords.latitude, coords.longitude, speedMps, timestamp);

      previousPositionRef.current = currentPosition;
      speedSamplesMpsRef.current.push(speedMps);
      latestTelemetryRef.current = {
        altitude: coords.altitude,
        heading: coords.heading,
        accuracy: coords.accuracy,
      };

      syncStats();
    },
    [recordRoutePoint, syncStats]
  );

  const beginWatch = useCallback(async () => {
    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      handleLocationUpdate,
      (reason) => setError(reason)
    );
  }, [handleLocationUpdate]);

  const startDurationTimer = useCallback(() => {
    clearDurationTimer();
    durationTimerRef.current = setInterval(syncStats, 1000);
  }, [clearDurationTimer, syncStats]);

  const startTracking = useCallback(async () => {
    setError(null);

    const currentPermission = await Location.getForegroundPermissionsAsync();
    let granted = currentPermission.status === Location.PermissionStatus.GRANTED;

    if (!granted) {
      granted = await requestPermission();
    }

    if (!granted) {
      return;
    }

    await stopSubscription();
    await resetSession();

    const now = Date.now();
    tripStartedAtRef.current = now;
    movingSegmentStartedAtRef.current = now;
    setStatus('tracking');
    startDurationTimer();
    await beginWatch();
  }, [beginWatch, requestPermission, resetSession, startDurationTimer, stopSubscription]);

  const requestPermissionAndStart = useCallback(async () => {
    const granted = await requestPermission();
    if (granted && statusRef.current === 'idle') {
      autoStartAttemptedRef.current = true;
      await startTracking();
    }
    return granted;
  }, [requestPermission, startTracking]);

  useEffect(() => {
    startTrackingRef.current = startTracking;
  }, [startTracking]);

  const pauseTracking = useCallback(async () => {
    if (statusRef.current !== 'tracking') {
      return;
    }

    finalizeMovingSegment();
    await stopSubscription();
    setStatus('paused');
    syncStats();
    setStats((current) => ({ ...current, currentSpeed: 0 }));
  }, [finalizeMovingSegment, stopSubscription, syncStats]);

  const resumeTracking = useCallback(async () => {
    if (statusRef.current !== 'paused') {
      return;
    }

    setError(null);
    movingSegmentStartedAtRef.current = Date.now();
    setStatus('tracking');
    startDurationTimer();
    await beginWatch();
  }, [beginWatch, startDurationTimer]);

  const togglePlayPause = useCallback(async () => {
    if (statusRef.current === 'idle') {
      await startTracking();
      return;
    }

    if (statusRef.current === 'tracking') {
      await pauseTracking();
      return;
    }

    await resumeTracking();
  }, [pauseTracking, resumeTracking, startTracking]);

  const captureTripSnapshot = useCallback((): SavedTrip | null => {
    if (!tripStartedAtRef.current) {
      return null;
    }

    finalizeMovingSegment();
    const snapshotStats = buildStats(
      unitRef.current,
      speedSamplesMpsRef.current,
      distanceRef.current,
      getMovingElapsedSeconds(),
      getTotalElapsedSeconds(),
      latestTelemetryRef.current.altitude,
      latestTelemetryRef.current.heading,
      latestTelemetryRef.current.accuracy
    );

    return {
      id: createTripId(),
      startedAt: tripStartedAtRef.current,
      endedAt: Date.now(),
      unit: unitRef.current,
      maxSpeed: snapshotStats.maxSpeed,
      avgSpeedWithRest: snapshotStats.avgSpeedWithRest,
      avgSpeedWithoutRest: snapshotStats.avgSpeedWithoutRest,
      distanceMeters: snapshotStats.distanceMeters,
      movingDurationSeconds: snapshotStats.movingDurationSeconds,
      totalDurationSeconds: snapshotStats.totalDurationSeconds,
      altitude: snapshotStats.altitude,
      routePoints: finalizeRoutePoints(),
    };
  }, [finalizeMovingSegment, finalizeRoutePoints, getMovingElapsedSeconds, getTotalElapsedSeconds]);

  const stopTracking = useCallback(async () => {
    finalizeMovingSegment();
    await stopSubscription();
    clearDurationTimer();
    setStatus('idle');
    syncStats();
    setStats((current) => ({ ...current, currentSpeed: 0 }));
  }, [clearDurationTimer, finalizeMovingSegment, stopSubscription, syncStats]);

  const finishTrip = useCallback(async () => {
    await stopTracking();
    await resetSession();
  }, [resetSession, stopTracking]);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    let mounted = true;

    void (async () => {
      const currentPermission = await Location.getForegroundPermissionsAsync();
      let granted = currentPermission.status === Location.PermissionStatus.GRANTED;

      if (!granted) {
        const result = await Location.requestForegroundPermissionsAsync();
        granted = result.status === Location.PermissionStatus.GRANTED;
      }

      if (!mounted) {
        return;
      }

      setPermissionGranted(granted);

      if (!granted) {
        setError('Location permission is required to track your speed.');
        return;
      }

      setError(null);

      if (!autoStartAttemptedRef.current && statusRef.current === 'idle') {
        autoStartAttemptedRef.current = true;
        await startTracking();
      }
    })();

    return () => {
      mounted = false;
      clearDurationTimer();
      void stopSubscription();
    };
  }, [clearDurationTimer, startTracking, stopSubscription]);

  return {
    unit,
    setUnit,
    status,
    stats,
    permissionGranted,
    error,
    requestPermission,
    requestPermissionAndStart,
    startTracking,
    pauseTracking,
    resumeTracking,
    togglePlayPause,
    stopTracking,
    finishTrip,
    captureTripSnapshot,
    resetSession,
  };
}
