import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EndTripDialog } from "@/components/speedometer/end-trip-dialog";
import {
  LiveTripMap,
  type LiveTripMapRef,
} from "@/components/speedometer/live-trip-map";
import { PlayPauseButton } from "@/components/speedometer/play-pause-button";
import { SpeedDisplay } from "@/components/speedometer/speed-display";
import {
  MetricSection,
  MetricTable,
} from "@/components/speedometer/stat-metrics";
import { ScreenTopActions } from "@/components/screen-top-actions";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useSpeedometerContext } from "@/contexts/speedometer-context";
import type { SpeedometerStats, TrackingStatus } from "@/hooks/use-speedometer";
import { BRAND } from "@/lib/brand";
import { DISPLAY_FONT } from "@/lib/fonts";
import {
  DEFAULT_MAP_DARK_MODE,
  loadStoredMapDarkMode,
  saveMapDarkMode,
} from "@/lib/theme-storage";
import { saveTrip, type SavedTrip } from "@/lib/trip-storage";
import {
  formatAltitude,
  formatDecimal,
  formatDistance,
  formatDuration,
  formatSpeed,
  getUnitLabel,
  headingToCompassLabel,
  headingToCompassShort,
  type SpeedUnit,
} from "@/lib/speed";

type HomeViewMode = "normal" | "map";

