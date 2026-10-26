import Foundation

/// One line in the widget, already worded for display.
struct WidgetRow: Hashable, Identifiable {
  let id: Int
  let name: String
  /// e.g. "Buy 1.2M · Sell 1.25M"
  let detail: String
  /// Signed GP, e.g. "+12K". Nil when there's no live price.
  let value: String?
  /// Blue when up; losses are muted grey, never red.
  let isGain: Bool
  let caption: String

  var url: URL { DeepLink.item(id) }
}

enum DeepLink {
  static let home = URL(string: "gemetrics:///")!
  static func item(_ id: Int) -> URL { URL(string: "gemetrics:///?item=\(id)")! }
}

/// Matches gpShort in src/lib/format.ts: 1.23B, 53.3M, 6.66M, 981K, 950.
enum GP {
  static func short(_ n: Int) -> String {
    let abs = Double(Swift.abs(n))
    let sign = n < 0 ? "-" : ""
    if abs >= 1e9 { return sign + trim(String(format: "%.2f", abs / 1e9)) + "B" }
    if abs >= 1e7 { return sign + trim(String(format: "%.1f", abs / 1e6)) + "M" }
    if abs >= 1e6 { return sign + trim(String(format: "%.2f", abs / 1e6)) + "M" }
    if abs >= 1e3 { return sign + String(Int((abs / 1e3).rounded())) + "K" }
    return sign + String(Int(abs.rounded()))
  }

  static func signed(_ n: Int) -> String { (n >= 0 ? "+" : "") + short(n) }

  private static func trim(_ s: String) -> String {
    guard s.contains(".") else { return s }
    var out = s
    while out.hasSuffix("0") { out.removeLast() }
    if out.hasSuffix(".") { out.removeLast() }
    return out
  }
}

enum RowBuilder {
  static func rows(for source: WidgetSource, payload: WidgetPayload, prices: [Int: LivePrice]) -> [WidgetRow] {
    switch source {
    case .buyNow: return payload.picks.map { pick($0, prices[$0.id]) }
    case .watchlist: return payload.watchlist.map { watched($0, prices[$0.id]) }
    case .holdings: return payload.holdings.map { holding($0, prices[$0.id]) }
    }
  }

  /// The app's careful targets; the caption shows today's live margin.
  static func pick(_ p: WidgetPick, _ live: LivePrice?) -> WidgetRow {
    let caption: String
    if let high = live?.high, let low = live?.low {
      caption = "Live margin \(GP.signed(high - low - GETax.of(high, noTax: p.noTax)))"
    } else {
      caption = "per item"
    }
    return WidgetRow(id: p.id, name: p.name, detail: "Buy \(GP.short(p.buy)) · Sell \(GP.short(p.sell))",
                     value: GP.signed(p.profit), isGain: p.profit > 0, caption: caption)
  }

  /// Buy at the instant-sell price, sell at the instant-buy price, after tax.
  static func watched(_ item: WidgetItem, _ live: LivePrice?) -> WidgetRow {
    guard let high = live?.high, let low = live?.low else {
      return WidgetRow(id: item.id, name: item.name, detail: "No recent trades", value: nil, isGain: false, caption: "")
    }
    let margin = high - low - GETax.of(high, noTax: item.noTax)
    return WidgetRow(id: item.id, name: item.name, detail: "Buy \(GP.short(low)) · Sell \(GP.short(high))",
                     value: GP.signed(margin), isGain: margin > 0, caption: "margin")
  }

  /// Profit if sold now at the instant-sell price, after tax (as the Bought tab).
  static func holding(_ h: WidgetHolding, _ live: LivePrice?) -> WidgetRow {
    let detail = "\(h.qty.formatted()) × \(GP.short(h.buyPrice))"
    guard let price = live?.low, price > 0 else {
      return WidgetRow(id: h.id, name: h.name, detail: detail, value: nil, isGain: false, caption: "")
    }
    let profit = (price - GETax.of(price, noTax: h.noTax) - h.buyPrice) * h.qty
    return WidgetRow(id: h.id, name: h.name, detail: detail, value: GP.signed(profit), isGain: profit >= 0, caption: "if sold now")
  }
}
