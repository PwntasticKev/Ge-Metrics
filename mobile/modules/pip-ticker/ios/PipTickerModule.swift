import AVKit
import ExpoModulesCore

public class PipTickerModule: Module, PipTickerControllerListener {
  public func definition() -> ModuleDefinition {
    Name("PipTicker")

    Events("onStart", "onStop", "onError")

    // OnCreate runs on the module registry's thread, not main.
    OnCreate {
      DispatchQueue.main.async { [weak self] in
        MainActor.assumeIsolated { PipTickerController.shared.listener = self }
      }
    }

    Function("isSupported") { () -> Bool in
      AVPictureInPictureController.isPictureInPictureSupported()
    }

    AsyncFunction("isActive") { () -> Bool in
      MainActor.assumeIsolated { PipTickerController.shared.isActive }
    }.runOnQueue(.main)

    AsyncFunction("update") { (payload: TickerPayloadRecord) in
      let content = TickerContent(record: payload)
      MainActor.assumeIsolated { PipTickerController.shared.update(content) }
    }.runOnQueue(.main)

    AsyncFunction("setAutoStart") { (enabled: Bool) in
      MainActor.assumeIsolated { PipTickerController.shared.setAutoStart(enabled) }
    }.runOnQueue(.main)

    // Must be called from a user tap; iOS rejects PiP started without one.
    AsyncFunction("start") { (promise: Promise) in
      MainActor.assumeIsolated {
        PipTickerController.shared.start { error in
          if let error {
            promise.reject("ERR_PIP_START", error.localizedDescription)
          } else {
            promise.resolve(nil)
          }
        }
      }
    }.runOnQueue(.main)

    AsyncFunction("stop") {
      MainActor.assumeIsolated { PipTickerController.shared.stop() }
    }.runOnQueue(.main)

    View(PipTickerView.self) {}
  }

  func pipDidStart() {
    sendEvent("onStart", [:])
  }

  func pipDidStop() {
    sendEvent("onStop", [:])
  }

  func pipDidFail(_ message: String) {
    sendEvent("onError", ["message": message])
  }
}
