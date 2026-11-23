# GE Metrics - Plugin Hub submission

## Status (honest)

- **Not compiled, not tested, not submitted.** The 2.0.0 "lite" changes were written without a JDK available, so `./gradlew test` and `./gradlew run` have never run on this code. Expect to fix small compile errors.
- No `LICENSE` file yet (required by the Hub).
- Lives in a subfolder of the Ge-Metrics monorepo. The Hub builds a repo at a commit, so it needs its own repo (step 3).

## Plugin information

- **Name**: GE Metrics
- **Package**: `com.gemetrics.plugin`
- **Main class**: `com.gemetrics.plugin.GeMetricsPlugin`
- **Version**: 2.0.0

## Description

Live GE prices from the OSRS Wiki, item set flip profits after GE tax, and a GE buy assist. No account needed.

## Hub requirements

| Requirement | Status |
| --- | --- |
| No automated game input (clicks, menu entries, key presses, offer submission) | Yes. `GeBuyAssist` adds a clickable row to the GE item search (it only runs when the player clicks it) and, when the player presses the hotkey in a quantity/price prompt, puts the number in the chatbox input. The player presses Enter and confirms the offer. Same approach as Flipping Copilot. |
| No third-party login or account | Yes. Login, registration and token refresh were removed. |
| Network calls | Only `GET https://prices.runescape.wiki/api/v1/osrs/latest`, every 60 s, via RuneLite's injected `OkHttpClient`. Parsed with the injected `Gson`. |
| Descriptive User-Agent for the wiki API | Yes: `GE Metrics RuneLite plugin - https://github.com/PwntasticKev/Ge-Metrics` (`PriceService.USER_AGENT`) |
| No data uploaded | Yes. Trade tracking/sync was removed. Nothing about the player leaves the client. |
| No native or extra runtime dependencies | Yes. Only RuneLite (compileOnly) and Lombok. |
| Background work stops on shutdown | Yes. `shutDown()` stops price polling and unregisters the buy assist. |
| Icon `icon.png`, max 48x72 | Yes, 48x48 |

## Steps to submit

1. **Install a JDK 11+** (e.g. Eclipse Temurin). Check: `java -version`.
2. **Test locally**, from `runelite-plugin/`:
   ```
   ./gradlew test
   ./gradlew run
   ```
   Fix anything that fails. In the dev client, check prices load, sets rank, and the buy assist works (README "Build, test and run").
3. **Create a separate public GitHub repo** (e.g. `ge-metrics-runelite`) whose root is the contents of `runelite-plugin/` (`build.gradle`, `settings.gradle`, `gradlew`, `gradle/`, `src/`). Add a `LICENSE`. One way to copy it with history:
   ```
   git subtree split --prefix=runelite-plugin -b plugin-only
   git push https://github.com/<owner>/ge-metrics-runelite.git plugin-only:master
   ```
   Then `git rev-parse plugin-only` (or the latest commit in the new repo) is the commit hash.
4. **Open a PR to [runelite/plugin-hub](https://github.com/runelite/plugin-hub)**: fork it, add a file `plugins/ge-metrics` containing:
   ```
   repository=https://github.com/<owner>/ge-metrics-runelite.git
   commit=<full 40-character commit hash>
   ```
   and open the PR. The Hub CI builds it; reviewers may ask for changes.
5. For updates later: push to the plugin repo and open another plugin-hub PR that only changes `commit=`.
