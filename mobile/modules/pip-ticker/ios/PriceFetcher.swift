import Foundation

// Fetches live prices straight from the OSRS Wiki so the ticker keeps
// updating while the app (and its JS thread) is in the background.
// Same endpoint and User-Agent as src/api/wiki.ts.
enum PriceFetcher {
  private static let baseURL = "https://prices.runescape.wiki/api/v1/osrs/latest?id="
  private static let userAgent = "GE-Metrics-iOS/1.0 (https://ge-metrics.com)"
  private static let timeout: TimeInterval = 15

  private static let session: URLSession = {
    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = timeout
    config.requestCachePolicy = .reloadIgnoringLocalCacheData
    config.httpAdditionalHeaders = ["User-Agent": userAgent]
    return URLSession(configuration: config)
  }()

  /// Fetches every id in parallel; ids that fail are left out of the result.
  static func fetch(ids: [Int], completion: @escaping ([Int: LivePrice]) -> Void) {
    let unique = Array(Set(ids.filter { $0 > 0 }))
    guard !unique.isEmpty else { return completion([:]) }
    let group = DispatchGroup()
    let lock = NSLock()
    var results: [Int: LivePrice] = [:]
    for id in unique {
      guard let url = URL(string: baseURL + String(id)) else { continue }
      group.enter()
      session.dataTask(with: url) { data, response, error in
        defer { group.leave() }
        if let error {
          NSLog("[PipTicker] price fetch for %d failed: %@", id, error.localizedDescription)
          return
        }
        guard let http = response as? HTTPURLResponse, http.statusCode == 200, let data,
              let price = parse(data, id: id) else {
          NSLog("[PipTicker] unexpected price response for %d", id)
          return
        }
        lock.lock()
        results[id] = price
        lock.unlock()
      }.resume()
    }
    group.notify(queue: .main) { completion(results) }
  }

  // {"data":{"4151":{"high":1500000,"highTime":...,"low":1490000,"lowTime":...}}}
  static func parse(_ data: Data, id: Int) -> LivePrice? {
    guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let all = json["data"] as? [String: Any],
          let entry = all[String(id)] as? [String: Any] else { return nil }
    let number = { (key: String) -> Double? in
      guard let n = entry[key] as? NSNumber, n.doubleValue.isFinite, n.doubleValue > 0 else { return nil }
      return n.doubleValue
    }
    let price = LivePrice(high: number("high"), low: number("low"))
    return price.high == nil && price.low == nil ? nil : price
  }
}
