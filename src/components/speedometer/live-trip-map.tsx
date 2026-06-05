import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { WebView } from "react-native-webview";

import { Text } from "@/components/ui/text";
import { buildLiveMapHtml } from "@/lib/map-tiles";
import type { TripRoutePoint } from "@/lib/trip-storage";

type LiveTripMapProps = {
  routePoints: TripRoutePoint[];
  currentPosition: {
    latitude: number;
    longitude: number;
    heading?: number | null;
  } | null;
  darkMode?: boolean;
  style?: ViewStyle;
  onFollowingChange?: (isFollowing: boolean) => void;
  onReady?: () => void;
};

export type LiveTripMapRef = {
  centerOnPosition: () => void;
  enableFollowing: () => void;
};

export const LiveTripMap = forwardRef<LiveTripMapRef, LiveTripMapProps>(
  function LiveTripMap(
    {
      routePoints,
      currentPosition,
      darkMode = false,
      style,
      onFollowingChange,
      onReady,
    },
    ref,
  ) {
    const webViewRef = useRef<WebView>(null);
    const currentPositionRef = useRef(currentPosition);
    currentPositionRef.current = currentPosition;
    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState(false);
    const html = useMemo(() => buildLiveMapHtml(), []);
    const lastRouteCountRef = useRef(0);

    const buildPositionScript = (
      position: NonNullable<LiveTripMapProps["currentPosition"]>,
    ) => {
      const headingValue =
        position.heading != null && Number.isFinite(position.heading)
          ? position.heading
          : "null";

      return `window.updateLivePosition(${position.latitude}, ${position.longitude}, ${headingValue}); true;`;
    };

    useImperativeHandle(
      ref,
      () => ({
        centerOnPosition() {
          const position = currentPositionRef.current;
          if (!position || !mapReady || !webViewRef.current) {
            return;
          }

          const script = `window.centerOnPosition(${position.latitude}, ${position.longitude}); true;`;
          webViewRef.current.injectJavaScript(script);
        },
        enableFollowing() {
          if (!mapReady || !webViewRef.current) {
            return;
          }

          webViewRef.current.injectJavaScript("window.enableFollowing(); true;");
        },
      }),
      [mapReady],
    );

    useEffect(() => {
      if (!mapReady || !webViewRef.current) {
        return;
      }

      const themeScript = `window.setMapDarkMode(${darkMode ? "true" : "false"}); true;`;
      webViewRef.current.injectJavaScript(themeScript);
    }, [darkMode, mapReady]);

    useEffect(() => {
      if (!mapReady || !webViewRef.current) {
        return;
      }

      if (routePoints.length === 0) {
        lastRouteCountRef.current = 0;
        if (currentPosition) {
          webViewRef.current.injectJavaScript(buildPositionScript(currentPosition));
        } else {
          webViewRef.current.injectJavaScript("window.resetLiveRoute(); true;");
        }
        return;
      }

      const shouldReloadRoute =
        lastRouteCountRef.current === 0 ||
        routePoints.length < lastRouteCountRef.current;

      if (shouldReloadRoute) {
        lastRouteCountRef.current = routePoints.length;
        const script = `window.setLiveRoute(${JSON.stringify(routePoints)}); true;`;
        webViewRef.current.injectJavaScript(script);
        return;
      }

      if (routePoints.length > lastRouteCountRef.current) {
        lastRouteCountRef.current = routePoints.length;
      }

      if (currentPosition) {
        webViewRef.current.injectJavaScript(buildPositionScript(currentPosition));
      }
    }, [currentPosition, mapReady, routePoints]);

    if (mapError) {
      return (
        <View style={[styles.container, styles.fallback, style]}>
          <Text className="text-center font-semibold">Map failed to load</Text>
          <Text variant="muted" className="mt-2 text-center text-sm">
            Check your internet connection and try again.
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.container, style]}>
        {!mapReady ? (
          <View style={styles.loader}>
            <ActivityIndicator />
          </View>
        ) : null}
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          onMessage={(event) => {
            const message = event.nativeEvent.data;

            if (message === "ready") {
              setMapReady(true);
              onReady?.();
              return;
            }

            if (message === "following-user") {
              onFollowingChange?.(true);
              return;
            }

            if (message === "user-moved-map") {
              onFollowingChange?.(false);
            }
          }}
          onError={() => setMapError(true)}
          onHttpError={() => setMapError(true)}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 320,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#1A1A2E",
  },
  webview: {
    flex: 1,
    backgroundColor: "#1A1A2E",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1A2E",
    zIndex: 2,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
});
