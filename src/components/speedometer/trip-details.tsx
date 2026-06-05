import { View } from "react-native";

import {
  MetricSection,
  MetricTable,
} from "@/components/speedometer/stat-metrics";
import { Text } from "@/components/ui/text";
import {
  formatTripDateTime,
  formatTripTimeRange,
  getTripSummary,
} from "@/lib/trip-format";
import type { SavedTrip } from "@/lib/trip-storage";

type TripDetailsProps = {
  trip: SavedTrip;
};

export function TripDetails({ trip }: TripDetailsProps) {
  const summary = getTripSummary(trip);

  return (
    <View className="gap-8">
      <View>
        <Text className="text-[11px] font-semibold uppercase text-primary">
          Trip record
        </Text>
        <Text variant="h3" className="mt-2">
          {formatTripDateTime(trip.endedAt)}
        </Text>
        <Text variant="muted" className="mt-1">
          {formatTripTimeRange(trip)} · {summary.unitLabel}
        </Text>
      </View>

      <MetricSection
        title="Average speed"
        rows={[
          [
            {
              label: "Avg w/ rest",
              value: `${summary.avgWithRest} ${summary.unitLabel}`,
            },
            {
              label: "Avg moving",
              value: `${summary.avgMoving} ${summary.unitLabel}`,
            },
          ],
        ]}
      />

      <MetricTable
        title="Trip metrics"
        metrics={[
          {
            label: "Max speed",
            value: `${summary.maxSpeed} ${summary.unitLabel}`,
          },
          { label: "Distance", value: summary.distance },
          { label: "Total time", value: summary.totalTime },
          { label: "Moving time", value: summary.movingTime },
          { label: "Altitude", value: summary.altitude },
        ]}
      />
    </View>
  );
}
