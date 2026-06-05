import Slider from "@react-native-community/slider";
import { SymbolView } from "expo-symbols";
import { useColorScheme } from "nativewind";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TripReplayMap } from "@/components/trip-replay/trip-replay-map";
import { Text } from "@/components/ui/text";
import { useTripReplay } from "@/hooks/use-trip-replay";
import { BRAND } from "@/lib/brand";
import { DISPLAY_FONT } from "@/lib/fonts";
import { THEME } from "@/lib/theme";
import { formatSpeed } from "@/lib/speed";
import { formatReplayClock, getTripUnitLabel } from "@/lib/trip-replay";
import type { SavedTrip } from "@/lib/trip-storage";

type TripReplayPlayerProps = {
  trip: SavedTrip;
  onClose: () => void;
};

export function TripReplayPlayer({ trip, onClose }: TripReplayPlayerProps) {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === "dark" ? "dark" : "light";
  const theme = THEME[scheme];

  const {
    points,
    durationMs,
    progressMs,
    frame,
    isPlaying,
    playbackRate,
    minPlaybackRate,
    maxPlaybackRate,
    decreasePlaybackRate,
    increasePlaybackRate,
    togglePlay,
    pause,
    seek,
  } = useTripReplay(trip);

  const unitLabel = getTripUnitLabel(trip);
  const sliderMax = Math.max(durationMs, 1);

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <View className="flex-row items-center justify-between px-4 py-2">
        <Pressable
          onPress={onClose}
          className="rounded-full border border-primary/20 bg-card px-4 py-2 active:opacity-80"
        >
          <Text className="font-semibold text-primary">Close</Text>
        </Pressable>
        <View className="rounded-full border border-primary/20 bg-card px-4 py-2">
          <Text className="text-xs font-semibold uppercase text-primary">
            Trip replay
          </Text>
        </View>
        <View className="w-[72px]" />
      </View>

      <TripReplayMap points={points} frame={frame} style={{ flex: 1 }} />

      <View className="border-t border-primary/15 bg-card px-5 pb-6 pt-4">
        <View className="items-center">
          <Text className="text-[10px] font-semibold uppercase text-muted-foreground">
            Speed at this point
          </Text>
          <Text
            style={{
              fontSize: 56,
              lineHeight: 60,
              fontFamily: DISPLAY_FONT.extraBold,
              color: BRAND.indigo[500],
            }}
          >
            {formatSpeed(frame?.speed ?? 0, trip.unit)}
          </Text>
          <Text className="text-sm font-bold uppercase text-primary">
            {unitLabel}
          </Text>
        </View>

        <View className="mt-4">
          <Slider
            minimumValue={0}
            maximumValue={sliderMax}
            value={Math.min(progressMs, sliderMax)}
            onSlidingStart={() => {
              if (isPlaying) {
                pause();
              }
            }}
            onValueChange={(value) => seek(value)}
            minimumTrackTintColor={theme.primary}
            maximumTrackTintColor={theme.border}
            thumbTintColor={theme.primary}
          />
          <Text variant="muted" className="mt-1 text-center text-xs">
            {formatReplayClock(progressMs, durationMs)}
          </Text>
        </View>

        <View className="mt-4 flex-row items-center justify-center gap-5">
          <Pressable
            onPress={togglePlay}
            className="h-14 w-14 items-center justify-center rounded-full bg-primary active:opacity-90"
          >
            <SymbolView
              name={{
                ios: isPlaying ? "pause.fill" : "play.fill",
                android: isPlaying ? "pause" : "play_arrow",
                web: isPlaying ? "pause" : "play_arrow",
              }}
              size={24}
              tintColor="#FFFFFF"
            />
          </Pressable>

          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={decreasePlaybackRate}
              disabled={playbackRate <= minPlaybackRate}
              className={`h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-background active:opacity-80 ${
                playbackRate <= minPlaybackRate ? "opacity-40" : ""
              }`}
            >
              <SymbolView
                name={{
                  ios: "minus",
                  android: "remove",
                  web: "remove",
                }}
                size={20}
                tintColor={theme.primary}
              />
            </Pressable>

            <View className="min-w-[56px] items-center rounded-full bg-primary/10 px-4 py-2">
              <Text className="text-base font-bold text-primary">
                {playbackRate}x
              </Text>
            </View>

            <Pressable
              onPress={increasePlaybackRate}
              disabled={playbackRate >= maxPlaybackRate}
              className={`h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-background active:opacity-80 ${
                playbackRate >= maxPlaybackRate ? "opacity-40" : ""
              }`}
            >
              <SymbolView
                name={{
                  ios: "plus",
                  android: "add",
                  web: "add",
                }}
                size={20}
                tintColor={theme.primary}
              />
            </Pressable>
          </View>
        </View>

        <Text variant="muted" className="mt-3 text-center text-xs">
          Use − and + to change replay speed (1x to {maxPlaybackRate}x)
        </Text>
      </View>
    </SafeAreaView>
  );
}
