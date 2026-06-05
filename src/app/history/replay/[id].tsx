import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TripReplayPlayer } from '@/components/trip-replay/trip-replay-player';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { getSavedTrip, tripHasRoute, type SavedTrip } from '@/lib/trip-storage';

function subscribeToClient() {
  return () => {};
}

export default function TripReplayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<SavedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const isClient = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );

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

  if (loading || !isClient) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!trip || !tripHasRoute(trip)) {
    return (
      <SafeAreaView className="flex-1 bg-background px-5">
        <View className="flex-1 items-center justify-center">
          <Text className="font-semibold">Replay not available</Text>
          <Text variant="muted" className="mt-2 text-center">
            This trip has no saved route points. Record and save a new trip to replay it.
          </Text>
          <Button className="mt-6" onPress={() => router.back()}>
            <Text>Go back</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return <TripReplayPlayer trip={trip} onClose={() => router.back()} />;
}
