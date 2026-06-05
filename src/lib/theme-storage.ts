import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'app-color-scheme';
const MAP_DARK_MODE_STORAGE_KEY = 'map-dark-mode';

export type AppColorScheme = 'light' | 'dark';

export const DEFAULT_APP_COLOR_SCHEME: AppColorScheme = 'light';
export const DEFAULT_MAP_DARK_MODE = false;

export async function loadStoredColorScheme(): Promise<AppColorScheme | null> {
  const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  return null;
}

export async function saveColorScheme(scheme: AppColorScheme) {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
}

export async function loadStoredMapDarkMode(): Promise<boolean | null> {
  const saved = await AsyncStorage.getItem(MAP_DARK_MODE_STORAGE_KEY);
  if (saved === 'true') {
    return true;
  }
  if (saved === 'false') {
    return false;
  }
  return null;
}

export async function saveMapDarkMode(isDark: boolean) {
  await AsyncStorage.setItem(MAP_DARK_MODE_STORAGE_KEY, String(isDark));
}
