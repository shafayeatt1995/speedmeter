#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ -z "${JAVA_HOME:-}" ]; then
  if /usr/libexec/java_home -v 17+ >/dev/null 2>&1; then
    export JAVA_HOME="$(/usr/libexec/java_home -v 17+)"
  elif [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  fi
fi

if [ -z "${JAVA_HOME:-}" ] || ! "$JAVA_HOME/bin/java" -version >/dev/null 2>&1; then
  echo ""
  echo "Java JDK not found (Gradle requires JDK 17+)."
  echo "Install Android Studio (includes a JDK), or run:"
  echo "  brew install --cask temurin@17"
  echo "Then add to ~/.zshrc:"
  echo "  export JAVA_HOME=\$(/usr/libexec/java_home -v 17)"
  echo ""
  exit 1
fi

if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi

if [ -z "${ANDROID_HOME:-}" ]; then
  echo ""
  echo "Android SDK not found."
  echo "One-time setup:"
  echo "  1. Install Android Studio: https://developer.android.com/studio"
  echo "  2. Open Android Studio -> Settings -> Android SDK -> install SDK Platform + Build-Tools"
  echo "  3. Add to ~/.zshrc:"
  echo "       export ANDROID_HOME=\$HOME/Library/Android/sdk"
  echo "       export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
  echo "  4. Run: source ~/.zshrc"
  echo ""
  exit 1
fi

export PATH="$PATH:$ANDROID_HOME/platform-tools"

# React Native 0.85.x ships foojay-resolver-convention 0.5.0, which breaks on Gradle 9+.
GRADLE_PLUGIN_SETTINGS="$ROOT_DIR/node_modules/@react-native/gradle-plugin/settings.gradle.kts"
if [ -f "$GRADLE_PLUGIN_SETTINGS" ] && grep -q 'foojay-resolver-convention").version("0.5.0")' "$GRADLE_PLUGIN_SETTINGS"; then
  sed -i '' 's/foojay-resolver-convention").version("0.5.0")/foojay-resolver-convention").version("1.0.0")/' "$GRADLE_PLUGIN_SETTINGS"
fi

if [ ! -d "android" ]; then
  echo "Generating native Android project..."
  bun x expo prebuild --platform android --clean
fi

echo "Building APK (this may take a few minutes on first run)..."
cd android
chmod +x ./gradlew
./gradlew assembleDebug --no-daemon

APK_SRC="app/build/outputs/apk/debug/app-debug.apk"
APK_OUT="$ROOT_DIR/speedometer.apk"

if [ ! -f "$APK_SRC" ]; then
  echo "Build finished but APK was not found at $APK_SRC"
  exit 1
fi

cp "$APK_SRC" "$APK_OUT"
echo ""
echo "Done. Install this file on your phone:"
echo "  $APK_OUT"
echo ""
