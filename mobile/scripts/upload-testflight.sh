#!/usr/bin/env bash
# Build GE Metrics locally and upload it to TestFlight. No EAS.
#
# Prereqs (one-time):
#   - App record "GE Metrics" (bundle id com.gemetrics.app) exists in App Store Connect.
#   - "Apple Distribution" cert in the login keychain.
#   - App Group group.com.gemetrics.app created at developer.apple.com and
#     assigned to com.gemetrics.app and com.gemetrics.app.widget.
#   - App Store provisioning profiles for both bundle ids installed:
#     `node scripts/appstore-profiles.mjs` creates and installs them. The newest
#     installed App Store profile per bundle id is used, whatever its name.
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
WIDGET_BUNDLE_ID="${BUNDLE_ID}.widget"
ASC_KEY_ID="${GEM_ASC_KEY_ID:?Set GEM_ASC_KEY_ID to your App Store Connect API key id}"
ASC_ISSUER_ID="${GEM_ASC_ISSUER_ID:?Set GEM_ASC_ISSUER_ID to your App Store Connect issuer id}"
ASC_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"
BUILD_DIR="build/ios"
ARCHIVE="$BUILD_DIR/GEMetrics.xcarchive"

[ -f "$ASC_KEY_PATH" ] || { echo "ERROR: API key not found at $ASC_KEY_PATH" >&2; exit 1; }

# Name of the newest installed App Store (no device list, not debuggable)
# profile for a bundle id.
appstore_profile_name() {
  local app_id="$TEAM_ID.$1" newest="" newest_date="" file plist
  plist=$(mktemp)
  for file in "$HOME/Library/MobileDevice/Provisioning Profiles"/*.mobileprovision \
              "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"/*.mobileprovision; do
    [ -f "$file" ] || continue
    security cms -D -i "$file" > "$plist" 2>/dev/null || continue
    [ "$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' "$plist" 2>/dev/null)" = "$app_id" ] || continue
    [ "$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:get-task-allow' "$plist" 2>/dev/null)" = "false" ] || continue
    /usr/libexec/PlistBuddy -c 'Print :ProvisionedDevices' "$plist" >/dev/null 2>&1 && continue
    local created
    created=$(date -j -f "%a %b %d %T %Z %Y" "$(/usr/libexec/PlistBuddy -c 'Print :CreationDate' "$plist")" +%s)
    if [ -z "$newest_date" ] || [ "$created" -gt "$newest_date" ]; then
      newest_date=$created
      newest=$(/usr/libexec/PlistBuddy -c 'Print :Name' "$plist")
    fi
  done
  rm -f "$plist"
  [ -n "$newest" ] || { echo "ERROR: no App Store profile installed for $1 (run node scripts/appstore-profiles.mjs)" >&2; return 1; }
  echo "$newest"
}

APP_PROFILE=$(appstore_profile_name "$BUNDLE_ID")
WIDGET_PROFILE=$(appstore_profile_name "$WIDGET_BUNDLE_ID")
echo "==> Profiles: \"$APP_PROFILE\", \"$WIDGET_PROFILE\""

echo "==> Generating native project (manual App Store signing per target)"
CI=1 GEM_APPSTORE_SIGNING=1 GEM_TEAM_ID="$TEAM_ID" GEM_APP_PROFILE="$APP_PROFILE" GEM_WIDGET_PROFILE="$WIDGET_PROFILE" \
  npx expo prebuild --platform ios --no-install
(cd ios && pod install)

WORKSPACE=$(ls -d ios/*.xcworkspace | head -1)
SCHEME=$(basename "$WORKSPACE" .xcworkspace)

# Signing settings (profile per target) come from plugins/withAppStoreSigning.js;
# a command-line PROVISIONING_PROFILE_SPECIFIER would apply one profile to
# both the app and the widget.
echo "==> Archiving $SCHEME (Release, manual signing)"
rm -rf "$ARCHIVE"
xcodebuild archive \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE" \
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
    <key>${BUNDLE_ID}</key><string>${APP_PROFILE}</string>
    <key>${WIDGET_BUNDLE_ID}</key><string>${WIDGET_PROFILE}</string>
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
