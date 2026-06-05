import { Slot } from 'expo-router';

import { SpeedometerProvider } from '@/contexts/speedometer-context';

export default function TabLayout() {
  return (
    <SpeedometerProvider>
      <Slot />
    </SpeedometerProvider>
  );
}
