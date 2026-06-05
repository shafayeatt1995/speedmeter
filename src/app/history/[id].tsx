import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeleteTripDialog } from '@/components/delete-trip-dialog';
import { ScreenTopActions } from '@/components/screen-top-actions';
import { TripDetails } from '@/components/speedometer/trip-details';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { deleteTrip, getSavedTrip, tripHasRoute, type SavedTrip } from '@/lib/trip-storage';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      const savedTrip = await getSavedTrip(id);
      setTrip(savedTrip);
      setLoading(false);
    })();
  }, [id]);

  const handleConfirmDelete = async () => {
    if (!trip || deleting) {
      return;
    }

    setDeleting(true);
    await deleteTrip(trip.id);
    setDeleting(false);
    setDeleteDialogVisible(false);
    router.replace('/history');
  };

  const handleReplayTrip = () => {
    if (!trip) {
      return;
    }

    router.push(`/history/replay/${trip.id}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between pt-2">
          <Pressable
            onPress={() => router.back()}
            className="rounded-full border border-primary/20 bg-card px-4 py-2">
            <Text className="font-semibold text-primary">Back</Text>
          </Pressable>
          <ScreenTopActions />
        </View>
        <Text variant="h3" className="mt-4">
          Trip details
        </Text>

        {loading ? (
          <View className="mt-16 items-center">
            <ActivityIndicator />
          </View>
        ) : !trip ? (
          <View className="mt-10 rounded-md border border-destructive/25 bg-destructive/10 p-6">
            <Text className="font-semibold">Trip not found</Text>
            <Button className="mt-4" onPress={() => router.replace('/history')}>
              <Text>Go to history</Text>
            </Button>
          </View>
        ) : (
          <View className="mt-6">
            <TripDetails trip={trip} />
            <View className="mt-8 gap-3">
              <Button
                disabled={!tripHasRoute(trip)}
                onPress={handleReplayTrip}>
                <Text>Replay trip</Text>
              </Button>
              {!tripHasRoute(trip) ? (
                <Text variant="muted" className="text-center text-xs">
                  Replay is available for trips saved with route data. Record a new trip to try it.
                </Text>
              ) : (
                <Text variant="muted" className="text-center text-xs">
                  Watch your ride on a free map with speed at each point. Use + and − to adjust replay speed.
                </Text>
              )}
              <Button
                variant="destructive"
                onPress={() => setDeleteDialogVisible(true)}>
                <Text>Delete trip</Text>
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

      <DeleteTripDialog
        visible={deleteDialogVisible}
        trip={trip}
        onCancel={() => {
          if (!deleting) {
            setDeleteDialogVisible(false);
          }
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </SafeAreaView>
  );
}
