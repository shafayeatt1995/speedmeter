import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { BRAND } from '@/lib/brand';
import type { TrackingStatus } from '@/hooks/use-speedometer';
import { cn } from '@/lib/utils';

const BUTTON_SIZE = 112;
const ICON_SIZE = 46;
const COMPACT_BUTTON_SIZE = 52;
const COMPACT_ICON_SIZE = 22;

type PlayPauseButtonProps = {
  status: TrackingStatus;
  onPress: () => void;
  compact?: boolean;
  showLabel?: boolean;
};

export function PlayPauseButton({
  status,
  onPress,
  compact = false,
  showLabel = true,
}: PlayPauseButtonProps) {
  const isTracking = status === 'tracking';
  const isPaused = status === 'paused';
  const label = status === 'idle' ? 'Start trip' : isTracking ? 'Pause' : 'Resume';
  const size = compact ? COMPACT_BUTTON_SIZE : BUTTON_SIZE;
  const iconSize = compact ? COMPACT_ICON_SIZE : ICON_SIZE;

  return (
    <View className={cn('items-center', compact ? 'gap-0' : 'gap-4 py-2')}>
      <View
        className={cn('rounded-full', compact ? 'p-1' : 'p-2')}
        style={{
          backgroundColor: `${BRAND.indigo[500]}33`,
          shadowColor: BRAND.display.glow,
          shadowOpacity: isTracking ? 0.5 : 0.25,
          shadowRadius: compact ? 10 : 20,
          shadowOffset: { width: 0, height: compact ? 4 : 8 },
        }}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          className={cn(
            'items-center justify-center rounded-full bg-primary active:opacity-90',
            isPaused && 'bg-primary/90'
          )}
          style={{
            width: size,
            height: size,
            shadowColor: BRAND.display.glow,
            shadowOpacity: 0.35,
            shadowRadius: compact ? 6 : 12,
            shadowOffset: { width: 0, height: compact ? 2 : 4 },
          }}>
          <SymbolView
            name={{
              ios: isTracking ? 'pause.fill' : 'play.fill',
              android: isTracking ? 'pause' : 'play_arrow',
              web: isTracking ? 'pause' : 'play_arrow',
            }}
            size={iconSize}
            tintColor="#FFFFFF"
          />
        </Pressable>
      </View>
      {showLabel ? (
        <Text variant="muted" className={cn('font-semibold', compact ? 'text-xs' : 'text-base')}>
          {label}
          {isPaused ? ' · rest time is counting' : ''}
        </Text>
      ) : null}
    </View>
  );
}
