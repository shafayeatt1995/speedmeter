import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet } from 'react-native';

export const DISPLAY_FONT = {
  light: 'RedHatDisplay_300Light',
  regular: 'RedHatDisplay_400Regular',
  medium: 'RedHatDisplay_500Medium',
  semiBold: 'RedHatDisplay_600SemiBold',
  bold: 'RedHatDisplay_700Bold',
  extraBold: 'RedHatDisplay_800ExtraBold',
  black: 'RedHatDisplay_900Black',
} as const;

export function resolveDisplayFont(className?: string, style?: StyleProp<TextStyle>) {
  const flatStyle = StyleSheet.flatten(style);
  const fontWeight = flatStyle?.fontWeight;
  const cls = className ?? '';

  if (cls.includes('font-black') || fontWeight === '900' || fontWeight === 900) {
    return DISPLAY_FONT.black;
  }

  if (cls.includes('font-extrabold') || fontWeight === '800' || fontWeight === 800) {
    return DISPLAY_FONT.extraBold;
  }

  if (cls.includes('font-bold') || fontWeight === '700' || fontWeight === 700) {
    return DISPLAY_FONT.bold;
  }

  if (cls.includes('font-semibold') || fontWeight === '600' || fontWeight === 600) {
    return DISPLAY_FONT.semiBold;
  }

  if (cls.includes('font-medium') || fontWeight === '500' || fontWeight === 500) {
    return DISPLAY_FONT.medium;
  }

  if (cls.includes('font-light') || fontWeight === '300' || fontWeight === 300) {
    return DISPLAY_FONT.light;
  }

  return DISPLAY_FONT.regular;
}
