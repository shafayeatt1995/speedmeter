import '@/global.css';
import '@/lib/background-location-task';

import {
  RedHatDisplay_300Light,
  RedHatDisplay_400Regular,
  RedHatDisplay_500Medium,
  RedHatDisplay_600SemiBold,
  RedHatDisplay_700Bold,
  RedHatDisplay_800ExtraBold,
  RedHatDisplay_900Black,
  useFonts,
} from '@expo-google-fonts/red-hat-display';
import { ThemeProvider } from 'expo-router/react-navigation';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';

import { AppBottomTabBar } from '@/components/bottom-tab-bar';
import { NAV_THEME } from '@/lib/theme';
import {
  DEFAULT_APP_COLOR_SCHEME,
  loadStoredColorScheme,
} from '@/lib/theme-storage';
import { cn } from '@/lib/utils';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [themeReady, setThemeReady] = useState(false);
  const resolvedScheme = colorScheme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    void (async () => {
      const savedScheme = await loadStoredColorScheme();
      setColorScheme(savedScheme ?? DEFAULT_APP_COLOR_SCHEME);
      setThemeReady(true);
    })();
  }, [setColorScheme]);

  const [fontsLoaded, fontError] = useFonts({
    RedHatDisplay_300Light,
    RedHatDisplay_400Regular,
    RedHatDisplay_500Medium,
    RedHatDisplay_600SemiBold,
    RedHatDisplay_700Bold,
    RedHatDisplay_800ExtraBold,
    RedHatDisplay_900Black,
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && themeReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, themeReady]);

  if ((!fontsLoaded && !fontError) || !themeReady) {
    return null;
  }

  return (
    <View className={cn('flex-1 bg-background', resolvedScheme === 'dark' && 'dark')}>
      <ThemeProvider value={NAV_THEME[resolvedScheme]}>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <View className="flex-1">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="history/[id]" />
            <Stack.Screen name="history/replay/[id]" />
            <Stack.Screen name="privacy" />
          </Stack>
        </View>
        <AppBottomTabBar />
        <PortalHost />
      </ThemeProvider>
    </View>
  );
}
