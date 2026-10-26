import SwiftUI
import WidgetKit

// System font throughout; blue for gains, muted grey for losses (never red).
private extension WidgetRow {
  var valueColor: Color { isGain ? Color("profit") : Color("muted") }
}

private func updatedText(_ entry: GEEntry) -> Text {
  guard let at = entry.pricesAt else { return Text("Waiting for prices") }
  return Text(at, style: .relative) + Text(" ago")
}

struct HeaderView: View {
  let entry: GEEntry
  var body: some View {
    HStack(spacing: 4) {
      Text(entry.source.title).font(.caption.weight(.semibold)).foregroundStyle(Color("brand"))
      Spacer(minLength: 4)
      updatedText(entry).font(.caption2).foregroundStyle(Color("muted")).lineLimit(1)
    }
  }
}

struct EmptyStateView: View {
  let entry: GEEntry
  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(entry.source.title).font(.caption.weight(.semibold)).foregroundStyle(Color("brand"))
      Spacer(minLength: 0)
      Text(entry.source.emptyMessage).font(.footnote).foregroundStyle(Color("ink"))
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

/// Small: the first row, big.
struct SmallView: View {
  let entry: GEEntry
  var body: some View {
    if let row = entry.rows.first {
      VStack(alignment: .leading, spacing: 3) {
        HeaderView(entry: entry)
        Spacer(minLength: 2)
        Text(row.name).font(.subheadline.weight(.semibold)).foregroundStyle(Color("ink")).lineLimit(2)
        Text(row.value ?? "–").font(.title2.weight(.bold)).foregroundStyle(row.valueColor)
          .minimumScaleFactor(0.6).lineLimit(1)
        Text(row.detail).font(.caption2).foregroundStyle(Color("muted")).lineLimit(1).minimumScaleFactor(0.8)
        if !row.caption.isEmpty {
          Text(row.caption).font(.caption2).foregroundStyle(Color("muted")).lineLimit(1)
        }
      }
      .widgetURL(row.url)
    } else {
      EmptyStateView(entry: entry).widgetURL(DeepLink.home)
    }
  }
}

struct RowView: View {
  let row: WidgetRow
  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 8) {
      VStack(alignment: .leading, spacing: 1) {
        Text(row.name).font(.subheadline.weight(.semibold)).foregroundStyle(Color("ink")).lineLimit(1)
        Text(row.detail).font(.caption2).foregroundStyle(Color("muted")).lineLimit(1)
      }
      Spacer(minLength: 4)
      VStack(alignment: .trailing, spacing: 1) {
        Text(row.value ?? "–").font(.subheadline.weight(.bold)).foregroundStyle(row.valueColor).lineLimit(1)
        Text(row.caption).font(.caption2).foregroundStyle(Color("muted")).lineLimit(1)
      }
    }
  }
}

/// Medium: up to three rows, each its own link.
struct MediumView: View {
  let entry: GEEntry
  static let maxRows = 3
  var body: some View {
    if entry.rows.isEmpty {
      EmptyStateView(entry: entry).widgetURL(DeepLink.home)
    } else {
      VStack(alignment: .leading, spacing: 6) {
        HeaderView(entry: entry)
        ForEach(entry.rows.prefix(Self.maxRows)) { row in
          Link(destination: row.url) { RowView(row: row) }
        }
        Spacer(minLength: 0)
      }
    }
  }
}

/// Lock screen: the first row in two lines, tinted by the system.
struct AccessoryRectangularView: View {
  let entry: GEEntry
  var body: some View {
    if let row = entry.rows.first {
      VStack(alignment: .leading, spacing: 0) {
        Text(row.name).font(.headline).widgetAccentable().lineLimit(1)
        Text("\(row.value ?? "–") \(row.caption)").font(.subheadline).lineLimit(1)
        Text(row.detail).font(.caption).foregroundStyle(.secondary).lineLimit(1)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .widgetURL(row.url)
    } else {
      VStack(alignment: .leading, spacing: 0) {
        Text("GE Metrics").font(.headline).widgetAccentable()
        Text(entry.source.emptyMessage).font(.caption).lineLimit(2)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .widgetURL(DeepLink.home)
    }
  }
}

struct GEWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: GEEntry

  var body: some View {
    switch family {
    case .accessoryRectangular:
      AccessoryRectangularView(entry: entry).containerBackground(for: .widget) { Color.clear }
    case .systemMedium:
      MediumView(entry: entry).containerBackground(for: .widget) { Color("$widgetBackground") }
    default:
      SmallView(entry: entry).containerBackground(for: .widget) { Color("$widgetBackground") }
    }
  }
}
