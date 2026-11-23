# GE Metrics (RuneLite plugin, lite)

A RuneLite side panel with live Grand Exchange prices, GE item set flip profits after tax, and a buy assist.

No account, no login, no GE Metrics backend. The only network call is the [OSRS Wiki real-time prices API](https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices).

## Status

- Code is written but has **not been compiled or tested on this branch**. The machine it was written on had no JDK. Run the steps below before trusting it.
- Not yet submitted to the Plugin Hub. See [PLUGIN_HUB_SUBMISSION.md](PLUGIN_HUB_SUBMISSION.md).
- Removed in 2.0.0: login/registration, token refresh, the Account tab, trade tracking/sync to ge-metrics.com, and the GE Metrics price source. The backend those used is offline.

## Build, test and run

1. Install a JDK 11 or newer (for example [Eclipse Temurin](https://adoptium.net/)). Check it with `java -version`, and set `JAVA_HOME` if Gradle can't find it.
2. From this `runelite-plugin/` folder:

   ```
   ./gradlew test     # unit tests (Windows: gradlew.bat test)
   ./gradlew run      # downloads RuneLite and opens the dev client with this plugin loaded
   ```

3. In the dev client, log in to a game account and check, at the GE:
   - the GE Metrics side panel opens and the header says `Prices: OSRS Wiki (...s ago)`
   - **Prices**: search finds items and shows low/high prices
   - **Sets**: sets are ranked by profit
   - **Buy assist**: queue an item, open a GE buy slot, the item shows as the first search result. Click it. In the quantity and price prompts press the fill hotkey (default `E`), then press Enter yourself

The item set and tax-exempt data are exported from the web app. After those change, regenerate them from the repo root:

```
node runelite-plugin/scripts/export-data.mjs
```

## Panel

- **Prices**: search any tradeable item to see its latest low/high price. Click a row (or **Buy**) to queue it.
- **Sets**: every GE item set ranked by flip profit after tax, with the same math as the website (`src/domain/flipping/setFlip.js`). *Combine* buys the parts low and sells the set high; *split* does the reverse.

Prices refresh every 60 seconds from `https://prices.runescape.wiki/api/v1/osrs/latest`, with the User-Agent `GE Metrics RuneLite plugin - https://github.com/PwntasticKev/Ge-Metrics`, as the wiki asks. Item names and GE buy limits come from RuneLite's own item data, so `/mapping` isn't needed.

GE tax (`sets/GeTax.java`): 2% of the sell price per item, rounded down, capped at 5,000,000 gp. Items sold for under 50 gp, and the ids in `tax-exempt.json`, pay no tax.

## Buy assist

The plugin never clicks, presses keys or submits offers for you:

1. Queue an item in the panel. The bar at the top shows the quantity and price, and you can edit both. Defaults come from config: price = low / low + 1 / high; quantity = a fixed number or the item's GE buy limit.
2. Open a GE buy slot. The queued item appears as the first search result, labelled **GE Metrics:**. You click it.
3. In the quantity and price prompts, press the fill hotkey (default `E`). It types the queued number into the chatbox. You press Enter and confirm the offer.

## Configuration

- **Buy price**: low, low + 1 gp, or high
- **Default quantity**: 0 uses the item's GE buy limit
- **Fill offer hotkey**: default `E`

## Data and privacy

The plugin sends nothing about you or your account anywhere. Its only request is a GET of the public wiki price list. It doesn't store anything outside RuneLite's normal config.

## License

No license file yet. The Plugin Hub needs one in the submitted repo; the plugin template uses BSD 2-Clause. Pick one and add `LICENSE` before submitting.
