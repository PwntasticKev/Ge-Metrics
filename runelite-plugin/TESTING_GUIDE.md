# 🧪 Testing Guide: RuneLite Plugin in RuneLite Client

## ⚡ Quick Start (5 Minutes)

### Step 1: Build Plugin
```bash
cd runelite-plugin
./gradlew build
```

**Output**: `build/libs/ge-metrics-1.0.0.jar`

### Step 2: Update API URL (CRITICAL!)
**File**: `src/main/java/com/gemetrics/plugin/GeMetricsConfig.java`

**Line 17** - Change to your backend URL:
```java
return "http://localhost:4000"; // For local testing
```

**Rebuild**:
```bash
./gradlew build
```

### Step 3: Load Plugin in RuneLite

**Method 1: External Plugin Manager** (Easiest - Recommended)

1. **Install RuneLite Client**
   - Download from: https://runelite.net/
   - Install and launch

2. **Enable External Plugin Manager**
   - Open RuneLite
   - Go to **Settings** → **Plugins**
   - Search for **"External Plugin Manager"**
   - Check the box to enable it
   - Restart RuneLite if prompted

3. **Load Your Plugin**
   - After restart, go to **Settings** → **External Plugins**
   - Click **"Add Plugin"** button
   - Navigate to: `runelite-plugin/build/libs/ge-metrics-1.0.0.jar`
   - Select the JAR file
   - Click **"Open"**

4. **Enable Plugin**
   - Find **"GE Metrics Trade Tracker"** in the plugin list
   - Check the box to enable it
   - Plugin should now be active!

**Method 2: Development Mode** (For debugging)

1. **Clone RuneLite**:
   ```bash
   git clone https://github.com/runelite/runelite.git
   cd runelite
   ```

2. **Set Up IntelliJ IDEA**:
   - Open IntelliJ IDEA
   - File → Open → Select `runelite` folder
   - Wait for Gradle sync
   - Set Project SDK to Java 11

3. **Copy Plugin Files**:
   ```bash
   # From your project root
   cp -r runelite-plugin/src/main/java/com/gemetrics/plugin runelite/runelite-client/src/main/java/com/gemetrics/
   cp -r runelite-plugin/src/main/resources runelite/runelite-client/src/main/resources/ge-metrics
   ```

4. **Run RuneLite**:
   - In IntelliJ, find `runelite-client` module
   - Find `Client` class
   - Right-click → Run 'Client.main()'
   - RuneLite will start with your plugin

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] **Plugin Loads**: No errors in RuneLite console
- [ ] **UI Panel**: "GE Metrics" button appears in sidebar
- [ ] **Panel Opens**: Clicking button shows login panel
- [ ] **Fields Work**: Can type in email/password fields

### Authentication
- [ ] **Login**: Can login with credentials
- [ ] **Registration**: Can create new account
- [ ] **Token Persists**: Restart RuneLite, still logged in
- [ ] **Error Messages**: Shows errors for invalid credentials

### Trade Tracking
- [ ] **Event Listener**: Make GE offer, see log message
- [ ] **Trade Sync**: Trades sync to backend
- [ ] **Item Names**: Item names correct (not "Item 123")
- [ ] **Offline Queue**: Disconnect network, make trades, reconnect

### Backend Integration
- [ ] **Database**: Trades appear in `trade_events` table
- [ ] **OSRS Account**: Account created/linked correctly
- [ ] **FIFO Matching**: Buy then sell creates match
- [ ] **Open Positions**: Unmatched buys tracked

---

## 🔍 Viewing Logs & Debugging

### RuneLite Console
**View → Show Console** (or `Ctrl+Shift+C` / `Cmd+Shift+C`)

**Look for**:
- `[GE Metrics]` or `[GeMetricsPlugin]` messages
- `"GE Metrics plugin started!"`
- `"Successfully synced X trades"`
- `"Detected OSRS username: YourName"`
- Any error messages

### Log File Location
- **macOS**: `~/.runelite/logs/client.log`
- **Windows**: `%USERPROFILE%\.runelite\logs\client.log`
- **Linux**: `~/.runelite/logs/client.log`

**View logs**:
```bash
# macOS/Linux
tail -f ~/.runelite/logs/client.log | grep -i "gemetrics"

# Windows (PowerShell)
Get-Content $env:USERPROFILE\.runelite\logs\client.log | Select-String "gemetrics"
```

---

## 🐛 Troubleshooting

