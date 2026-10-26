import ExpoModulesCore
import Foundation

// One line in the ticker, as sent from JS. Prices are in gp.
struct TickerRowRecord: Record {
  @Field var id: Int = 0
  @Field var name: String = ""
  /// "flip": buy/sell follow the live low/high. "holding": buy is what you paid.
  @Field var kind: String = "flip"
  @Field var buy: Double = 0
  @Field var sell: Double = 0
  /// Flips: margin per item after tax. Holdings: profit on the whole stack if sold now.
  @Field var margin: Double = 0
  /// Fraction, e.g. 0.012 = +1.2%. Nil hides it.
  @Field var change: Double? = nil
  @Field var qty: Int = 1
  @Field var taxExempt: Bool = false
  /// Flips: the 24h average mid price `change` is measured against.
  @Field var base: Double? = nil
}

struct TickerPayloadRecord: Record {
  @Field var title: String = "GE Metrics"
  /// Milliseconds since epoch of the prices shown.
  @Field var updatedAt: Double = 0
  @Field var rows: [TickerRowRecord] = []
}

// Immutable value types the renderer and refresher work with.
struct TickerRow: Equatable {
  let id: Int
  let name: String
  let isHolding: Bool
  let buy: Double
  let sell: Double
  let margin: Double
  let change: Double?
  let qty: Int
  let taxExempt: Bool
  let base: Double?
}

struct TickerContent: Equatable {
  let title: String
  let updatedAt: Date?
  let rows: [TickerRow]

  static let empty = TickerContent(title: "GE Metrics", updatedAt: nil, rows: [])
}

enum TickerLimits {
  static let maxRows = 5
}

extension TickerContent {
  init(record: TickerPayloadRecord) {
    let rows = record.rows.prefix(TickerLimits.maxRows).map { r in
      TickerRow(
        id: r.id,
        name: r.name,
        isHolding: r.kind == "holding",
        buy: r.buy,
        sell: r.sell,
        margin: r.margin,
        change: r.change,
        qty: max(1, r.qty),
        taxExempt: r.taxExempt,
        base: r.base
      )
    }
    self.init(
      title: record.title.isEmpty ? "GE Metrics" : record.title,
      updatedAt: record.updatedAt > 0 ? Date(timeIntervalSince1970: record.updatedAt / 1000) : nil,
      rows: Array(rows)
    )
  }

  /// Returns new content with live prices applied; rows without a price keep their old values.
  func applying(prices: [Int: LivePrice], at date: Date) -> TickerContent {
    guard !prices.isEmpty else { return self }
    let next = rows.map { row in prices[row.id].map { row.repriced(with: $0) } ?? row }
    return TickerContent(title: title, updatedAt: date, rows: next)
  }
}

struct LivePrice {
  let high: Double?
  let low: Double?
}

// Mirrors geTax in src/domain/flipping/geTax.js: 2% rounded down, capped at
// 5M, nothing under 50 gp, and the wiki's exempt items (flagged by JS).
enum GeTax {
  static let rate = 0.02
  static let cap = 5_000_000.0
  static let minPrice = 50.0

  static func tax(sell: Double, exempt: Bool) -> Double {
    if exempt || !sell.isFinite || sell < minPrice { return 0 }
    return min((sell * rate).rounded(.down), cap)
  }
}

extension TickerRow {
  func repriced(with price: LivePrice) -> TickerRow {
    let sell = price.high ?? self.sell
    if isHolding {
      let perItem = sell - GeTax.tax(sell: sell, exempt: taxExempt) - buy
      let change = buy > 0 ? perItem / buy : nil
      return copy(sell: sell, margin: perItem * Double(qty), change: change)
    }
    let buy = price.low ?? self.buy
    let margin = sell - GeTax.tax(sell: sell, exempt: taxExempt) - buy
    let change = base.flatMap { $0 > 0 ? ((sell + buy) / 2 - $0) / $0 : nil } ?? self.change
    return copy(buy: buy, sell: sell, margin: margin, change: change)
  }

  private func copy(buy: Double? = nil, sell: Double, margin: Double, change: Double?) -> TickerRow {
    TickerRow(id: id, name: name, isHolding: isHolding, buy: buy ?? self.buy, sell: sell,
              margin: margin, change: change, qty: qty, taxExempt: taxExempt, base: base)
  }
}

// Same rules as gpShort/signed in src/lib/format.ts.
enum GpFormat {
  static func short(_ n: Double) -> String {
    guard n.isFinite else { return "–" }
    let abs = Swift.abs(n)
    let sign = n < 0 ? "−" : ""
    if abs >= 1e9 { return sign + trim(String(format: "%.2f", abs / 1e9)) + "B" }
    if abs >= 1e7 { return sign + trim(String(format: "%.1f", abs / 1e6)) + "M" }
    if abs >= 1e6 { return sign + trim(String(format: "%.2f", abs / 1e6)) + "M" }
    if abs >= 1e3 { return sign + String(Int((abs / 1e3).rounded())) + "K" }
    return sign + String(Int(abs.rounded()))
  }

  static func signed(_ n: Double) -> String {
    guard n.isFinite else { return "–" }
    return (n >= 0 ? "+" : "") + short(n)
  }

  static func percent(_ ratio: Double) -> String {
    guard ratio.isFinite else { return "–" }
    let pct = ratio * 100
    let sign = pct >= 0 ? "+" : "−"
    return sign + String(format: Swift.abs(pct) < 10 ? "%.1f%%" : "%.0f%%", Swift.abs(pct))
  }

  private static func trim(_ s: String) -> String {
    guard s.contains(".") else { return s }
    var out = s
    while out.hasSuffix("0") { out.removeLast() }
    if out.hasSuffix(".") { out.removeLast() }
    return out
  }
}
