#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

CREDENTIALS_DIR="$ROOT_DIR/credentials"
KEYSTORE_FILE="$CREDENTIALS_DIR/speedometer-release.keystore"
KEY_ALIAS="${KEY_ALIAS:-speedometer}"
KEYSTORE_PASSWORD="${KEYSTORE_PASSWORD:-}"
KEY_PASSWORD="${KEY_PASSWORD:-$KEYSTORE_PASSWORD}"
APK_OUT="$ROOT_DIR/speedometer-release.apk"

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
  echo "Install Android Studio or: brew install --cask temurin@17"
  echo ""
  exit 1
fi

if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi

if [ -z "${ANDROID_HOME:-}" ]; then
  echo ""
  echo "Android SDK not found. Install Android Studio and set ANDROID_HOME."
  echo ""
  exit 1
fi

export PATH="$PATH:$ANDROID_HOME/platform-tools"

GRADLE_PLUGIN_SETTINGS="$ROOT_DIR/node_modules/@react-native/gradle-plugin/settings.gradle.kts"
if [ -f "$GRADLE_PLUGIN_SETTINGS" ] && grep -q 'foojay-resolver-convention").version("0.5.0")' "$GRADLE_PLUGIN_SETTINGS"; then
  sed -i '' 's/foojay-resolver-convention").version("0.5.0")/foojay-resolver-convention").version("1.0.0")/' "$GRADLE_PLUGIN_SETTINGS"
fi

mkdir -p "$CREDENTIALS_DIR"

if [ ! -f "$KEYSTORE_FILE" ]; then
  if [ -z "$KEYSTORE_PASSWORD" ]; then
    echo ""
    echo "Release keystore not found."
    echo "Create one (recommended) with:"
    echo "  KEYSTORE_PASSWORD='your-secure-password' KEY_PASSWORD='your-secure-password' bun run build:apk:release"
    echo ""
    echo "Or generate manually:"
    echo "  mkdir -p credentials"
    echo "  keytool -genkeypair -v -storetype PKCS12 -keystore credentials/speedometer-release.keystore -alias speedometer -keyalg RSA -keysize 2048 -validity 10000"
    echo ""
    exit 1
  fi

  echo "Creating release keystore at credentials/speedometer-release.keystore ..."
  "$JAVA_HOME/bin/keytool" -genkeypair -v \
    -storetype PKCS12 \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=Aniker Speedometer, OU=Mobile, O=Aniker, L=Unknown, ST=Unknown, C=US"
fi

if [ -z "$KEYSTORE_PASSWORD" ]; then
  echo ""
  echo "Set KEYSTORE_PASSWORD (and optionally KEY_PASSWORD) to sign the release APK."
  echo "Example:"
  echo "  KEYSTORE_PASSWORD='your-password' bun run build:apk:release"
  echo ""
  exit 1
fi

if [ ! -d "android" ]; then
  echo "Generating native Android project..."
  bun x expo prebuild --platform android --clean
else
  echo "Using existing android/ project..."
fi

cat > android/keystore.properties <<EOF
storePassword=$KEYSTORE_PASSWORD
keyPassword=$KEY_PASSWORD
keyAlias=$KEY_ALIAS
storeFile=../credentials/speedometer-release.keystore
EOF

BUILD_GRADLE="android/app/build.gradle"
BUILD_GRADLE_KTS="android/app/build.gradle.kts"
GRADLE_FILE=""

if [ -f "$BUILD_GRADLE_KTS" ]; then
  GRADLE_FILE="$BUILD_GRADLE_KTS"
elif [ -f "$BUILD_GRADLE" ]; then
  GRADLE_FILE="$BUILD_GRADLE"
else
  echo "Could not find android/app/build.gradle(.kts)"
  exit 1
fi

if ! grep -q "speedometerReleaseSigning" "$GRADLE_FILE"; then
  if [[ "$GRADLE_FILE" == *.kts ]]; then
    python3 - "$GRADLE_FILE" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text()

snippet = """
val speedometerKeystorePropertiesFile = rootProject.file("keystore.properties")
val speedometerKeystoreProperties = java.util.Properties()
if (speedometerKeystorePropertiesFile.exists()) {
    speedometerKeystoreProperties.load(java.io.FileInputStream(speedometerKeystorePropertiesFile))
}
"""

signing_snippet = """
        create("speedometerReleaseSigning") {
            if (speedometerKeystorePropertiesFile.exists()) {
                storeFile = file(speedometerKeystoreProperties["storeFile"] as String)
                storePassword = speedometerKeystoreProperties["storePassword"] as String
                keyAlias = speedometerKeystoreProperties["keyAlias"] as String
                keyPassword = speedometerKeystoreProperties["keyPassword"] as String
            }
        }
"""

if "speedometerKeystorePropertiesFile" not in text:
    text = text.replace("android {", snippet + "\nandroid {", 1)

if "speedometerReleaseSigning" not in text:
    text = text.replace("signingConfigs {", "signingConfigs {\n" + signing_snippet, 1)

if "signingConfig = signingConfigs.getByName(\"speedometerReleaseSigning\")" not in text:
    text = text.replace(
        "release {",
        'release {\n            signingConfig = signingConfigs.getByName("speedometerReleaseSigning")',
        1,
    )

path.write_text(text)
PY
  else
    python3 - "$GRADLE_FILE" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text()

snippet = """
def speedometerKeystorePropertiesFile = rootProject.file("keystore.properties")
def speedometerKeystoreProperties = new Properties()
if (speedometerKeystorePropertiesFile.exists()) {
    speedometerKeystoreProperties.load(new FileInputStream(speedometerKeystorePropertiesFile))
}
"""

signing_snippet = """
        speedometerReleaseSigning {
            if (speedometerKeystorePropertiesFile.exists()) {
                storeFile file(speedometerKeystoreProperties['storeFile'])
                storePassword speedometerKeystoreProperties['storePassword']
                keyAlias speedometerKeystoreProperties['keyAlias']
                keyPassword speedometerKeystoreProperties['keyPassword']
            }
        }
"""

if "speedometerKeystorePropertiesFile" not in text:
    text = text.replace("android {", snippet + "\nandroid {", 1)

if "speedometerReleaseSigning" not in text:
    text = text.replace("signingConfigs {", "signingConfigs {\n" + signing_snippet, 1)

if "signingConfig signingConfigs.speedometerReleaseSigning" not in text:
    text = text.replace(
        "release {",
        "release {\n            signingConfig signingConfigs.speedometerReleaseSigning",
        1,
    )

path.write_text(text)
PY
  fi
fi

echo "Building signed release APK (optimized for install/distribution)..."
cd android
chmod +x ./gradlew
./gradlew assembleRelease --no-daemon

APK_SRC="app/build/outputs/apk/release/app-release.apk"

if [ ! -f "$APK_SRC" ]; then
  echo "Build finished but release APK was not found at $APK_SRC"
  exit 1
fi

cp "$APK_SRC" "$APK_OUT"
echo ""
echo "Production APK ready:"
echo "  $APK_OUT"
echo ""
echo "Install on a device:"
echo "  adb install -r \"$APK_OUT\""
echo ""
