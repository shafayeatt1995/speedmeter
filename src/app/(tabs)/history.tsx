import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeleteTripDialog } from "@/components/delete-trip-dialog";
import { ScreenTopActions } from "@/components/screen-top-actions";
import { Text } from "@/components/ui/text";
import { BRAND } from "@/lib/brand";
import { formatTripDateTime, getTripSummary } from "@/lib/trip-format";
import { deleteTrip, getSavedTrips, type SavedTrip } from "@/lib/trip-storage";

function TripHistoryCard({
  trip,
  onDeletePress,
}: {
  trip: SavedTrip;
  onDeletePress: (trip: SavedTrip) => void;
}) {
  const summary = getTripSummary(trip);

  return (
    <View className="rounded-md border border-primary/15 bg-card p-4">
      <View className="flex-row items-start gap-3">
        <Pressable
          onPress={() => router.push(`/history/${trip.id}`)}
          className="min-w-0 flex-1 active:opacity-90"
        >
          <Text className="text-[10px] font-bold uppercase text-primary">
            Saved trip
          </Text>
          <Text className="mt-2 text-lg font-semibold">
            {formatTripDateTime(trip.endedAt)}
          </Text>
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-sm bg-primary/5 px-3 py-2">
              <Text variant="muted" className="text-[10px] uppercase">
                Distance
              </Text>
              <Text className="mt-1 font-semibold">{summary.distance}</Text>
            </View>
            <View className="flex-1 rounded-sm bg-primary/5 px-3 py-2">
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

        <Pressable
          onPress={() => onDeletePress(trip)}
          accessibilityRole="button"
          accessibilityLabel={`Delete trip from ${formatTripDateTime(trip.endedAt)}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="rounded-full border text-destructive border-destructive/20 bg-destructive/10 p-2.5 active:opacity-80"
        >
          <SymbolView
            name={{
              ios: "trash.fill",
              android: "delete",
              web: "delete",
            }}
            size={18}
            tintColor={BRAND.destructive[500]}
          />
        </Pressable>
      </View>
    </View>
  );
}

export default function TripHistoryScreen() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripToDelete, setTripToDelete] = useState<SavedTrip | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleConfirmDelete = async () => {
    if (!tripToDelete || deleting) {
      return;
    }

    setDeleting(true);
    await deleteTrip(tripToDelete.id);
    setTripToDelete(null);
    setDeleting(false);
    await loadTrips();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center justify-end px-5 pt-2">
        <ScreenTopActions />
      </View>
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
            Tap a trip to see full details, or use the delete button to remove
            it.
          </Text>
        </View>

        {loading ? (
          <View className="mt-16 items-center">
            <ActivityIndicator />
          </View>
        ) : trips.length === 0 ? (
          <View className="mt-10 rounded-md border border-primary/15 bg-card p-6">
            <Text className="font-semibold">No saved trips yet</Text>
            <Text variant="muted" className="mt-2">
              End a trip on Home and tap Save trip to keep your ride on this
              device.
            </Text>
          </View>
        ) : (
          <View className="mt-6 gap-4">
            {trips.map((trip) => (
              <TripHistoryCard
                key={trip.id}
                trip={trip}
                onDeletePress={setTripToDelete}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <DeleteTripDialog
        visible={tripToDelete != null}
        trip={tripToDelete}
        onCancel={() => {
          if (!deleting) {
            setTripToDelete(null);
          }
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </SafeAreaView>
  );
}
