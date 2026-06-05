import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { BRAND } from "@/lib/brand";
import { DISPLAY_FONT } from "@/lib/fonts";
import { formatDecimal, getUnitLabel, type SpeedUnit } from "@/lib/speed";
import { cn } from "@/lib/utils";

type SpeedDisplayProps = {
  speed: number;
  unit: SpeedUnit;
  isActive?: boolean;
};

export function SpeedDisplay({
  speed,
  unit,
  isActive = false,
}: SpeedDisplayProps) {
  const displaySpeed = formatDecimal(Math.max(0, speed));

  return (
    <View className="items-center py-6">
      <Text className="mb-2 text-[11px] font-semibold uppercase text-primary">
        Current speed
      </Text>

      <Text
        style={{
          fontSize: 120,
          lineHeight: 124,
          fontFamily: DISPLAY_FONT.extraBold,
          fontVariant: ["tabular-nums"],
          letterSpacing: -4,
          color: BRAND.indigo[500],
        }}
      >
        {displaySpeed}
      </Text>

      <Text
        className="mt-1 text-base font-bold uppercase text-primary"
        style={{ color: BRAND.indigo[400] }}
      >
        {getUnitLabel(unit)}
      </Text>

      <View className="mt-5 flex-row items-center gap-2">
        <View
          className={cn(
            "h-2 w-2 rounded-full",
            isActive ? "bg-primary" : "bg-muted-foreground/40",
          )}
        />
        <Text
          className={cn(
            "text-xs font-semibold uppercase",
            isActive ? "text-primary" : "text-muted-foreground",
          )}
        >
          {isActive ? "GPS tracking active" : "Ready to track"}
        </Text>
      </View>
    </View>
  );
}
