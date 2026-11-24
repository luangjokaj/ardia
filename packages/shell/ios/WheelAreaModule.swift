import AppKit
import ExpoModulesCore

public class WheelAreaModule: Module, WheelAreaNative {
  static func devWheel(_ windowId: String, _ x: Double, _ y: Double, _ steps: [[String: Any]]) -> [String: Any] {
    #if DEBUG
    return WheelArea.devWheel(windowId: windowId, x: x, y: y, steps: steps)
    #else
    return ["error": "DEV builds only"]
    #endif
  }

  func glideScroll(_ tag: Int, _ y: Double, _ durationMs: Double) {
    guard let host = self.appContext?.findView(withTag: tag, ofType: NSView.self), let scroll = WheelArea.scrollView(in: host) else { return }
    WheelArea.glide(scroll, to: CGFloat(y), duration: durationMs)
  }

  public func definition() -> ModuleDefinition {
    Name(Self.moduleName)

    Self.devWheelFunction
    glideScrollFunction

    View(WheelArea.self) {
      Events("onWheel")
    }
  }
}