### Plugin Not Appearing
**Problem**: Plugin doesn't show in list
**Solutions**:
- Verify External Plugin Manager is enabled
- Check JAR file exists: `ls -la build/libs/ge-metrics-1.0.0.jar`
- Check RuneLite console for errors
- Try restarting RuneLite

### Plugin Loads But Panel Doesn't Appear
**Problem**: No "GE Metrics" button in sidebar
**Solutions**:
- Check plugin is enabled in Settings → Plugins
- Check console for errors
- Verify icon.png exists (plugin creates default if missing)

### Can't Login
**Problem**: Login fails
**Solutions**:
- Verify backend is running: `curl http://localhost:4000/health`
- Check API URL in config matches backend
- Check backend logs for errors
- Verify database migration ran
- Check console for detailed error messages

### Trades Not Syncing
**Problem**: Trades tracked but not syncing
**Solutions**:
- Check you're logged in (panel shows "Logged in successfully!")
- Check console for sync messages
- Verify backend endpoint: `curl -X POST http://localhost:4000/trpc/runelite.trades.submit`
- Check database for trade_events: `SELECT * FROM trade_events LIMIT 5;`
- Verify network connectivity

### Build Errors
**Problem**: `./gradlew build` fails
**Solutions**:
```bash
# Clean and rebuild
./gradlew clean build

# Check Java version
java -version  # Should be 11+

# Check Gradle
./gradlew --version
```

---

## 🎯 Step-by-Step Test Flow

### Test 1: Basic Plugin Loading
1. Build plugin: `./gradlew build`
2. Load in RuneLite External Plugin Manager
3. Enable plugin
4. Check console for: `"GE Metrics plugin started!"`
5. ✅ **Success**: Plugin loads without errors

### Test 2: UI Panel
1. Look for "GE Metrics" button in sidebar
2. Click button
3. Panel should open showing login form
4. ✅ **Success**: Panel opens and shows login form

### Test 3: Login
1. Enter email/password in plugin panel
2. Click "Login"
3. Should see "Login successful!" message
4. Panel should update to show "Logged in successfully!"
5. ✅ **Success**: Login works and token persists

### Test 4: Trade Tracking
1. Make a GE buy offer in game
2. Complete the offer
3. Check console for: `"Successfully synced 1 trades"`
4. Check database: `SELECT * FROM trade_events ORDER BY created_at DESC LIMIT 1;`
5. ✅ **Success**: Trade appears in database

### Test 5: OSRS Username Detection
1. Check console for: `"Detected OSRS username: YourName"`
2. Verify username appears in database: `SELECT osrs_username FROM osrs_accounts;`
3. ✅ **Success**: Username detected correctly

### Test 6: Offline Queue
1. Disconnect network (turn off WiFi/ethernet)
2. Make GE trades in game
3. Check console for: `"Added trade to pending queue"`
4. Reconnect network
5. Check console for: `"Successfully synced X trades"`
6. ✅ **Success**: Trades sync after reconnection

---

## 📝 Important Notes

### Before Testing
1. ✅ **Backend Running**: Start your backend server
2. ✅ **Migration Run**: Database tables must exist
3. ✅ **API URL Updated**: Config must point to correct backend
4. ✅ **Database Accessible**: Backend must be able to connect

### During Testing
- **Monitor Console**: Always check RuneLite console for errors
- **Check Backend Logs**: Monitor backend logs for API calls
- **Test Offline**: Test offline queue functionality
- **Test Errors**: Test error scenarios (invalid credentials, network errors)

### After Testing
- **Review Logs**: Check all logs for issues
- **Fix Issues**: Address any problems found
- **Document**: Note any issues or improvements needed

---

## 🚀 Quick Commands

```bash
# Build plugin
cd runelite-plugin && ./gradlew build

# Check JAR exists
ls -lh build/libs/ge-metrics-1.0.0.jar

# View plugin location
echo "Load this file in RuneLite External Plugin Manager:"
echo "$(pwd)/build/libs/ge-metrics-1.0.0.jar"

# Clean build
./gradlew clean build

# Check Java version
java -version  # Should be 11+

# Check Gradle version
./gradlew --version
```

---

## 🎉 Success Indicators

**You know it's working when**:
- ✅ Plugin appears in plugin list
- ✅ "GE Metrics" button in sidebar
- ✅ Can login via plugin UI
- ✅ Console shows: `"Successfully synced X trades"`
- ✅ Trades appear in database
- ✅ No errors in console

**Ready to test!** 🚀

