import AppIntents
import WidgetKit

/// What a widget shows; picked when editing the widget.
enum WidgetSource: String, AppEnum {
  case buyNow
  case watchlist
  case holdings

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Show"
  static var caseDisplayRepresentations: [WidgetSource: DisplayRepresentation] = [
    .buyNow: "Buy now picks",
    .watchlist: "Watchlist",
    .holdings: "Bought items"
  ]

  var title: String {
    switch self {
    case .buyNow: return "Buy now"
    case .watchlist: return "Watchlist"
    case .holdings: return "Bought"
    }
  }

  var emptyMessage: String {
    switch self {
    case .buyNow: return "Open GE Metrics to load picks."
    case .watchlist: return "Star items in GE Metrics to see them here."
    case .holdings: return "Log a buy in GE Metrics to track it here."
    }
  }
}

struct SourceIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "GE Metrics"
  static var description = IntentDescription("Choose what the widget shows.")

  @Parameter(title: "Show", default: .buyNow)
  var source: WidgetSource

  init() {}
  init(source: WidgetSource) { self.source = source }
}
