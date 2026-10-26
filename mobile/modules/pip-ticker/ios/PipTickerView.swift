import ExpoModulesCore
import UIKit

// In-app preview: shows the exact frame the PiP window gets.
class PipTickerView: ExpoView {
  private let imageView = UIImageView()
  private var observer: NSObjectProtocol?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    layer.cornerRadius = 12
    imageView.contentMode = .scaleAspectFit
    imageView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    imageView.frame = bounds
    addSubview(imageView)
    imageView.image = MainActor.assumeIsolated { PipTickerController.shared.latestImage }
    observer = NotificationCenter.default.addObserver(forName: .pipTickerFrame, object: nil, queue: .main) { [weak self] note in
      let image = note.object as? UIImage
      MainActor.assumeIsolated { self?.imageView.image = image }
    }
  }

  deinit {
    if let observer { NotificationCenter.default.removeObserver(observer) }
  }
}
