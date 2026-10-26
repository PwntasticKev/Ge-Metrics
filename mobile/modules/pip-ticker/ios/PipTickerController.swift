import AVFoundation
import AVKit
import UIKit

enum PipTickerError: LocalizedError {
  case unsupported
  case noWindow
  case notPossible
  case failed(String)

  var errorDescription: String? {
    switch self {
    case .unsupported: return "Picture in Picture isn't available on this device."
    case .noWindow: return "The app window isn't ready yet. Try again."
    case .notPossible: return "iOS didn't allow the mini window to start. Try again with the app open."
    case .failed(let message): return message
    }
  }
}

protocol PipTickerControllerListener: AnyObject {
  func pipDidStart()
  func pipDidStop()
  func pipDidFail(_ message: String)
}

extension Notification.Name {
  static let pipTickerFrame = Notification.Name("PipTickerFrame")
}

// Owns the AVSampleBufferDisplayLayer and AVPictureInPictureController
// (iOS 15+ sample-buffer content source). The layer sits behind the React
// Native root view in the key window: PiP needs it in the window, and the
// system animates the PiP window out of it.
@MainActor
final class PipTickerController: NSObject {
  static let shared = PipTickerController()

  /// How often the native side re-fetches prices while PiP is up (the wiki updates about once a minute).
  private static let refreshInterval: TimeInterval = 60
  /// Re-enqueue the frame now and then so the header clock stays right and the layer never sits empty.
  private static let redrawInterval: TimeInterval = 15
  private static let startTimeout: TimeInterval = 4
  private static let callbackTimeout: TimeInterval = 20
  /// Width in points of the on-screen host for the PiP layer.
  private static let hostSide: CGFloat = 2

  weak var listener: PipTickerControllerListener?

  private(set) var content = TickerContent.empty
  private(set) var latestImage: UIImage?
  private var autoStart = false
  /// Read by AVKit from any thread, so guarded by a lock rather than the main actor.
  nonisolated(unsafe) private var pausedValue = false
  private let pausedLock = NSLock()
  nonisolated private var paused: Bool {
    get { pausedLock.withLock { pausedValue } }
    set { pausedLock.withLock { pausedValue = newValue } }
  }
  /// stop() arrived after iOS was already asked to start; close it once it opens.
  private var stopAfterStart = false

  private let displayLayer = AVSampleBufferDisplayLayer()
  private let hostView = UIView()
  private var pipController: AVPictureInPictureController?
  private var possibleObservation: NSKeyValueObservation?
  private var pendingStart: ((Error?) -> Void)?
  private var startTimeoutItem: DispatchWorkItem?
  private var refreshTimer: Timer?
  private var redrawTimer: Timer?
  private var isFetching = false

  var isSupported: Bool { AVPictureInPictureController.isPictureInPictureSupported() }
  var isActive: Bool { pipController?.isPictureInPictureActive ?? false }

  private override init() {
    super.init()
    hostView.isUserInteractionEnabled = false
    hostView.backgroundColor = .clear
    displayLayer.videoGravity = .resizeAspect
    hostView.layer.addSublayer(displayLayer)
    NotificationCenter.default.addObserver(self, selector: #selector(didBecomeActive),
                                           name: UIApplication.didBecomeActiveNotification, object: nil)
    NotificationCenter.default.addObserver(self, selector: #selector(willResignActive),
                                           name: UIApplication.willResignActiveNotification, object: nil)
  }

  // MARK: Public API (main thread)

  func update(_ next: TickerContent) {
    content = next
    render()
  }

  func setAutoStart(_ enabled: Bool) {
    autoStart = enabled
    guard enabled else {
      pipController?.canStartPictureInPictureAutomaticallyFromInline = false
      if !isActive { deactivateAudioSession() }
      return
    }
    // The audio session is only switched on when the app is about to leave
    // the foreground (willResignActive), so in-app sounds keep obeying the
    // silent switch until then.
    guard isSupported, prepare(activateAudio: false) == nil else { return }
    pipController?.canStartPictureInPictureAutomaticallyFromInline = true
  }

