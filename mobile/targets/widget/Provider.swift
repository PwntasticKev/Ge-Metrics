import WidgetKit

struct GEEntry: TimelineEntry {
  let date: Date
  let source: WidgetSource
  let rows: [WidgetRow]
  /// When the shown prices were fetched (nil: no prices yet).
  let pricesAt: Date?
}

extension GEEntry {
  static let sample = GEEntry(date: Date(), source: .buyNow, rows: [
    WidgetRow(id: 4151, name: "Abyssal whip", detail: "Buy 1.45M · Sell 1.5M", value: "+21K", isGain: true, caption: "per item"),
    WidgetRow(id: 11802, name: "Armadyl godsword", detail: "Buy 9.8M · Sell 10.1M", value: "+98K", isGain: true, caption: "per item"),
    WidgetRow(id: 13190, name: "Old school bond", detail: "Buy 8.2M · Sell 8.35M", value: "+150K", isGain: true, caption: "per item")
  ], pricesAt: Date())
}

/// Reloads every ~20 minutes (inside WidgetKit's daily budget); the app also
/// asks for a reload whenever its picks, watchlist or holdings change.
struct Provider: AppIntentTimelineProvider {
  static let refreshInterval: TimeInterval = 20 * 60

  func placeholder(in context: Context) -> GEEntry { .sample }

  func snapshot(for configuration: SourceIntent, in context: Context) async -> GEEntry {
    if context.isPreview && WidgetPayload.load() == nil { return .sample }
    return await entry(for: configuration.source)
  }

  func timeline(for configuration: SourceIntent, in context: Context) async -> Timeline<GEEntry> {
    let entry = await entry(for: configuration.source)
    return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(Self.refreshInterval)))
  }

  private func entry(for source: WidgetSource) async -> GEEntry {
    guard let payload = WidgetPayload.load() else {
      return GEEntry(date: Date(), source: source, rows: [], pricesAt: nil)
    }
    let snapshot = await PriceClient.latest(ids: payload.allIds)
    let rows = RowBuilder.rows(for: source, payload: payload, prices: snapshot?.prices ?? [:])
    return GEEntry(date: Date(), source: source, rows: rows, pricesAt: snapshot?.fetchedAt)
  }
}
