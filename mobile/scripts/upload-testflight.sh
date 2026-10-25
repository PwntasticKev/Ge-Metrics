#!/usr/bin/env bash
# Build GE Metrics locally and upload it to TestFlight. No EAS.
#
# Prereqs (one-time):
#   - App record "GE Metrics" (bundle id com.gemetrics.app) exists in App Store Connect.
#   - "Apple Distribution" cert in the login keychain and the
#     "com.gemetrics.app AppStore" provisioning profile installed.
#   - An App Store Connect API key at ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8
#
# Usage:
#   GEM_ASC_KEY_ID=XXXXXXXXXX GEM_ASC_ISSUER_ID=xxxxxxxx-... ./scripts/upload-testflight.sh
#
# Build numbers are bumped automatically by App Store Connect at export
# (manageAppVersionAndBuildNumber). Bump "version" in app.json for a new release.
#
# If codesign fails with errSecInternalComponent, run once in your own terminal:
#   security set-key-partition-list -S apple-tool:,apple:,codesign: -s ~/Library/Keychains/login.keychain-db
set -euo pipefail
cd "$(dirname "$0")/.."

TEAM_ID="${GEM_TEAM_ID:-XJBL9CTNPM}"
BUNDLE_ID="com.gemetrics.app"
PROFILE_NAME="com.gemetrics.app AppStore"
ASC_KEY_ID="${GEM_ASC_KEY_ID:?Set GEM_ASC_KEY_ID to your App Store Connect API key id}"
ASC_ISSUER_ID="${GEM_ASC_ISSUER_ID:?Set GEM_ASC_ISSUER_ID to your App Store Connect issuer id}"
ASC_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
BUILD_DIR="build/ios"
ARCHIVE="$BUILD_DIR/GEMetrics.xcarchive"

[ -f "$ASC_KEY_PATH" ] || { echo "ERROR: API key not found at $ASC_KEY_PATH" >&2; exit 1; }

echo "==> Generating native project"
CI=1 npx expo prebuild --platform ios --no-install
(cd ios && pod install)

WORKSPACE=$(ls -d ios/*.xcworkspace | head -1)
SCHEME=$(basename "$WORKSPACE" .xcworkspace)

echo "==> Archiving $SCHEME (Release, manual signing)"
rm -rf "$ARCHIVE"
xcodebuild archive \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE" \
  CODE_SIGN_STYLE=Manual \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="$PROFILE_NAME" \
  | tail -n 40

[ -d "$ARCHIVE" ] || { echo "ERROR: archive was not produced" >&2; exit 1; }

echo "==> Exporting and uploading to App Store Connect"
cat > "$BUILD_DIR/ExportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>${TEAM_ID}</string>
  <key>signingStyle</key><string>manual</string>
  <key>signingCertificate</key><string>Apple Distribution</string>
  <key>provisioningProfiles</key><dict>
    <key>${BUNDLE_ID}</key><string>${PROFILE_NAME}</string>
  </dict>
  <key>manageAppVersionAndBuildNumber</key><true/>
</dict></plist>
PLIST

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist "$BUILD_DIR/ExportOptions.plist" \
  -exportPath "$BUILD_DIR/export" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"

echo "==> Uploaded. It shows up in TestFlight after Apple finishes processing (usually 5-15 minutes)."
