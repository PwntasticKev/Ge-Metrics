import Foundation

/// Instant prices from the OSRS Wiki: `high` is what buyers pay right now
/// (the sell side for us), `low` is what sellers accept (the buy side).
struct LivePrice: Codable, Hashable {
  let high: Int?
  let low: Int?
}

struct PriceSnapshot: Codable {
  let fetchedAt: Date
  let prices: [Int: LivePrice]
}

enum PriceError: Error {
  case badStatus(Int)
  case badBody
}

/// Fetches /latest with the app's User-Agent (the wiki asks for one) and keeps
/// the shown items' prices in the App Group so a failed refresh still draws.
enum PriceClient {
  static let latestURL = URL(string: "https://prices.runescape.wiki/api/v1/osrs/latest")!
  static let userAgent = "GE-Metrics-iOS/1.0 (https://ge-metrics.com)"
  static let timeout: TimeInterval = 15

  static func fetch(ids: Set<Int>) async throws -> PriceSnapshot {
    var request = URLRequest(url: latestURL, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: timeout)
    request.setValue(userAgent, forHTTPHeaderField: "User-Agent")
    let (data, response) = try await URLSession.shared.data(for: request)
    if let http = response as? HTTPURLResponse, http.statusCode != 200 {
      throw PriceError.badStatus(http.statusCode)
    }
    guard let body = try JSONSerialization.jsonObject(with: data) as? [String: Any],
          let all = body["data"] as? [String: Any]
    else { throw PriceError.badBody }
    var prices: [Int: LivePrice] = [:]
    for id in ids {
      guard let entry = all[String(id)] as? [String: Any] else { continue }
      prices[id] = LivePrice(high: entry["high"] as? Int, low: entry["low"] as? Int)
    }
    return PriceSnapshot(fetchedAt: Date(), prices: prices)
  }

  static func cached() -> PriceSnapshot? {
    guard let data = Shared.defaults?.data(forKey: Shared.pricesKey) else { return nil }
    return try? JSONDecoder().decode(PriceSnapshot.self, from: data)
  }

  static func save(_ snapshot: PriceSnapshot) {
    guard let data = try? JSONEncoder().encode(snapshot) else { return }
    Shared.defaults?.set(data, forKey: Shared.pricesKey)
  }

  /// Live prices when the wiki answers, else the last saved ones.
  static func latest(ids: Set<Int>) async -> PriceSnapshot? {
    if ids.isEmpty { return nil }
    do {
      let snapshot = try await fetch(ids: ids)
      save(snapshot)
      return snapshot
    } catch {
      NSLog("GE Metrics widget: price refresh failed: \(error)")
      return cached()
    }
  }
}
