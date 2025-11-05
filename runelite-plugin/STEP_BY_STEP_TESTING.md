# 🚀 Step-by-Step: Testing GE Metrics Plugin in RuneLite Client

Based on the [RuneLite Developer Guide](https://github.com/runelite/runelite/wiki/Developer-Guide), here's how to test your plugin.

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Java 11+ installed (`java -version`)
- [ ] RuneLite client installed (download from https://runelite.net/)
- [ ] Backend server running (for API calls)
- [ ] Database migration completed (tables must exist)

---

## Method 1: External Plugin Manager (Easiest - Recommended)

This is the fastest way to test your plugin without setting up a full development environment.

### Step 1: Update API URL

**File**: `runelite-plugin/src/main/java/com/gemetrics/plugin/GeMetricsConfig.java`

**Line 17** - Change to your backend URL:
```java
default String apiUrl()
{
    return "http://localhost:4000"; // For local testing
    // OR
    return "https://your-production-url.com"; // For production
}
```

### Step 2: Build the Plugin

```bash
cd runelite-plugin
./gradlew build
```

**Expected Output**:
```
BUILD SUCCESSFUL in Xs
```

**Verify JAR exists**:
```bash
ls -lh build/libs/ge-metrics-1.0.0.jar
```

**Location**: `runelite-plugin/build/libs/ge-metrics-1.0.0.jar`

### Step 3: Enable External Plugin Manager in RuneLite

1. **Launch RuneLite** client
2. **Open Settings**:
   - Click the wrench icon (⚙️) in the top-right corner
   - OR press `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS)
3. **Navigate to Plugins**:
   - Click "Plugins" in the left sidebar
4. **Enable External Plugin Manager**:
   - Search for "External Plugin Manager"
   - Check the box to enable it
   - If prompted, restart RuneLite

### Step 4: Load Your Plugin

1. **After restart** (if required), go back to **Settings**
2. **Click "External Plugins"** in the left sidebar
3. **Click "Add Plugin"** button (usually at the top)
4. **Navigate to your JAR file**:
   - File browser opens
   - Navigate to: `runelite-plugin/build/libs/ge-metrics-1.0.0.jar`
   - Select the file
   - Click "Open"
5. **Plugin should appear** in the External Plugins list

### Step 5: Enable and Test Plugin

1. **Find "GE Metrics Trade Tracker"** in the plugin list
2. **Check the box** to enable it
3. **Verify Plugin Loaded**:
   - Look for "GE Metrics" button in the RuneLite sidebar
   - Open console: **View → Show Console** (or `Ctrl+Shift+C` / `Cmd+Shift+C`)
   - Should see: `[GE Metrics] GE Metrics plugin started!`

### Step 6: Test Plugin Functionality

#### A. Test UI Panel
1. **Click "GE Metrics" button** in sidebar
2. **Panel should open** showing login form
3. **Verify fields work**: Can type in email/password fields

#### B. Test Login
1. **Enter credentials** in plugin panel
2. **Click "Login"** button
3. **Should see**: "Login successful!" message
4. **Panel updates**: Shows "Logged in successfully!"

#### C. Test Trade Tracking
1. **Log in to OSRS** through RuneLite
2. **Make a GE offer** (buy or sell)
3. **Complete the offer**
4. **Check console** for:
   - `[GE Metrics] Successfully synced 1 trades`
   - `[GE Metrics] Detected OSRS username: YourName`
5. **Verify in database**:
   ```sql
   SELECT * FROM trade_events ORDER BY created_at DESC LIMIT 5;
   ```

---

## Method 2: Full Development Environment (For Debugging)

For advanced debugging with breakpoints and full IDE integration.

### Step 1: Clone RuneLite Repository

```bash
git clone https://github.com/runelite/runelite.git
cd runelite
```

### Step 2: Set Up IntelliJ IDEA

1. **Install IntelliJ IDEA** (Community Edition is free)
2. **Open IntelliJ IDEA**
3. **File → Open** → Select the `runelite` folder
4. **Wait for Gradle sync** (may take 5-10 minutes first time)
5. **Configure Project**:
   - **File → Project Structure → Project**
   - Set **SDK** to Java 11
   - Set **Language level** to 11

### Step 3: Copy Plugin Files to RuneLite

**From your project root**:

```bash
# Copy Java source files
cp -r runelite-plugin/src/main/java/com/gemetrics/plugin runelite/runelite-client/src/main/java/com/gemetrics/

# Copy resources (icon, properties)
cp -r runelite-plugin/src/main/resources runelite/runelite-client/src/main/resources/ge-metrics
```

### Step 4: Update RuneLite Build Configuration

**File**: `runelite/runelite-client/build.gradle`

Add dependencies if needed (should already be in RuneLite):
```gradle
dependencies {
    // ... existing dependencies ...
    
    // Your plugin dependencies (if not already present)
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
}
```

### Step 5: Run RuneLite from IntelliJ

1. **In IntelliJ**, find `runelite-client` module
2. **Find `Client` class**:
   - Path: `runelite-client/src/main/java/net/runelite/client/RuneLite.java`
3. **Right-click** → **Run 'RuneLite.main()'**
   - OR use Run Configuration:
     - **Run → Edit Configurations**
     - Click **+** → **Application**
     - Name: `RuneLite`
     - Main class: `net.runelite.client.RuneLite`
     - Working directory: `runelite-client` folder
4. **RuneLite client starts** with your plugin

### Step 6: Enable Plugin in Dev Client

1. **Settings → Plugins**
2. **Find "GE Metrics Trade Tracker"**
3. **Enable it**
4. **Test as described in Method 1, Step 6**

---

## 🔍 Viewing Logs & Debugging

### RuneLite Console
**Access**: View → Show Console (or `Ctrl+Shift+C` / `Cmd+Shift+C`)

**Look for**:
- `[GE Metrics]` or `[GeMetricsPlugin]` prefixed messages
- `"GE Metrics plugin started!"`
- `"Successfully synced X trades"`
- `"Detected OSRS username: YourName"`
- Error messages (if any)

### Log File Location
- **macOS**: `~/.runelite/logs/client.log`
- **Windows**: `%USERPROFILE%\.runelite\logs\client.log`
- **Linux**: `~/.runelite/logs/client.log`

**View logs**:
```bash
# macOS/Linux - Watch logs in real-time
tail -f ~/.runelite/logs/client.log | grep -i "gemetrics"

# Windows (PowerShell)
Get-Content $env:USERPROFILE\.runelite\logs\client.log -Wait | Select-String "gemetrics"
```

### Debugging in IntelliJ
1. **Set breakpoints** in your plugin code
2. **Run in debug mode**: Right-click → Debug 'RuneLite.main()'
3. **Step through code** when breakpoints hit
4. **Inspect variables** in debug panel

---

## ✅ Testing Checklist

### Basic Functionality
- [ ] Plugin builds without errors
- [ ] JAR file created successfully
- [ ] Plugin loads in RuneLite (no errors in console)
- [ ] "GE Metrics" button appears in sidebar
- [ ] Panel opens when button clicked
- [ ] Login form displays correctly

### Authentication
- [ ] Can create new account via plugin UI
- [ ] Can login with credentials
- [ ] Login successful message appears
- [ ] Token persists after RuneLite restart
- [ ] Error messages show for invalid credentials

### Trade Tracking
- [ ] GE offer changes trigger event listener
- [ ] Console shows trade tracking messages
- [ ] Trades sync to backend successfully
- [ ] Trades appear in database (`trade_events` table)
- [ ] Item names correct (not "Item 123")
- [ ] OSRS username detected correctly

### Advanced Features
- [ ] Offline queue works (disconnect, make trades, reconnect)
- [ ] Batch syncing works (multiple trades)
- [ ] Error handling works (network errors)
- [ ] Rate limiting works (if testing many trades)

---

## 🐛 Troubleshooting

### Build Fails
**Problem**: `./gradlew build` fails
**Solutions**:
```bash
# Check Java version
java -version  # Should be 11+

# Clean and rebuild
./gradlew clean build

# Check Gradle wrapper
./gradlew --version
```

### Plugin Not Appearing
**Problem**: Plugin doesn't show in External Plugins list
**Solutions**:
- Verify External Plugin Manager is enabled
- Check JAR file exists: `ls -la build/libs/ge-metrics-1.0.0.jar`
- Check RuneLite console for errors
- Try restarting RuneLite
- Verify `runelite-plugin.properties` is correct

### Panel Doesn't Appear
**Problem**: No "GE Metrics" button in sidebar
**Solutions**:
- Check plugin is enabled in Settings → Plugins
- Check RuneLite console for errors
- Verify icon.png exists (plugin creates default if missing)
- Check for null pointer exceptions in logs

### Can't Login
**Problem**: Login fails
**Solutions**:
- Verify backend is running: `curl http://localhost:4000/health`
- Check API URL in config matches backend
- Check backend logs for errors
- Verify database migration ran
- Check console for detailed error messages
- Verify email is verified (if backend requires it)

### Trades Not Syncing
**Problem**: Trades tracked but not syncing to backend
**Solutions**:
- Verify you're logged in (panel shows "Logged in successfully!")
- Check console for sync messages
- Verify backend endpoint accessible: `curl -X POST http://localhost:4000/trpc/runelite.trades.submit`
- Check database for trade_events: `SELECT * FROM trade_events LIMIT 5;`
- Verify network connectivity
- Check backend logs for incoming requests

---

## 🎯 Quick Test Flow

1. **Build**: `cd runelite-plugin && ./gradlew build`
2. **Update API URL** in `GeMetricsConfig.java`
3. **Rebuild**: `./gradlew build`
4. **Load in RuneLite**: External Plugin Manager → Add Plugin → Select JAR
5. **Enable Plugin**: Check box in plugin list
6. **Open Console**: View → Show Console
7. **Test Login**: Enter credentials in plugin panel
8. **Make GE Trade**: Complete an offer in game
9. **Verify**: Check console for sync messages, check database for trades

---

## 📚 Reference Links

- [RuneLite Developer Guide](https://github.com/runelite/runelite/wiki/Developer-Guide)
- [RuneLite Plugin Hub Guide](https://github.com/runelite/runelite/wiki/Information-about-the-Plugin-Hub)
- [Building with IntelliJ IDEA](https://github.com/runelite/runelite/wiki/Building-with-IntelliJ-IDEA)
- [RuneLite API Javadoc](https://runelite.github.io/runelite/)
- [RuneLite Client Javadoc](https://runelite.github.io/runelite-client/)

---

## 🎉 Success Indicators

**You know it's working when**:
- ✅ Plugin appears in plugin list
- ✅ "GE Metrics" button in sidebar
- ✅ Can login via plugin UI
- ✅ Console shows: `"Successfully synced X trades"`
- ✅ Trades appear in database
- ✅ No errors in console
- ✅ OSRS username detected

**Ready to test!** 🚀

