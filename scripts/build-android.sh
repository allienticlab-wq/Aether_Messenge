#!/usr/bin/env bash
# ==============================================================================
# Aether Messenger - Android APK & TWA Build Script
# Configured for Production URL: https://aether.xperiserv.in/
# Developer: Allientic Lab Technologies
# ==============================================================================

set -e

echo "=== [1/3] Packaging Android Studio Project ==="
mkdir -p public/downloads
python3 -c "
import zipfile, os

def zip_dir(path, zip_handle):
    for root, dirs, files in os.walk(path):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, '.')
            zip_handle.write(full_path, rel_path)

with zipfile.ZipFile('public/downloads/aether-android-project.zip', 'w', zipfile.ZIP_DEFLATED) as zipf:
    zip_dir('android', zipf)
    if os.path.exists('capacitor.config.json'): zipf.write('capacitor.config.json')
    if os.path.exists('twa-manifest.json'): zipf.write('twa-manifest.json')
    if os.path.exists('public/manifest.webmanifest'): zipf.write('public/manifest.webmanifest', 'manifest.webmanifest')

print('✔ Android project archive created at public/downloads/aether-android-project.zip')
"

echo ""
echo "=== [2/3] Quick Build Options for https://aether.xperiserv.in/ ==="
echo ""
echo "OPTION A: Build Native APK with Gradle / Android Studio"
echo "  1. Download or extract the 'android/' directory into Android Studio"
echo "  2. Go to 'Build' -> 'Build Bundle(s) / APK(s)' -> 'Build APK(s)'"
echo "  3. The compiled APK will be located at:"
echo "     android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "OPTION B: One-Command Bubblewrap TWA (Google Play Store Ready)"
echo "  Run:"
echo "    npx @bubblewrap/cli build"
echo "  This compiles app-release-signed.apk and app-release-bundle.aab"
echo ""
echo "OPTION C: Progressive Web App (PWA) One-Tap Install"
echo "  Open https://aether.xperiserv.in/ on any Android device in Chrome/Brave"
echo "  Tap 'Install App' or 'Add to Home Screen' - runs in full standalone mode!"
echo ""
echo "=== [3/3] Verification Endpoints ==="
echo "  Manifest:   https://aether.xperiserv.in/manifest.webmanifest"
echo "  AssetLinks:  https://aether.xperiserv.in/.well-known/assetlinks.json"
echo "  Download:   https://aether.xperiserv.in/downloads/aether-android-project.zip"
echo "=== Complete! ==="
