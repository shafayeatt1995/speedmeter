import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';

import { BRAND } from '@/lib/brand';

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      onPress={toggleColorScheme}
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      accessibilityRole="button"
      className="h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-card active:opacity-80"
      style={{
        shadowColor: BRAND.display.glow,
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}>
      <SymbolView
        name={{
          ios: isDark ? 'sun.max.fill' : 'moon.fill',
          android: isDark ? 'light_mode' : 'dark_mode',
          web: isDark ? 'light_mode' : 'dark_mode',
        }}
        size={18}
        tintColor={isDark ? BRAND.indigo[300] : BRAND.indigo[600]}
      />
    </Pressable>
  );
}
