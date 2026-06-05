import { Slot } from 'expo-router';
import { View } from 'react-native';

import { AppBottomTabBar } from '@/components/bottom-tab-bar';
import { SpeedometerProvider } from '@/contexts/speedometer-context';

export default function TabLayout() {
  return (
    <SpeedometerProvider>
      <View className="flex-1 bg-background">
        <View className="flex-1">
          <Slot />
        </View>
        <AppBottomTabBar />
      </View>
    </SpeedometerProvider>
  );
}