  func start(completion: @escaping (Error?) -> Void) {
    if isActive { return completion(nil) }
    if let error = prepare(activateAudio: true) { return completion(error) }
    guard let controller = pipController else { return completion(PipTickerError.unsupported) }
    finishPendingStart(PipTickerError.failed("Replaced by a newer start request."))
    stopAfterStart = false
    pendingStart = completion
    let timeout = DispatchWorkItem { [weak self] in self?.finishPendingStart(PipTickerError.notPossible) }
    startTimeoutItem = timeout
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.startTimeout, execute: timeout)
    // isPictureInPicturePossible flips true shortly after the layer has a frame.
    possibleObservation = controller.observe(\.isPictureInPicturePossible, options: [.initial, .new]) { [weak self] controller, _ in
      guard controller.isPictureInPicturePossible else { return }
      DispatchQueue.main.async {
        guard let self, self.pendingStart != nil, self.startTimeoutItem != nil else { return }
        self.possibleObservation = nil
        // From here only the delegate callbacks settle the promise; the
        // start animation can take a while on a busy phone.
        self.startTimeoutItem?.cancel()
        self.startTimeoutItem = nil
        controller.startPictureInPicture()
        // Last resort if iOS never calls back at all.
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.callbackTimeout) { [weak self] in
          guard let self, !self.isActive, self.startTimeoutItem == nil else { return }
          self.finishPendingStart(PipTickerError.notPossible)
        }
      }
    }
  }

  func stop() {
    // A start already handed to iOS can't be cancelled; close it when it opens.
    if pendingStart != nil && startTimeoutItem == nil { stopAfterStart = true }
    finishPendingStart(PipTickerError.failed("Stopped."))
    if isActive { pipController?.stopPictureInPicture() }
  }

  // MARK: Setup

  /// Attaches the layer to the window, sets up audio and the controller. Returns an error if PiP can't run.
  private func prepare(activateAudio: Bool) -> Error? {
    guard isSupported else { return PipTickerError.unsupported }
    guard attachHostView() else { return PipTickerError.noWindow }
    if activateAudio, let error = activateAudioSession() { return error }
    render()
    if pipController == nil {
      let source = AVPictureInPictureController.ContentSource(sampleBufferDisplayLayer: displayLayer, playbackDelegate: self)
      let controller = AVPictureInPictureController(contentSource: source)
      controller.delegate = self
      controller.requiresLinearPlayback = true
      pipController = controller
    }
    pipController?.canStartPictureInPictureAutomaticallyFromInline = autoStart
    return nil
  }

  private func attachHostView() -> Bool {
    let window = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow } ?? UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }.first?.windows.first
    guard let window else { return false }
    if hostView.superview !== window {
      hostView.removeFromSuperview()
      window.addSubview(hostView)
    }
    // Auto-start needs the layer on screen and on top, not hidden behind the
    // React Native root view. A tiny frame in the top-left corner is on top
    // but sits under the display's rounded corner, so nobody sees it.
    window.bringSubviewToFront(hostView)
    let size = TickerLayout.size(rows: content.rows.count)
    let side = Self.hostSide
    hostView.frame = CGRect(x: 0, y: 0, width: side, height: side * size.height / size.width)
    displayLayer.frame = hostView.bounds
    return true
  }

  // Playback category is required for PiP. mixWithOthers keeps the game's
  // music and sounds playing; we never output audio ourselves.
  private func activateAudioSession() -> Error? {
    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
      try session.setActive(true)
      return nil
    } catch {
      NSLog("[PipTicker] audio session setup failed: %@", error.localizedDescription)
      return PipTickerError.failed("Couldn't set up the mini window: \(error.localizedDescription)")
    }
  }

  private func deactivateAudioSession() {
    do {
      try AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    } catch {
      NSLog("[PipTicker] audio session deactivate failed: %@", error.localizedDescription)
    }
  }

  // MARK: Rendering

  private func render() {
    guard let pixels = TickerRenderer.pixelBuffer(for: content) else { return }
    if let image = TickerRenderer.image(from: pixels) {
      latestImage = image
      NotificationCenter.default.post(name: .pipTickerFrame, object: image)
    }
    // Row count changes the frame's aspect ratio; keep the host layer in step.
    if hostView.superview != nil, hostView.bounds.width > 0 {
      let size = TickerLayout.size(rows: content.rows.count)
      if abs(hostView.bounds.height / hostView.bounds.width - size.height / size.width) > 0.01 {
        _ = attachHostView()
      }
    }
    // After a background interruption the layer can need a flush before it
    // accepts frames again, without reporting .failed.
    if displayLayer.status == .failed || displayLayer.requiresFlushToResumeDecoding {
      NSLog("[PipTicker] flushing display layer: %@", displayLayer.error?.localizedDescription ?? "needs flush")
      displayLayer.flush()
    }
    guard let sample = TickerRenderer.sampleBuffer(from: pixels) else {
      NSLog("[PipTicker] could not build a sample buffer")
      return
    }
    displayLayer.enqueue(sample)
  }

  @objc private func didBecomeActive() {
    guard hostView.superview != nil else { return }
    _ = attachHostView()
    render()
    // Back in the app with no mini window up: let app sounds obey the silent switch again.
    if !isActive && pendingStart == nil { deactivateAudioSession() }
  }

  @objc private func willResignActive() {
    guard autoStart, isSupported, !content.rows.isEmpty else { return }
    _ = activateAudioSession()
  }

  // MARK: Live refresh while PiP is up

  private func startTimers() {
    stopTimers()
    refreshTimer = Timer.scheduledTimer(withTimeInterval: Self.refreshInterval, repeats: true) { [weak self] _ in
      MainActor.assumeIsolated { self?.refreshPrices() }
    }
    redrawTimer = Timer.scheduledTimer(withTimeInterval: Self.redrawInterval, repeats: true) { [weak self] _ in
      MainActor.assumeIsolated { self?.render() }
    }
    refreshPrices()
  }

  private func stopTimers() {
    refreshTimer?.invalidate()
    redrawTimer?.invalidate()
    refreshTimer = nil
    redrawTimer = nil
  }

  private func refreshPrices() {
    guard !paused, !isFetching, !content.rows.isEmpty else { return }
    isFetching = true
    let started = Date()
    PriceFetcher.fetch(ids: content.rows.map(\.id)) { [weak self] prices in
      MainActor.assumeIsolated {
        guard let self else { return }
        self.isFetching = false
        guard !prices.isEmpty else { return }
        self.update(self.content.applying(prices: prices, at: started))
      }
    }
  }

  /// AVKit calls delegates on main in practice but doesn't promise it.
  nonisolated private func onMain(_ work: @escaping @MainActor () -> Void) {
    if Thread.isMainThread {
      MainActor.assumeIsolated(work)
    } else {
      DispatchQueue.main.async { MainActor.assumeIsolated(work) }
    }
  }

  private func finishPendingStart(_ error: Error?) {
    startTimeoutItem?.cancel()
    startTimeoutItem = nil
    possibleObservation = nil
    let pending = pendingStart
    pendingStart = nil
    pending?(error)
  }
}

