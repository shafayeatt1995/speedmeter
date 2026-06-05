import { Modal, Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { getTripSummary } from "@/lib/trip-format";
import type { SavedTrip } from "@/lib/trip-storage";

type EndTripDialogProps = {
  visible: boolean;
  trip: SavedTrip | null;
  onSave: () => void;
  onDiscard: () => void;
};

export function EndTripDialog({
  visible,
  trip,
  onSave,
  onDiscard,
}: EndTripDialogProps) {
  if (!visible || !trip) {
    return null;
  }

  const summary = getTripSummary(trip);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDiscard}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/55 px-6"
        onPress={onDiscard}
      >
        <Pressable
          className="w-full max-w-md rounded-md border border-primary/20 bg-card p-5"
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-[10px] font-bold uppercase text-primary">
            End trip
          </Text>
          <Text variant="h4" className="mt-2">
            Save this trip?
          </Text>
          <Text variant="muted" className="mt-2">
            Save this ride to your device so you can view it later in trip
            history.
          </Text>

          <View className="mt-5 gap-3 rounded-md border border-primary/10 bg-primary/5 p-4">
            <View className="flex-row justify-between">
              <Text variant="muted">Distance</Text>
              <Text className="font-semibold">{summary.distance}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text variant="muted">Moving time</Text>
              <Text className="font-semibold">{summary.movingTime}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text variant="muted">Max speed</Text>
              <Text className="font-semibold">
                {summary.maxSpeed} {summary.unitLabel}
              </Text>
            </View>
          </View>

          <View className="mt-6 flex-row gap-3">
            <Button
              className="flex-1 rounded-md"
              variant="outline"
              onPress={onDiscard}
            >
              <Text>Don&apos;t save</Text>
            </Button>
            <Button className="flex-1 rounded-md" onPress={onSave}>
              <Text>Save trip</Text>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
