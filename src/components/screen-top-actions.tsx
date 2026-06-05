import type { ReactNode } from 'react';
import { View } from 'react-native';

import { ThemeToggle } from '@/components/theme-toggle';

type ScreenTopActionsProps = {
  children?: ReactNode;
};

export function ScreenTopActions({ children }: ScreenTopActionsProps) {
  return (
    <View className="flex-row items-center justify-end gap-2">
      {children}
      <ThemeToggle />
    </View>
  );
}
