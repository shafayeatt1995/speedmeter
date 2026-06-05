import { createContext, useContext, type ReactNode } from 'react';

import { useSpeedometer } from '@/hooks/use-speedometer';

type SpeedometerContextValue = ReturnType<typeof useSpeedometer>;

const SpeedometerContext = createContext<SpeedometerContextValue | null>(null);

export function SpeedometerProvider({ children }: { children: ReactNode }) {
  const value = useSpeedometer();

  return <SpeedometerContext.Provider value={value}>{children}</SpeedometerContext.Provider>;
}

export function useSpeedometerContext() {
  const context = useContext(SpeedometerContext);

  if (!context) {
    throw new Error('useSpeedometerContext must be used within SpeedometerProvider');
  }

  return context;
}
