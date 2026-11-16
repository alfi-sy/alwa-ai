#!/usr/bin/env bash
# Build APK di komputer sendiri. Butuh: Node.js 18+, JDK 17, Android SDK (ANDROID_HOME).
set -e
npm install
[ -d android ] || npx cap add android
npx capacitor-assets generate --android
npx cap sync android
cd android && chmod +x gradlew && ./gradlew assembleDebug
echo "APK: android/app/build/outputs/apk/debug/app-debug.apk"
