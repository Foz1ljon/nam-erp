#!/usr/bin/env bash
# Builds the Android APK without Android Studio: installs JDK 21 and the Android SDK command-line
# tools (via Homebrew) on first run, then runs Gradle.
#   bash mobile/scripts/build-android.sh           → debug APK
#   bash mobile/scripts/build-android.sh release   → unsigned release APK
set -euo pipefail

MOBILE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VARIANT="${1:-debug}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
PLATFORM="platforms;android-36"
BUILD_TOOLS="build-tools;36.0.0"

command -v brew >/dev/null || { echo "Homebrew kerak: https://brew.sh" >&2; exit 1; }

# ---------------------------------------------------------------- JDK 21 (Gradle 8.14 / AGP 8.13)
if ! brew list openjdk@21 >/dev/null 2>&1; then
  echo "==> JDK 21 o'rnatilmoqda"
  brew install openjdk@21
fi
export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
java -version

# ---------------------------------------------------------------- Android SDK
if ! command -v sdkmanager >/dev/null; then
  echo "==> Android command-line tools o'rnatilmoqda"
  brew install --cask android-commandlinetools
fi
mkdir -p "$ANDROID_HOME"
if [ ! -d "$ANDROID_HOME/platforms/android-36" ] || [ ! -d "$ANDROID_HOME/build-tools/36.0.0" ]; then
  echo "==> Android SDK paketlari o'rnatilmoqda ($ANDROID_HOME)"
  # `yes` dies with SIGPIPE once sdkmanager exits, which pipefail would treat as a failure.
  (yes || true) | sdkmanager --sdk_root="$ANDROID_HOME" --licenses >/dev/null || true
  sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "$PLATFORM" "$BUILD_TOOLS"
fi
echo "sdk.dir=$ANDROID_HOME" > "$MOBILE_DIR/android/local.properties"

# ---------------------------------------------------------------- Web assets + Gradle
cd "$MOBILE_DIR"
pnpm install
pnpm build
pnpm exec cap sync android

cd android
chmod +x gradlew
if [ "$VARIANT" = "release" ]; then
  ./gradlew --no-daemon assembleRelease
  APK="app/build/outputs/apk/release/app-release-unsigned.apk"
else
  ./gradlew --no-daemon assembleDebug
  APK="app/build/outputs/apk/debug/app-debug.apk"
fi

mkdir -p "$MOBILE_DIR/release"
cp "$APK" "$MOBILE_DIR/release/nammotors-calls-$VARIANT.apk"
echo
echo "✅ APK tayyor: $MOBILE_DIR/release/nammotors-calls-$VARIANT.apk"