// MARK: - AVPictureInPictureControllerDelegate

extension PipTickerController: AVPictureInPictureControllerDelegate {
  nonisolated func pictureInPictureControllerDidStartPictureInPicture(_ controller: AVPictureInPictureController) {
    onMain { [self] in
      paused = false
      controller.invalidatePlaybackState()
      finishPendingStart(nil)
      if stopAfterStart {
        stopAfterStart = false
        controller.stopPictureInPicture()
        return
      }
      startTimers()
      listener?.pipDidStart()
    }
  }

  nonisolated func pictureInPictureControllerDidStopPictureInPicture(_ controller: AVPictureInPictureController) {
    onMain { [self] in
      stopTimers()
      if UIApplication.shared.applicationState == .active { deactivateAudioSession() }
      listener?.pipDidStop()
    }
  }

  nonisolated func pictureInPictureController(_ controller: AVPictureInPictureController,
                                              failedToStartPictureInPictureWithError error: Error) {
    onMain { [self] in
      stopAfterStart = false
      NSLog("[PipTicker] failed to start: %@", error.localizedDescription)
      finishPendingStart(PipTickerError.failed("The mini window couldn't start: \(error.localizedDescription)"))
      listener?.pipDidFail(error.localizedDescription)
    }
  }

  // Tapping the expand button in the PiP window brings the app back.
  nonisolated func pictureInPictureController(
    _ controller: AVPictureInPictureController,
    restoreUserInterfaceForPictureInPictureStopWithCompletionHandler completionHandler: @escaping (Bool) -> Void
  ) {
    completionHandler(true)
  }
}

// MARK: - AVPictureInPictureSampleBufferPlaybackDelegate

extension PipTickerController: AVPictureInPictureSampleBufferPlaybackDelegate {
  // The play/pause button pauses or resumes the live price refresh.
  nonisolated func pictureInPictureController(_ controller: AVPictureInPictureController, setPlaying playing: Bool) {
    paused = !playing
    onMain { [self] in
      controller.invalidatePlaybackState()
      if playing { refreshPrices() }
    }
  }

  // A finite range instead of the "live" infinite one: the infinite range
  // made AVKit spin at ~100% CPU on iOS 16+ (UIPiPView issue #17).
  nonisolated func pictureInPictureControllerTimeRangeForPlayback(_ controller: AVPictureInPictureController) -> CMTimeRange {
    CMTimeRange(start: .zero, duration: CMTime(value: 24 * 3600, timescale: 1))
  }

  nonisolated func pictureInPictureControllerIsPlaybackPaused(_ controller: AVPictureInPictureController) -> Bool {
    paused
  }

  nonisolated func pictureInPictureController(_ controller: AVPictureInPictureController,
                                              didTransitionToRenderSize newRenderSize: CMVideoDimensions) {}

  nonisolated func pictureInPictureController(_ controller: AVPictureInPictureController,
                                              skipByInterval skipInterval: CMTime,
                                              completion completionHandler: @escaping () -> Void) {
    completionHandler()
  }
}
