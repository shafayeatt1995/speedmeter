import { Modal, Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { formatTripDateTime } from "@/lib/trip-format";
import type { SavedTrip } from "@/lib/trip-storage";

type DeleteTripDialogProps = {
  visible: boolean;
  trip: SavedTrip | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteTripDialog({
  visible,
  trip,
  onCancel,
  onConfirm,
}: DeleteTripDialogProps) {
  if (!visible || !trip) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/55 px-6"
        onPress={onCancel}
      >
        <Pressable
          className="w-full max-w-md rounded-md border border-primary/20 bg-card p-5"
          onPress={(event) => event.stopPropagation()}
        >
          <Text className="text-[10px] font-bold uppercase text-destructive">
            Delete trip
          </Text>
          <Text variant="h4" className="mt-2">
            Remove this ride?
          </Text>
          <Text variant="muted" className="mt-2">
            {formatTripDateTime(trip.endedAt)} will be permanently deleted from
            this device.
          </Text>

          <View className="mt-6 flex-row gap-3">
            <Button
              className="flex-1"
              variant="outline"
              onPress={onCancel}
            >
              <Text>Cancel</Text>
            </Button>
            <Button
              className="flex-1"
              variant="destructive"
              onPress={onConfirm}
            >
              <Text>Delete</Text>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
