import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EndTripDialog } from "@/components/speedometer/end-trip-dialog";
import { PlayPauseButton } from "@/components/speedometer/play-pause-button";
import { SpeedDisplay } from "@/components/speedometer/speed-display";
import {
  MetricSection,
  MetricTable,
} from "@/components/speedometer/stat-metrics";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useSpeedometerContext } from "@/contexts/speedometer-context";
import type { SpeedometerStats, TrackingStatus } from "@/hooks/use-speedometer";
import { saveTrip, type SavedTrip } from "@/lib/trip-storage";
import {
  formatAltitude,
  formatDecimal,
  formatDistance,
  formatDuration,
  formatHeading,
  formatSpeed,
  getUnitLabel,
  type SpeedUnit,
} from "@/lib/speed";

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

function PremiumHeader() {
  return (
    <View className="rounded-lg border border-primary/15 bg-card px-4 py-4">
      <Text variant="h3">Aniker Speedometer</Text>
      <Text variant="muted" className="mt-1 text-sm">
        Premium ride analytics for bike, run, and motor.
      </Text>
    </View>
  );
}

type SpeedometerDetailsProps = {
  unit: SpeedUnit;
  setUnit: (unit: SpeedUnit) => void;
  status: TrackingStatus;
  stats: SpeedometerStats;
  permissionGranted: boolean | null;
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
          <View className="flex-row items-center justify-end gap-2">
            <UnitToggle unit={unit} onChange={setUnit} />
            <ThemeToggle />
          </View>
        </View>
      ) : null}

      {permissionGranted === false ? (
        <View className="mt-4 rounded-3xl border border-destructive/25 bg-destructive/10 p-4">
          <Text className="font-semibold">Location access needed</Text>
          <Text variant="muted" className="mt-1">
            Allow location permission so the app can read GPS speed from your
            phone.
          </Text>
          <Button
            className="mt-4 rounded-2xl"
            onPress={() => void requestPermissionAndStart()}
          >
            <Text>Enable Location</Text>
          </Button>
        </View>
      ) : null}

      {error ? (
        <View className="mt-4 rounded-3xl border border-destructive/25 bg-destructive/10 p-4">
          <Text className="text-destructive">{error}</Text>
        </View>
      ) : null}

      {showSpeedPanel ? (
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
            { label: "Heading", value: formatHeading(stats.heading) },
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

export function SpeedometerScreen() {
  const {
    unit,
    setUnit,
    status,
    stats,
    permissionGranted,
    error,
    requestPermissionAndStart,
    togglePlayPause,
    pauseTracking,
    captureTripSnapshot,
    finishTrip,
    resetSession,
  } = useSpeedometerContext();

  const [endTripDialogVisible, setEndTripDialogVisible] = useState(false);
  const [pendingTrip, setPendingTrip] = useState<SavedTrip | null>(null);

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
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-10"
          showsVerticalScrollIndicator={false}
        >
          <SpeedometerDetails {...detailsProps} />
        </ScrollView>
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
