import { SymbolView } from "expo-symbols";
import { usePathname, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { THEME } from "@/lib/theme";

type TabSymbol = {
  ios: string;
  android: string;
  web: string;
};

type TabItem = {
  href: "/" | "/history";
  label: string;
  icon: TabSymbol;
  iconFocused: TabSymbol;
  match: (pathname: string) => boolean;
};

function isHistoryRoute(pathname: string) {
  return pathname === "/history" || pathname.startsWith("/history/");
}

const TABS: TabItem[] = [
  {
    href: "/",
    label: "Home",
    icon: { ios: "house", android: "home", web: "home" },
    iconFocused: { ios: "house.fill", android: "home", web: "home" },
    match: (pathname) => !isHistoryRoute(pathname),
  },
  {
    href: "/history",
    label: "History",
    icon: { ios: "clock", android: "history", web: "history" },
    iconFocused: { ios: "clock.fill", android: "history", web: "history" },
    match: isHistoryRoute,
  },
];

export function AppBottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === "dark" ? "dark" : "light";
  const activeColor = THEME[scheme].primary;
  const inactiveColor = THEME[scheme].mutedForeground;

  return (
    <View
      className="border-t border-primary/15 bg-card"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      <View className="flex-row px-2 pt-2">
        {TABS.map((tab) => {
          const isFocused = tab.match(pathname);

          return (
            <Pressable
              key={tab.href}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={() => {
                if (!isFocused) {
                  router.replace(tab.href);
                }
              }}
              className={`flex-1 items-center rounded-md py-2 active:opacity-80 ${
                isFocused ? "bg-primary/10" : ""
              }`}
            >
              <SymbolView
                name={isFocused ? tab.iconFocused : tab.icon}
                size={22}
                tintColor={isFocused ? activeColor : inactiveColor}
              />
              <Text
                className={`mt-1 text-xs ${
                  isFocused
                    ? "font-semibold text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
