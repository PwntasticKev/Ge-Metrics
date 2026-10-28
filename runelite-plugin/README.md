# GE Metrics

A RuneLite plugin for GE Metrics: live item prices, GE item set profits, a buy assist, and automatic trade tracking.

## Running the dev client

Needs a JDK 11+ (`JAVA_HOME` set). From this folder:

```
./gradlew run      # downloads the RuneLite client and launches it in developer mode with this plugin
./gradlew test     # unit tests
```

The item set and tax-exempt data are exported from the web app. After those change, regenerate them from the repo root:

```
node runelite-plugin/scripts/export-data.mjs
```

## Panel

- **Prices**: search any tradeable item to see its latest low/high price. Click a row (or **Buy**) to queue it.
- **Sets**: every GE item set ranked by flip profit after tax. It uses the same math as the website (`src/domain/flipping/setFlip.js`): *combine* buys the parts low and sells the set high; *split* does the reverse. Expand a set to queue the set or any of its parts.
- **Account**: GE Metrics login and trade tracking.

Prices come from GE Metrics (`items.getAllItems`) when you're logged in with an active subscription. Otherwise they come from the OSRS Wiki prices API. The header shows which source is in use. Prices refresh every 60s.

## Buy assist

Jagex rules don't allow plugins to click or send game actions for you, so buying is assisted, not automatic:

1. Queue an item in the panel. The bar at the top shows its quantity and price, and you can edit both. The defaults come from config: price = low / low+1 / high, and quantity = a fixed number or the item's GE buy limit.
2. In-game, open a GE buy slot. The queued item appears as the first search result, labelled **GE Metrics:**. Click it.
3. In the quantity and price prompts, press the **fill hotkey** (default `E`). It types the queued value, then you press Enter and confirm.

## Features

- **Automatic Trade Tracking**: Automatically tracks all Grand Exchange offers (buy/sell)
- **Real-time Sync**: Syncs trades to GE Metrics backend in real-time
- **Offline Support**: Queues trades when offline and syncs when connection is restored
- **FIFO Matching**: Automatically matches buy/sell pairs using FIFO algorithm
- **Profit Tracking**: Calculates profit including 2% GE tax
- **Multi-Account Support**: Track multiple OSRS accounts linked to one web account

## Installation

1. Install from RuneLite Plugin Hub (after submission)
2. Open plugin settings
3. Log in with your GE Metrics account (or create one)
4. Enable trade tracking

## Configuration

- **API URL**: Backend API URL (default: https://www.ge-metrics.com)
- **Enable Trade Tracking**: Toggle automatic trade tracking
- **Auto Sync**: Automatically sync trades to server
- **Sync Interval**: How often to sync trades (in seconds)

## Usage

Once installed and configured:

1. Log in with your GE Metrics account credentials
2. The plugin will automatically track all Grand Exchange offers
3. Trades are synced to the GE Metrics website in real-time
4. View your trade history, profit analysis, and flip statistics on the web app

## Authentication

The plugin requires a GE Metrics account. You can:
- Create an account directly in the plugin UI
- Log in with existing credentials
- Your session persists across RuneLite restarts

## Privacy

- All trades are private by default
- Only you can see your trade data
- Data is encrypted in transit
- No sharing of trade data with third parties

## Support

For issues or questions:
- GitHub: https://github.com/yourusername/ge-metrics-runelite-plugin
- Discord: [Join GE Metrics Discord]
- Website: https://gemetrics.com

## License

This plugin is licensed under the MIT License.

