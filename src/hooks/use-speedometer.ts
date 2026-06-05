import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import {
  BACKGROUND_LOCATION_TASK,
  setBackgroundLocationHandler,
} from '@/lib/background-location-task';
import {
  averageSpeedFromDistance,
  bearingDegrees,
  haversineDistanceMeters,
  metersPerSecondToUnit,
  resolveSpeedMps,
  smoothHeading,
  type SpeedUnit,
} from '@/lib/speed';
import { createTripId, type SavedTrip, type TripRoutePoint } from '@/lib/trip-storage';

const ROUTE_POINT_MIN_DISTANCE_METERS = 8;

const LOCATION_UPDATE_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 2000,
  distanceInterval: 5,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: 'Aniker Speedometer',
    notificationBody: 'Recording your trip in the background',
    notificationColor: '#4F46E5',
  },
};

function supportsBackgroundLocationUpdates() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

async function hasBackgroundLocationTaskStarted() {
  if (!supportsBackgroundLocationUpdates()) {
    return false;
  }

  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch {
    return false;
  }
}

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
  accuracy: number | null;
};

export type LivePosition = {
  latitude: number;
  longitude: number;
  heading: number | null;
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
    accuracy,
  };
}

export function useSpeedometer() {
  const [unit, setUnit] = useState<SpeedUnit>('kmh');
  const [status, setStatus] = useState<TrackingStatus>('idle');
  const [stats, setStats] = useState<SpeedometerStats>(INITIAL_STATS);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [backgroundPermissionGranted, setBackgroundPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveRoutePoints, setLiveRoutePoints] = useState<TripRoutePoint[]>([]);
  const [currentPosition, setCurrentPosition] = useState<LivePosition | null>(null);
  const [tripStartPosition, setTripStartPosition] = useState<LivePosition | null>(null);

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
    accuracy: null as number | null,
  });
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const foregroundSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const headingSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const currentHeadingRef = useRef<number | null>(null);
  const unitRef = useRef(unit);
  const statusRef = useRef(status);
  const autoStartAttemptedRef = useRef(false);
  const hasInitializedRef = useRef(false);

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

  const syncLiveRouteState = useCallback(() => {
    setLiveRoutePoints([...routePointsRef.current]);

    const lastPoint = previousPositionRef.current;
    if (lastPoint) {
      setCurrentPosition({
        latitude: lastPoint.latitude,
        longitude: lastPoint.longitude,
        heading: currentHeadingRef.current,
      });
    }
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
        latestTelemetryRef.current.accuracy
      )
    );
    syncLiveRouteState();
  }, [getMovingElapsedSeconds, getTotalElapsedSeconds, syncLiveRouteState]);

  const finalizeMovingSegment = useCallback(() => {
    if (movingSegmentStartedAtRef.current) {
      accumulatedMovingDurationRef.current +=
        (Date.now() - movingSegmentStartedAtRef.current) / 1000;
      movingSegmentStartedAtRef.current = null;
    }
  }, []);

  const stopLocationUpdates = useCallback(async () => {
    if (foregroundSubscriptionRef.current) {
      foregroundSubscriptionRef.current.remove();
      foregroundSubscriptionRef.current = null;
    }

    if (headingSubscriptionRef.current) {
      headingSubscriptionRef.current.remove();
      headingSubscriptionRef.current = null;
    }

    if (!supportsBackgroundLocationUpdates()) {
      return;
    }

    const hasStarted = await hasBackgroundLocationTaskStarted();
    if (hasStarted) {
      try {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      } catch {
        // Background location APIs may be unavailable in some dev environments.
      }
    }
  }, []);

  const resetSession = useCallback(async () => {
    finalizeMovingSegment();
    await stopLocationUpdates();
    clearDurationTimer();
    previousPositionRef.current = null;
    tripStartedAtRef.current = null;
    accumulatedMovingDurationRef.current = 0;
    movingSegmentStartedAtRef.current = null;
    distanceRef.current = 0;
    speedSamplesMpsRef.current = [];
    routePointsRef.current = [];
    lastRoutePointRef.current = null;
    latestTelemetryRef.current = { altitude: null, accuracy: null };
    currentHeadingRef.current = null;
    setStats(INITIAL_STATS);
    setLiveRoutePoints([]);
    setCurrentPosition(null);
    setTripStartPosition(null);
    setError(null);
    setStatus('idle');
  }, [clearDurationTimer, finalizeMovingSegment, stopLocationUpdates]);

  const requestPermission = useCallback(async () => {
    const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
    const granted = permissionStatus === Location.PermissionStatus.GRANTED;
    setPermissionGranted(granted);

    if (!granted) {
      setError('Location permission is required to track your speed.');
      return false;
    }

    const backgroundPermission = await Location.getBackgroundPermissionsAsync();
    let backgroundGranted =
      backgroundPermission.status === Location.PermissionStatus.GRANTED;

    if (!backgroundGranted) {
      const requested = await Location.requestBackgroundPermissionsAsync();
      backgroundGranted = requested.status === Location.PermissionStatus.GRANTED;
    }

    setBackgroundPermissionGranted(backgroundGranted);
    setError(
      backgroundGranted
        ? null
        : 'Background location is off. Tracking may pause when the phone is locked.',
    );

    return true;
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
        setTripStartPosition({ latitude, longitude });
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
      if (statusRef.current !== 'tracking') {
        return;
      }

      const { coords, timestamp } = location;
      const currentPositionSnapshot: PositionSnapshot = {
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
        currentPositionSnapshot
      );

      let heading: number | null = null;
      if (coords.heading != null && coords.heading >= 0) {
        heading = coords.heading;
      } else if (previousPositionRef.current) {
        const previous = previousPositionRef.current;
        const movedMeters = haversineDistanceMeters(
          previous.latitude,
          previous.longitude,
          coords.latitude,
          coords.longitude
        );

        if (movedMeters >= 5) {
          heading = bearingDegrees(
            previous.latitude,
            previous.longitude,
            coords.latitude,
            coords.longitude
          );
        }
      }

      if (heading != null) {
        currentHeadingRef.current = smoothHeading(currentHeadingRef.current, heading, {
          deadZoneDegrees: 8,
          alpha: 0.3,
        });
      }

      recordRoutePoint(coords.latitude, coords.longitude, speedMps, timestamp);

      previousPositionRef.current = currentPositionSnapshot;
      speedSamplesMpsRef.current.push(speedMps);
      latestTelemetryRef.current = {
        altitude: coords.altitude,
        accuracy: coords.accuracy,
      };

      syncStats();
    },
    [recordRoutePoint, syncStats]
  );

  const beginLocationUpdates = useCallback(async () => {
    let usingBackgroundUpdates = false;

    if (supportsBackgroundLocationUpdates()) {
      const hasStarted = await hasBackgroundLocationTaskStarted();
      if (hasStarted) {
        usingBackgroundUpdates = true;
      } else {
        try {
          await Location.startLocationUpdatesAsync(
            BACKGROUND_LOCATION_TASK,
            LOCATION_UPDATE_OPTIONS
          );
          usingBackgroundUpdates = true;
        } catch {
          // Fall through to foreground watching when background APIs fail.
        }
      }
    }

    if (!usingBackgroundUpdates && !foregroundSubscriptionRef.current) {
      foregroundSubscriptionRef.current = await Location.watchPositionAsync(
        LOCATION_UPDATE_OPTIONS,
        handleLocationUpdate,
        (message) => setError(message)
      );
    }

    if (!headingSubscriptionRef.current) {
      try {
        headingSubscriptionRef.current = await Location.watchHeadingAsync((headingData) => {
          if (statusRef.current !== 'tracking') {
            return;
          }

          const speedMps = speedSamplesMpsRef.current.at(-1) ?? 0;
          if (speedMps > 1.2) {
            return;
          }

          const resolvedHeading =
            headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;

          if (resolvedHeading < 0) {
            return;
          }

          const nextHeading = smoothHeading(currentHeadingRef.current, resolvedHeading, {
            deadZoneDegrees: 10,
            alpha: 0.2,
          });

          if (currentHeadingRef.current === nextHeading) {
            return;
          }

          currentHeadingRef.current = nextHeading;
          syncLiveRouteState();
        });
      } catch {
        // Compass heading is unavailable on some platforms.
      }
    }
  }, [handleLocationUpdate, syncLiveRouteState]);

  const startDurationTimer = useCallback(() => {
    clearDurationTimer();
    durationTimerRef.current = setInterval(syncStats, 1000);
  }, [clearDurationTimer, syncStats]);

  const startTracking = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      return;
    }

    await stopLocationUpdates();
    await resetSession();

    const now = Date.now();
    tripStartedAtRef.current = now;
    movingSegmentStartedAtRef.current = now;
    setStatus('tracking');
    startDurationTimer();
    await beginLocationUpdates();
  }, [beginLocationUpdates, requestPermission, resetSession, startDurationTimer, stopLocationUpdates]);

  const requestPermissionAndStart = useCallback(async () => {
    const granted = await requestPermission();
    if (granted && statusRef.current === 'idle') {
      autoStartAttemptedRef.current = true;
      await startTracking();
    }
    return granted;
  }, [requestPermission, startTracking]);

  const pauseTracking = useCallback(async () => {
    if (statusRef.current !== 'tracking') {
      return;
    }

    finalizeMovingSegment();
    await stopLocationUpdates();
    setStatus('paused');
    syncStats();
    setStats((current) => ({ ...current, currentSpeed: 0 }));
  }, [finalizeMovingSegment, stopLocationUpdates, syncStats]);

  const resumeTracking = useCallback(async () => {
    if (statusRef.current !== 'paused') {
      return;
    }

    setError(null);
    movingSegmentStartedAtRef.current = Date.now();
    setStatus('tracking');
    startDurationTimer();
    await beginLocationUpdates();
  }, [beginLocationUpdates, startDurationTimer]);

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
    await stopLocationUpdates();
    clearDurationTimer();
    setStatus('idle');
    syncStats();
    setStats((current) => ({ ...current, currentSpeed: 0 }));
  }, [clearDurationTimer, finalizeMovingSegment, stopLocationUpdates, syncStats]);

  const finishTrip = useCallback(async () => {
    await stopTracking();
    await resetSession();
  }, [resetSession, stopTracking]);

  useEffect(() => {
    setBackgroundLocationHandler(handleLocationUpdate);

    return () => {
      setBackgroundLocationHandler(null);
    };
  }, [handleLocationUpdate]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && statusRef.current === 'tracking') {
        syncStats();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [syncStats]);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    let mounted = true;

    void (async () => {
      const currentPermission = await Location.getForegroundPermissionsAsync();
      const granted = currentPermission.status === Location.PermissionStatus.GRANTED;
      const backgroundPermission = await Location.getBackgroundPermissionsAsync();

      if (!mounted) {
        return;
      }

      setPermissionGranted(
        currentPermission.status === Location.PermissionStatus.UNDETERMINED
          ? null
          : granted,
      );
      setBackgroundPermissionGranted(
        backgroundPermission.status === Location.PermissionStatus.GRANTED,
      );

      if (!granted) {
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
      void stopLocationUpdates();
    };
  }, [clearDurationTimer, startTracking, stopLocationUpdates]);

  return {
    unit,
    setUnit,
    status,
    stats,
    permissionGranted,
    backgroundPermissionGranted,
    error,
    liveRoutePoints,
    currentPosition,
    tripStartPosition,
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
