# GE Metrics Trade Tracker

A RuneLite plugin that automatically tracks your Grand Exchange trades and syncs them to GE Metrics for profit analysis and flip tracking.

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

- **API URL**: Backend API URL (default: https://api.gemetrics.com)
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

