#!/usr/bin/env bash
# Builds a signed release APK (and AAB for the Play Store) of the TWA.
# Needs the portable JDK + Android SDK in ../.android-tools and the git-ignored release.keystore + keystore-password.txt.
set -euo pipefail
cd "$(dirname "$0")"
TOOLS="$(cd ../.android-tools && pwd -W 2>/dev/null || pwd)"
export JAVA_HOME="$TOOLS/jdk-17.0.21+9"
export ANDROID_HOME="$TOOLS/sdk"
BT="$ANDROID_HOME/build-tools/36.1.0"
PW="$(sed -n 's/^store password: //p' keystore-password.txt | tr -d '\r')"

if [[ "$OSTYPE" == msys* || "$OSTYPE" == cygwin* ]]; then GRADLE=./gradlew.bat; else GRADLE=./gradlew; fi
$GRADLE assembleRelease bundleRelease --quiet

"$BT/zipalign" -f -p 4 app/build/outputs/apk/release/app-release-unsigned.apk app-release-aligned.apk
APKSIGNER="$BT/apksigner"; [[ -f "$APKSIGNER.bat" ]] && APKSIGNER="$APKSIGNER.bat"
"$APKSIGNER" sign --ks release.keystore --ks-key-alias deutschlernen --ks-pass "pass:$PW" --key-pass "pass:$PW" \
  --out deutsch-lernen.apk app-release-aligned.apk
rm -f app-release-aligned.apk deutsch-lernen.apk.idsig
"$APKSIGNER" verify deutsch-lernen.apk

"$JAVA_HOME/bin/jarsigner" -keystore release.keystore -storepass "$PW" -keypass "$PW" \
  -signedjar deutsch-lernen.aab app/build/outputs/bundle/release/app-release.aab deutschlernen > /dev/null
echo "Built: android/deutsch-lernen.apk and android/deutsch-lernen.aab"
