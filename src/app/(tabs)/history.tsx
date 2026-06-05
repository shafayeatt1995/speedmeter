import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Text } from "@/components/ui/text";
import { formatTripDateTime, getTripSummary } from "@/lib/trip-format";
import { getSavedTrips, type SavedTrip } from "@/lib/trip-storage";

function TripHistoryCard({ trip }: { trip: SavedTrip }) {
  const summary = getTripSummary(trip);

  return (
    <Pressable
      onPress={() => router.push(`/history/${trip.id}`)}
      className="rounded-3xl border border-primary/15 bg-card p-4 active:opacity-90"
    >
      <Text className="text-[10px] font-bold uppercase text-primary">
        Saved trip
      </Text>
      <Text className="mt-2 text-lg font-semibold">
        {formatTripDateTime(trip.endedAt)}
      </Text>
      <View className="mt-4 flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-primary/5 px-3 py-2">
          <Text variant="muted" className="text-[10px] uppercase">
            Distance
          </Text>
          <Text className="mt-1 font-semibold">{summary.distance}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-primary/5 px-3 py-2">
          <Text variant="muted" className="text-[10px] uppercase">
            Max speed
          </Text>
          <Text className="mt-1 font-semibold">
            {summary.maxSpeed} {summary.unitLabel}
          </Text>
        </View>
      </View>
      <Text variant="muted" className="mt-3 text-xs">
        Moving {summary.movingTime} · Total {summary.totalTime}
      </Text>
    </Pressable>
  );
}

export default function TripHistoryScreen() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    const savedTrips = await getSavedTrips();
    setTrips(savedTrips);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTrips();
    }, [loadTrips]),
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-6 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text className="text-[10px] font-bold uppercase text-primary">
            Trip history
          </Text>
          <Text variant="h3" className="mt-1">
            Previous rides
          </Text>
          <Text variant="muted" className="mt-1 text-sm">
            Tap a trip to see full details.
          </Text>
        </View>

        {loading ? (
          <View className="mt-16 items-center">
            <ActivityIndicator />
          </View>
        ) : trips.length === 0 ? (
          <View className="mt-10 rounded-3xl border border-primary/15 bg-card p-6">
            <Text className="font-semibold">No saved trips yet</Text>
            <Text variant="muted" className="mt-2">
              End a trip on Home and tap Save trip to keep your ride on this
              device.
            </Text>
          </View>
        ) : (
          <View className="mt-6 gap-4">
            {trips.map((trip) => (
              <TripHistoryCard key={trip.id} trip={trip} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
