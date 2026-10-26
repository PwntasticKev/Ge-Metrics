import SwiftUI
import WidgetKit

/// Kind used by the app's reload calls (ExtensionStorage.reloadWidget()).
let geMetricsWidgetKind = "GEMetricsWidget"

struct GEMetricsWidget: Widget {
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: geMetricsWidgetKind, intent: SourceIntent.self, provider: Provider()) { entry in
      GEWidgetView(entry: entry)
    }
    .configurationDisplayName("GE Metrics")
    .description("Top Buy now picks, your watchlist, what you bought or your GE slots, with live prices.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
  }
}

@main
struct GEMetricsWidgetBundle: WidgetBundle {
  var body: some Widget {
    GEMetricsWidget()
  }
}