function UnitToggle({
  unit,
  onChange,
}: {
  unit: SpeedUnit;
  onChange: (unit: SpeedUnit) => void;
}) {
  return (
    <View className="flex-row rounded-full border border-primary/15 bg-card p-1">
      {(["kmh", "mph"] as const).map((value) => (
        <Pressable
          key={value}
          onPress={() => onChange(value)}
          className={`rounded-full px-4 py-2 ${unit === value ? "bg-primary" : ""}`}
        >
          <Text
            className={
              unit === value
                ? "font-semibold text-primary-foreground"
                : "text-muted-foreground"
            }
          >
            {getUnitLabel(value)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: HomeViewMode;
  onChange: (mode: HomeViewMode) => void;
}) {
  return (
    <View className="flex-row rounded-full border border-primary/15 bg-card p-1">
      {[
        { value: "map" as const, label: "Map" },
        { value: "normal" as const, label: "Normal" },
      ].map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          className={`rounded-full px-4 py-2 ${mode === option.value ? "bg-primary" : ""}`}
        >
          <Text
            className={
              mode === option.value
                ? "font-semibold text-primary-foreground"
                : "text-muted-foreground"
            }
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PremiumHeader() {
  const router = useRouter();

  return (
    <View className="rounded-md border border-primary/15 bg-card px-4 py-4">
      <Text variant="h3">Aniker Speedometer</Text>
      <Text variant="muted" className="mt-1 text-sm">
        Premium ride analytics for bike, run, and motor.
      </Text>
      <Pressable
        accessibilityRole="link"
        className="mt-2 self-start active:opacity-80"
        onPress={() => router.push("/privacy")}
      >
        <Text className="text-xs font-medium text-primary">Privacy Policy</Text>
      </Pressable>
    </View>
  );
}

type SpeedometerDetailsProps = {
  unit: SpeedUnit;
  setUnit: (unit: SpeedUnit) => void;
  status: TrackingStatus;
  stats: SpeedometerStats;
  permissionGranted: boolean | null;
  backgroundPermissionGranted: boolean;
  error: string | null;
  isTracking: boolean;
  tripActive: boolean;
  requestPermissionAndStart: () => Promise<boolean>;
  togglePlayPause: () => Promise<void>;
  onEndTripPress: () => void | Promise<void>;
  resetSession: () => Promise<void>;
  showHeader?: boolean;
  showSpeedPanel?: boolean;
};

function SpeedometerDetails({
  unit,
  setUnit,
  status,
  stats,
  permissionGranted,
  backgroundPermissionGranted,
  error,
  isTracking,
  tripActive,
  requestPermissionAndStart,
  togglePlayPause,
  onEndTripPress,
  resetSession,
  showHeader = true,
  showSpeedPanel = true,
}: SpeedometerDetailsProps) {
  return (
    <>
      {showHeader ? (
        <View className="gap-4 pt-2">
          <PremiumHeader />
        </View>
      ) : null}

      {permissionGranted !== true ? (
        <View className="mt-4 rounded-md border border-primary/20 bg-card p-4">
          <Text className="font-semibold">Location access needed</Text>
          <Text variant="muted" className="mt-1">
            Tap below to allow location while using the app and in the
            background. Press Start when you are ready to begin a trip.
          </Text>
          <Button
            className="mt-4 rounded-md"
            onPress={() => void requestPermissionAndStart()}
          >
            <Text>Enable Location</Text>
          </Button>
        </View>
      ) : null}

      {permissionGranted === true && !backgroundPermissionGranted ? (
        <View className="mt-4 rounded-md border border-primary/20 bg-card p-4">
          <Text className="font-semibold">Background tracking is off</Text>
          <Text variant="muted" className="mt-1">
            Allow always-on location in settings to keep recording when the
            screen is locked.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 p-4">
          <Text className="text-destructive">{error}</Text>
        </View>
      ) : null}

      {showSpeedPanel && permissionGranted === true ? (
        <>
          <SpeedDisplay
            speed={stats.currentSpeed}
            unit={unit}
            isActive={isTracking}
          />
          <PlayPauseButton
            status={status}
            onPress={() => void togglePlayPause()}
          />
        </>
      ) : null}

      <View className={showSpeedPanel ? "mt-8" : "mt-4"}>
        <MetricSection
          title="Average speed"
          footer="Avg w/ rest includes breaks. Avg moving counts only riding time."
          rows={[
            [
              {
                label: "Avg w/ rest",
                value: formatSpeed(stats.avgSpeedWithRest, unit),
              },
              {
                label: "Avg moving",
                value: formatSpeed(stats.avgSpeedWithoutRest, unit),
              },
            ],
          ]}
        />
      </View>

      <View className="mt-8">
        <MetricTable
          title="Trip metrics"
          metrics={[
            { label: "Max speed", value: formatSpeed(stats.maxSpeed, unit) },
            {
              label: "Distance",
              value: formatDistance(stats.distanceMeters, unit),
            },
            {
              label: "Total time",
              value: formatDuration(stats.totalDurationSeconds),
            },
            {
              label: "Moving time",
              value: formatDuration(stats.movingDurationSeconds),
            },
            {
              label: "Altitude",
              value: formatAltitude(stats.altitude, unit),
            },
          ]}
        />
      </View>

      {stats.accuracy != null ? (
        <Text variant="muted" className="mt-4 text-center text-xs font-medium">
          GPS accuracy ±{formatDecimal(stats.accuracy)} m
        </Text>
      ) : null}

      <View className="mt-8 flex-row gap-3">
        <Button
          className="flex-1"
          disabled={!tripActive}
          onPress={() => void onEndTripPress()}
          size="lg"
        >
          <Text>End trip</Text>
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          disabled={isTracking}
          onPress={() => void resetSession()}
          size="lg"
        >
          <Text>Reset</Text>
        </Button>
      </View>
    </>
  );
}

const MAP_CONTROL_BUTTON_SIZE = 52;
const MAP_CONTROL_ICON_SIZE = 22;

function MapControlButton({
  onPress,
  disabled,
  accessibilityLabel,
  icon,
  tintColor = BRAND.indigo[500],
}: {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  icon: Extract<SymbolViewProps["name"], object>;
  tintColor?: string;
}) {
  return (
    <View
      className="rounded-full p-1"
      style={{
        backgroundColor: `${BRAND.indigo[500]}33`,
        shadowColor: BRAND.display.glow,
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        className="items-center justify-center rounded-full border border-primary/20 bg-card active:opacity-90 disabled:opacity-40"
        style={{
          width: MAP_CONTROL_BUTTON_SIZE,
          height: MAP_CONTROL_BUTTON_SIZE,
        }}
      >
        <SymbolView
          name={{
            ios: icon.ios,
            android: icon.android,
            web: icon.web,
          }}
          size={MAP_CONTROL_ICON_SIZE}
          tintColor={tintColor}
        />
      </Pressable>
    </View>
  );
}

function CenterPositionButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <MapControlButton
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel="Center map on your position"
      icon={{
        ios: "location.fill",
        android: "my_location",
        web: "my_location",
      }}
    />
  );
}

function MapDarkModeToggle({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle: () => void;
}) {
  return (
    <MapControlButton
      onPress={onToggle}
      accessibilityLabel={
        isDark ? "Switch map to light mode" : "Switch map to dark mode"
      }
      tintColor={isDark ? BRAND.indigo[300] : BRAND.indigo[600]}
      icon={{
        ios: isDark ? "sun.max.fill" : "moon.fill",
        android: isDark ? "light_mode" : "dark_mode",
        web: isDark ? "light_mode" : "dark_mode",
      }}
    />
  );
}

function MapFixedPointer() {
  return (
    <View
      className="absolute inset-0 items-center justify-center"
      pointerEvents="none"
    >
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: 36,
          height: 36,
          shadowColor: BRAND.display.glow,
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <SymbolView
          name={{
            ios: "location.north.fill",
            android: "navigation",
            web: "navigation",
          }}
          size={30}
          tintColor={BRAND.indigo[500]}
        />
      </View>
    </View>
  );
}

function MapModePanel({
  unit,
  stats,
  status,
  isTracking,
  tripActive,
  heading,
  onTogglePlayPause,
  onEndTripPress,
  onResetSession,
}: {
  unit: SpeedUnit;
  stats: SpeedometerStats;
  status: TrackingStatus;
  isTracking: boolean;
  tripActive: boolean;
  heading: number | null;
  onTogglePlayPause: () => Promise<void>;
  onEndTripPress: () => void | Promise<void>;
  onResetSession: () => void | Promise<void>;
}) {
  const facingLabel = headingToCompassLabel(heading);
  const facingShort = headingToCompassShort(heading);

  const displaySpeed = formatSpeed(stats.currentSpeed, unit);

  return (
    <View className="rounded-md border border-primary/20 bg-card p-3">
      <View className="flex-row items-center gap-4 py-1">
        <Text
          style={{
            fontSize: 96,
            lineHeight: 100,
            fontFamily: DISPLAY_FONT.extraBold,
            fontVariant: ["tabular-nums"],
            letterSpacing: -3,
            color: BRAND.indigo[500],
          }}
        >
          {displaySpeed}
        </Text>
        <View className="min-w-0 flex-1 justify-center">
          <Text
            className="text-xl font-bold uppercase text-primary"
            style={{ color: BRAND.indigo[400] }}
          >
            {getUnitLabel(unit)}
          </Text>
          {heading != null ? (
            <Text className="mt-1 text-sm font-semibold text-primary">
              {facingLabel} ({facingShort})
            </Text>
          ) : null}
        </View>
      </View>

      <View className="mt-2 flex-row gap-2">
        <View className="flex-1 rounded-sm bg-primary/5 px-2 py-1.5">
          <Text variant="muted" className="text-[9px] uppercase">
            Max speed
          </Text>
          <Text className="text-sm font-semibold">
            {formatSpeed(stats.maxSpeed, unit)}
          </Text>
        </View>
        <View className="flex-1 rounded-sm bg-primary/5 px-2 py-1.5">
          <Text variant="muted" className="text-[9px] uppercase">
            Avg speed
          </Text>
          <Text className="text-sm font-semibold">
            {formatSpeed(stats.avgSpeedWithRest, unit)}
          </Text>
        </View>
        <View className="flex-1 rounded-sm bg-primary/5 px-2 py-1.5">
          <Text variant="muted" className="text-[9px] uppercase">
            Distance
          </Text>
          <Text className="text-sm font-semibold">
            {formatDistance(stats.distanceMeters, unit)}
          </Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <PlayPauseButton
          compact
          showLabel={false}
          status={status}
          onPress={() => void onTogglePlayPause()}
        />
        <Button
          className="flex-1 rounded-md"
          disabled={!tripActive}
          onPress={() => void onEndTripPress()}
          size="lg"
        >
          <Text>End trip</Text>
        </Button>
        <Button
          className="flex-1 rounded-md"
          variant="outline"
          disabled={isTracking}
          onPress={() => void onResetSession()}
          size="lg"
        >
          <Text>Reset</Text>
        </Button>
      </View>
    </View>
  );
}

export function SpeedometerScreen() {
  const {
    unit,
    setUnit,
    status,
    stats,
    permissionGranted,
    backgroundPermissionGranted,
    error,
    liveRoutePoints,
    currentPosition,
    requestPermissionAndStart,
    togglePlayPause,
    pauseTracking,
    captureTripSnapshot,
    finishTrip,
    resetSession,
  } = useSpeedometerContext();

  const [viewMode, setViewMode] = useState<HomeViewMode>("map");
  const [endTripDialogVisible, setEndTripDialogVisible] = useState(false);
  const [pendingTrip, setPendingTrip] = useState<SavedTrip | null>(null);
  const [mapDarkMode, setMapDarkMode] = useState(DEFAULT_MAP_DARK_MODE);
  const [mapThemeReady, setMapThemeReady] = useState(false);
  const [isMapFollowingUser, setIsMapFollowingUser] = useState(true);
  const liveTripMapRef = useRef<LiveTripMapRef>(null);

  useEffect(() => {
    void (async () => {
      const savedMapDarkMode = await loadStoredMapDarkMode();
      if (savedMapDarkMode !== null) {
        setMapDarkMode(savedMapDarkMode);
      }
      setMapThemeReady(true);
    })();
  }, []);

  const handleMapDarkModeToggle = () => {
    setMapDarkMode((current) => {
      const next = !current;
      void saveMapDarkMode(next);
      return next;
    });
  };

  const handleCenterMapOnPosition = () => {
    liveTripMapRef.current?.centerOnPosition();
    setIsMapFollowingUser(true);
  };

  const handleViewModeChange = (mode: HomeViewMode) => {
    if (mode === "map") {
      setIsMapFollowingUser(true);
    }
    setViewMode(mode);
  };

  const handleMapReady = useCallback(() => {
    liveTripMapRef.current?.enableFollowing();

    if (currentPosition) {
      liveTripMapRef.current?.centerOnPosition();
    }
  }, [currentPosition]);

  const isTracking = status === "tracking";
  const tripActive = status !== "idle";

  const handleEndTripPress = async () => {
    if (status === "tracking") {
      await pauseTracking();
    }

    const snapshot = captureTripSnapshot();
    if (!snapshot) {
      await finishTrip();
      return;
    }

    setPendingTrip(snapshot);
    setEndTripDialogVisible(true);
  };

  const handleSaveTrip = async () => {
    if (pendingTrip) {
      await saveTrip(pendingTrip);
    }

    setEndTripDialogVisible(false);
    setPendingTrip(null);
    await finishTrip();
  };

  const handleDiscardTrip = async () => {
    setEndTripDialogVisible(false);
    setPendingTrip(null);
    await finishTrip();
  };

  const detailsProps: SpeedometerDetailsProps = {
    unit,
    setUnit,
    status,
    stats,
    permissionGranted,
    backgroundPermissionGranted,
    error,
    isTracking,
    tripActive,
    requestPermissionAndStart,
    togglePlayPause,
    onEndTripPress: handleEndTripPress,
    resetSession,
  };

  return (
    <>
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-5 pt-2">
          <ViewModeToggle mode={viewMode} onChange={handleViewModeChange} />
          <ScreenTopActions>
            <UnitToggle unit={unit} onChange={setUnit} />
          </ScreenTopActions>
        </View>

        {viewMode === "normal" ? (
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-10"
            showsVerticalScrollIndicator={false}
          >
            <SpeedometerDetails {...detailsProps} />
          </ScrollView>
        ) : (
          <View className="flex-1 px-5 pb-4 pt-3">
            {permissionGranted !== true ? (
              <>
                <View className="rounded-md border border-primary/20 bg-card p-4">
                  <Text className="font-semibold">Location access needed</Text>
                  <Text variant="muted" className="mt-1">
                    Enable location to show your live map and route.
                  </Text>
                  <Button
                    className="mt-4 rounded-md"
                    onPress={() => void requestPermissionAndStart()}
                  >
                    <Text>Enable Location</Text>
                  </Button>
                </View>
                <View className="mt-3 flex-row gap-3">
                  <Button
                    className="flex-1"
                    disabled={!tripActive}
                    onPress={() => void handleEndTripPress()}
                    size="lg"
                  >
                    <Text>End trip</Text>
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    disabled={isTracking}
                    onPress={() => void resetSession()}
                    size="lg"
                  >
                    <Text>Reset</Text>
                  </Button>
                </View>
              </>
            ) : (
              <View className="flex-1 gap-3">
                {mapThemeReady ? (
                  <View className="relative min-h-0 flex-1">
                    <LiveTripMap
                      ref={liveTripMapRef}
                      routePoints={liveRoutePoints}
                      currentPosition={currentPosition}
                      darkMode={mapDarkMode}
                      onReady={handleMapReady}
                      onFollowingChange={setIsMapFollowingUser}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        backgroundColor: mapDarkMode ? "#1A1A2E" : "#EEF2FF",
                      }}
                    />
                    <View
                      className="absolute right-3 top-3"
                      pointerEvents="box-none"
                    >
                      <MapDarkModeToggle
                        isDark={mapDarkMode}
                        onToggle={handleMapDarkModeToggle}
                      />
                    </View>
                    {!isMapFollowingUser ? (
                      <View
                        className="absolute bottom-3 right-3"
                        pointerEvents="box-none"
                      >
                        <CenterPositionButton
                          disabled={currentPosition == null}
                          onPress={handleCenterMapOnPosition}
                        />
                      </View>
                    ) : null}
                    {isMapFollowingUser ? <MapFixedPointer /> : null}
                  </View>
                ) : (
                  <View className="min-h-0 flex-1 items-center justify-center rounded-md border border-primary/20 bg-card">
                    <Text variant="muted">Loading map...</Text>
                  </View>
                )}

                <MapModePanel
                  unit={unit}
                  stats={stats}
                  status={status}
                  isTracking={isTracking}
                  tripActive={tripActive}
                  heading={currentPosition?.heading ?? null}
                  onTogglePlayPause={togglePlayPause}
                  onEndTripPress={handleEndTripPress}
                  onResetSession={resetSession}
                />
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
      <EndTripDialog
        visible={endTripDialogVisible}
        trip={pendingTrip}
        onSave={() => void handleSaveTrip()}
        onDiscard={() => void handleDiscardTrip()}
      />
    </>
  );
}
