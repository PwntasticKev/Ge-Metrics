import Foundation

// What the app writes to the App Group (see src/lib/widget/payload.ts).
enum Shared {
  static let appGroup = "group.com.gemetrics.app"
  static let payloadKey = "widget.v1"
  static let pricesKey = "widget.prices.v1"
  static let supportedVersion = 1

  static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }
}

struct WidgetPick: Codable, Hashable {
  let id: Int
  let name: String
  let buy: Int
  let sell: Int
  let profit: Int
  let noTax: Bool
}

struct WidgetItem: Codable, Hashable {
  let id: Int
  let name: String
  let noTax: Bool
}

struct WidgetHolding: Codable, Hashable {
  let id: Int
  let name: String
  let noTax: Bool
  let qty: Int
  let buyPrice: Int
}

/// One GE offer from My GE slots, with the advice the app last computed.
struct WidgetSlot: Codable, Hashable {
  let id: String
  let itemId: Int
  let name: String
  /// "buy" or "sell".
  let side: String
  let price: Int
  let qty: Int
  let filled: Int
  /// When the offer was placed or last changed (ms since epoch).
  let updatedAt: Double
  /// filling, raise, lower, relist, cancel, done or unknown (src/lib/slots/advice.ts).
  let advice: String
  let action: Bool
  let suggested: Int?

  var isBuy: Bool { side == "buy" }
}

struct WidgetPayload: Codable {
  let v: Int
  let at: Double
  let picks: [WidgetPick]
  let watchlist: [WidgetItem]
  let holdings: [WidgetHolding]
  /// Missing in payloads from app builds before GE slots.
  let slots: [WidgetSlot]?

  static func load() -> WidgetPayload? {
    guard let json = Shared.defaults?.string(forKey: Shared.payloadKey),
          let data = json.data(using: .utf8),
          let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data),
          payload.v == Shared.supportedVersion
    else { return nil }
    return payload
  }

  /// Every item id any source might show, so one price fetch covers them all.
  var allIds: Set<Int> {
    Set(picks.map(\.id)).union(watchlist.map(\.id)).union(holdings.map(\.id)).union((slots ?? []).map(\.itemId))
  }
}

/// GE tax: 2% of the sell price, rounded down, capped at 5M; under 50 gp and
/// exempt items pay none. Mirrors src/domain/flipping/geTax.js.
enum GETax {
  static let rate = 0.02
  static let cap = 5_000_000
  static let minPrice = 50

  static func of(_ price: Int, noTax: Bool) -> Int {
    if noTax || price < minPrice { return 0 }
    return min(Int((Double(price) * rate).rounded(.down)), cap)
  }
}
