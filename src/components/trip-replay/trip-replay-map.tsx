import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import { Text } from '@/components/ui/text';
import type { ReplayFrame } from '@/lib/trip-replay';
import type { TripRoutePoint } from '@/lib/trip-storage';

function buildLeafletHtml(points: TripRoutePoint[]) {
  const route = points.map((point) => [point.latitude, point.longitude]);
  const initialLat = points[0]?.latitude ?? 0;
  const initialLng = points[0]?.longitude ?? 0;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html,
      body,
      #map {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        background: #0b1020;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const route = ${JSON.stringify(route)};
      const map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      let replayMarker = null;

      if (route.length > 0) {
        if (route.length > 1) {
          const polyline = L.polyline(route, {
            color: '#818CF8',
            weight: 5,
            opacity: 0.9,
          }).addTo(map);

          L.circleMarker(route[0], {
            radius: 7,
            color: '#ffffff',
            weight: 2,
            fillColor: '#4F46E5',
            fillOpacity: 1,
          })
            .addTo(map)
            .bindPopup('Start');

          L.circleMarker(route[route.length - 1], {
            radius: 7,
            color: '#ffffff',
            weight: 2,
            fillColor: '#A5B4FC',
            fillOpacity: 1,
          })
            .addTo(map)
            .bindPopup('End');

          map.fitBounds(polyline.getBounds(), { padding: [48, 48] });
        } else {
          map.setView(route[0], 15);
        }

        replayMarker = L.circleMarker([${initialLat}, ${initialLng}], {
          radius: 10,
          color: '#ffffff',
          weight: 3,
          fillColor: '#6366F1',
          fillOpacity: 1,
        }).addTo(map);
      }

      window.updateReplayPosition = function (lat, lng) {
        if (!replayMarker) {
          return;
        }

        replayMarker.setLatLng([lat, lng]);
        map.panTo([lat, lng], { animate: true, duration: 0.25 });
      };

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('ready');
      }
    </script>
  </body>
</html>`;
}

type TripReplayMapProps = {
  points: TripRoutePoint[];
  frame: ReplayFrame | null;
  style?: ViewStyle;
};

export function TripReplayMap({ points, frame, style }: TripReplayMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const html = useMemo(() => buildLeafletHtml(points), [points]);

  useEffect(() => {
    if (!mapReady || !frame || !webViewRef.current) {
      return;
    }

    const script = `window.updateReplayPosition(${frame.latitude}, ${frame.longitude}); true;`;
    webViewRef.current.injectJavaScript(script);
  }, [frame?.latitude, frame?.longitude, mapReady]);

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
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        onMessage={(event) => {
          if (event.nativeEvent.data === 'ready') {
            setMapReady(true);
          }
        }}
        onError={() => setMapError(true)}
        onHttpError={() => setMapError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 280,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: '#0B1020',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0B1020',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1020',
    zIndex: 2,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
