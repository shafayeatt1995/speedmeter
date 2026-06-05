import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  clampPlaybackRate,
  getReplayDurationMs,
  getReplayFrame,
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  normalizeRoutePoints,
} from '@/lib/trip-replay';
import type { SavedTrip } from '@/lib/trip-storage';

const TICK_MS = 50;

export function useTripReplay(trip: SavedTrip) {
  const points = useMemo(() => normalizeRoutePoints(trip), [trip]);
  const durationMs = useMemo(() => getReplayDurationMs(points), [points]);

  const [progressMs, setProgressMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const progressRef = useRef(0);

  useEffect(() => {
    progressRef.current = progressMs;
  }, [progressMs]);

  useEffect(() => {
    if (!isPlaying || durationMs <= 0) {
      return;
    }

    const interval = setInterval(() => {
      const next = progressRef.current + TICK_MS * playbackRate;

      if (next >= durationMs) {
        progressRef.current = durationMs;
        setProgressMs(durationMs);
        setIsPlaying(false);
        return;
      }

      progressRef.current = next;
      setProgressMs(next);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [durationMs, isPlaying, playbackRate]);

  const frame = useMemo(() => getReplayFrame(points, progressMs), [points, progressMs]);

  const play = useCallback(() => {
    if (durationMs <= 0) {
      return;
    }

    if (progressRef.current >= durationMs) {
      progressRef.current = 0;
      setProgressMs(0);
    }

    setIsPlaying(true);
  }, [durationMs]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
      return;
    }

    play();
  }, [isPlaying, pause, play]);

  const seek = useCallback(
    (nextProgressMs: number) => {
      const clamped = Math.min(Math.max(nextProgressMs, 0), durationMs);
      progressRef.current = clamped;
      setProgressMs(clamped);

      if (clamped >= durationMs) {
        setIsPlaying(false);
      }
    },
    [durationMs]
  );

  const restart = useCallback(() => {
    progressRef.current = 0;
    setProgressMs(0);
    setIsPlaying(true);
  }, []);

  const decreasePlaybackRate = useCallback(() => {
    setPlaybackRate((rate) => clampPlaybackRate(rate - 1));
  }, []);

  const increasePlaybackRate = useCallback(() => {
    setPlaybackRate((rate) => clampPlaybackRate(rate + 1));
  }, []);

  return {
    points,
    durationMs,
    progressMs,
    frame,
    isPlaying,
    playbackRate,
    minPlaybackRate: MIN_PLAYBACK_RATE,
    maxPlaybackRate: MAX_PLAYBACK_RATE,
    decreasePlaybackRate,
    increasePlaybackRate,
    togglePlay,
    play,
    pause,
    seek,
    restart,
  };
}
