export const MAP_TILE_THEMES = {
  light: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    background: '#eef2ff',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; OpenStreetMap contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    background: '#334155',
  },
} as const;

export const MAP_TILE_LAYER_OPTIONS = {
  maxZoom: 19,
  detectRetina: true,
} as const;

export const MAP_NAVIGATION_ZOOM = 16;

export function buildLiveMapHtml() {
  const mapThemes = JSON.stringify(MAP_TILE_THEMES);
  const navigationZoom = MAP_NAVIGATION_ZOOM;
  const tileLayerOptions = JSON.stringify(MAP_TILE_LAYER_OPTIONS);

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
        background: #eef2ff;
      }
      .map-theme-dark,
      .map-theme-dark #map {
        background: #334155;
      }
      .current-location-marker {
        background: transparent;
        border: none;
      }
      .location-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #6366f1;
        border: 3px solid #ffffff;
        box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.2);
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
    <script src="https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.js"></script>
    <script>
      const MAP_THEMES = ${mapThemes};
      const TILE_LAYER_OPTIONS = ${tileLayerOptions};
      const NAVIGATION_ZOOM = ${navigationZoom};

      const map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
        rotate: true,
        bearing: 0,
        touchRotate: false,
        shiftKeyRotate: false,
        rotateControl: false,
      });

      let tileLayer = null;

      function applyMapTheme(theme) {
        const config = MAP_THEMES[theme];
        document.body.className = theme === 'dark' ? 'map-theme-dark' : 'map-theme-light';
        document.body.style.background = config.background;
        document.getElementById('map').style.background = config.background;

        if (tileLayer) {
          map.removeLayer(tileLayer);
        }

        tileLayer = L.tileLayer(config.url, {
          maxZoom: TILE_LAYER_OPTIONS.maxZoom,
          detectRetina: TILE_LAYER_OPTIONS.detectRetina,
          attribution: config.attribution,
          subdomains: config.subdomains || 'abc',
        }).addTo(map);
      }

      window.setMapDarkMode = function (isDark) {
        applyMapTheme(isDark ? 'dark' : 'light');
      };

      applyMapTheme('light');

      let routeLine = null;
      let routeCoords = [];
      let startMarker = null;
      let currentMarker = null;
      let currentHeading = null;
      let hasFitBounds = false;
      let smoothedHeading = null;
      let displayedMapHeading = null;
      let bearingAnimationId = null;
      let navigationMode = true;
      let lastLat = null;
      let lastLng = null;

      function notifyFollowingState() {
        if (!window.ReactNativeWebView) {
          return;
        }

        window.ReactNativeWebView.postMessage(
          navigationMode ? 'following-user' : 'user-moved-map',
        );
      }

      function normalizeAngle(angle) {
        return ((angle % 360) + 360) % 360;
      }

      function angleDifference(from, to) {
        var diff = normalizeAngle(to) - normalizeAngle(from);
        if (diff > 180) {
          diff -= 360;
        }
        if (diff < -180) {
          diff += 360;
        }
        return diff;
      }

      function lerpAngle(from, to, alpha) {
        return normalizeAngle(from + angleDifference(from, to) * alpha);
      }

      function stopBearingAnimation() {
        if (bearingAnimationId != null) {
          cancelAnimationFrame(bearingAnimationId);
          bearingAnimationId = null;
        }
      }

      function centerMapOnPosition(lat, lng, animate) {
        if (navigationMode) {
          map.panTo([lat, lng], {
            animate: animate !== false,
            duration: 0.35,
            easeLinearity: 0.25,
          });
          return;
        }

        if (animate === false) {
          map.setView([lat, lng], map.getZoom());
        } else {
          map.panTo([lat, lng], { animate: true, duration: 0.35 });
        }
      }

      function animateMapHeading() {
        if (smoothedHeading == null) {
          bearingAnimationId = null;
          return;
        }

        if (displayedMapHeading == null) {
          displayedMapHeading = smoothedHeading;
        }

        var diff = angleDifference(displayedMapHeading, smoothedHeading);
        if (Math.abs(diff) < 0.4) {
          displayedMapHeading = smoothedHeading;
          if (typeof map.setBearing === 'function') {
            map.setBearing(-displayedMapHeading);
          }
          bearingAnimationId = null;
          return;
        }

        displayedMapHeading = lerpAngle(displayedMapHeading, smoothedHeading, 0.1);
        if (typeof map.setBearing === 'function') {
          map.setBearing(-displayedMapHeading);
        }
        bearingAnimationId = requestAnimationFrame(animateMapHeading);
      }

      function applyHeadingUpRotation(heading) {
        if (heading == null || !Number.isFinite(heading)) {
          return;
        }

        currentHeading = heading;

        if (smoothedHeading == null) {
          smoothedHeading = heading;
          displayedMapHeading = heading;
          if (typeof map.setBearing === 'function') {
            map.setBearing(-heading);
          }
          return;
        }

        if (Math.abs(angleDifference(smoothedHeading, heading)) < 3) {
          return;
        }

        smoothedHeading = lerpAngle(smoothedHeading, heading, 0.16);

        if (bearingAnimationId == null) {
          bearingAnimationId = requestAnimationFrame(animateMapHeading);
        }
      }

      function createCurrentPositionDot() {
        return L.divIcon({
          className: 'current-location-marker',
          html: '<div class="location-dot"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
      }

      function ensureStartMarker(lat, lng) {
        if (startMarker) {
          return;
        }

        startMarker = L.circleMarker([lat, lng], {
          radius: 8,
          color: '#ffffff',
          weight: 2,
          fillColor: '#22C55E',
          fillOpacity: 1,
        })
          .addTo(map)
          .bindPopup('Start');
      }

      function ensureCurrentMarker(lat, lng, heading) {
        lastLat = lat;
        lastLng = lng;

        if (navigationMode) {
          if (currentMarker) {
            map.removeLayer(currentMarker);
            currentMarker = null;
          }
          centerMapOnPosition(lat, lng, true);
          applyHeadingUpRotation(heading);
          return;
        }

        if (!currentMarker) {
          currentMarker = L.marker([lat, lng], {
            icon: createCurrentPositionDot(),
            interactive: false,
            zIndexOffset: 1000,
          }).addTo(map);
        } else {
          currentMarker.setLatLng([lat, lng]);
        }
      }

      function refreshRouteLine() {
        if (routeCoords.length < 2) {
          return;
        }

        if (!routeLine) {
          routeLine = L.polyline(routeCoords, {
            color: '#818CF8',
            weight: 5,
            opacity: 0.9,
          }).addTo(map);
        } else {
          routeLine.setLatLngs(routeCoords);
        }

        if (!hasFitBounds) {
          map.fitBounds(routeLine.getBounds(), { padding: [56, 56] });
          hasFitBounds = true;
        }
      }

      window.resetLiveRoute = function () {
        routeCoords = [];
        hasFitBounds = false;

        if (routeLine) {
          map.removeLayer(routeLine);
          routeLine = null;
        }

        if (startMarker) {
          map.removeLayer(startMarker);
          startMarker = null;
        }

        if (currentMarker) {
          map.removeLayer(currentMarker);
          currentMarker = null;
        }

        currentHeading = null;
        smoothedHeading = null;
        displayedMapHeading = null;
        lastLat = null;
        lastLng = null;
        navigationMode = true;
        stopBearingAnimation();
        if (typeof map.setBearing === 'function') {
          map.setBearing(0);
        }
      };

      window.setLiveRoute = function (points) {
        window.resetLiveRoute();

        if (!points || !points.length) {
          map.setView([0, 0], 2);
          return;
        }

        routeCoords = points.map(function (point) {
          return [point.latitude, point.longitude];
        });

        ensureStartMarker(points[0].latitude, points[0].longitude);
        const last = points[points.length - 1];
        ensureCurrentMarker(last.latitude, last.longitude, null);
        refreshRouteLine();

        if (routeCoords.length === 1) {
          centerMapOnPosition(routeCoords[0][0], routeCoords[0][1], false);
          map.setZoom(NAVIGATION_ZOOM);
          applyHeadingUpRotation(null);
        }
      };

      window.updateLivePosition = function (lat, lng, heading) {
        ensureStartMarker(lat, lng);
        ensureCurrentMarker(lat, lng, heading);

        const last = routeCoords[routeCoords.length - 1];
        if (!last || last[0] !== lat || last[1] !== lng) {
          routeCoords.push([lat, lng]);
          refreshRouteLine();
        }
      };

      window.centerOnPosition = function (lat, lng) {
        navigationMode = true;

        if (currentMarker) {
          map.removeLayer(currentMarker);
          currentMarker = null;
        }

        const zoom = Math.max(map.getZoom(), NAVIGATION_ZOOM);
        map.setView([lat, lng], zoom, { animate: true });
        applyHeadingUpRotation(currentHeading);
        notifyFollowingState();
      };

      window.enableFollowing = function () {
        navigationMode = true;
        notifyFollowingState();
      };

      map.on('dragstart', function () {
        if (!navigationMode) {
          return;
        }

        navigationMode = false;

        if (lastLat != null && lastLng != null) {
          ensureCurrentMarker(lastLat, lastLng, currentHeading);
        }

        notifyFollowingState();
      });

      map.setView([23.8103, 90.4125], 12);

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('ready');
      }
    </script>
  </body>
</html>`;
}
