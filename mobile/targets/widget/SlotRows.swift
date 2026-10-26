import Foundation

/// GE slot rows: the offer, how much has filled, the advice the app last
/// computed, and the widget's own live price for the side the offer trades
/// against. The only advice re-derived here is staleness, which needs no
/// prices: an offer still "filling" past the stale window becomes "Relist",
/// as the app would say (src/lib/slots/advice.ts, STALE_HOURS).
enum SlotRows {
  static let staleHours: Double = 4

  static func word(_ advice: String) -> String {
    switch advice {
    case "filling": return "Filling"
    case "raise": return "Raise"
    case "lower": return "Lower"
    case "relist": return "Relist"
    case "cancel": return "Cancel"
    case "done": return "Filled"
    default: return "–"
    }
  }

  /// The app's advice, turned to "relist" once a filling offer goes stale.
  static func advice(_ s: WidgetSlot, now: Date) -> (kind: String, action: Bool) {
    let ageHours = (now.timeIntervalSince1970 * 1000 - s.updatedAt) / 3_600_000
    if s.advice == "filling" && s.filled < s.qty && ageHours > staleHours { return ("relist", true) }
    return (s.advice, s.action)
  }

  /// Slots that need action first (the small widget shows only the first), else slot order.
  static func rows(_ slots: [WidgetSlot], prices: [Int: LivePrice], now: Date) -> [WidgetRow] {
    let needs = slots.filter { advice($0, now: now).action }
    let rest = slots.filter { !advice($0, now: now).action }
    return (needs + rest).map { row($0, prices[$0.itemId], now: now) }
  }

  static func row(_ s: WidgetSlot, _ live: LivePrice?, now: Date) -> WidgetRow {
    let (kind, action) = advice(s, now: now)
    let side = s.isBuy ? "Buy" : "Sell"
    let target = action ? s.suggested.map { " → \(GP.short($0))" } ?? "" : ""
    let detail = "\(side) \(GP.short(s.price))\(target) · \(s.filled.formatted())/\(s.qty.formatted())"
    // Buy offers fill from instant sells (low); sell offers from instant buys (high).
    let livePrice = s.isBuy ? live?.low : live?.high
    let caption = livePrice.map { "Live \(GP.short($0))" } ?? ""
    return WidgetRow(id: s.id, name: s.name, detail: detail, value: word(kind), isGain: action, caption: caption, url: DeepLink.slot(s.id))
  }
}
