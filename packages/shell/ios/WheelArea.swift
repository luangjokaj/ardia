import AppKit
import ExpoModulesCore

final class WheelArea: ExpoView {
  let onWheel = EventDispatcher()
  private static let areas = NSHashTable<WheelArea>.weakObjects()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    _ = installWheelMonitor
  }

  override func viewDidMoveToWindow() {
    super.viewDidMoveToWindow()
    if window != nil { Self.areas.add(self) } else { Self.areas.remove(self) }
  }

  private static func area(at location: NSPoint, in window: NSWindow) -> WheelArea? {
    guard let hit = window.contentView?.superview?.hitTest(location) else { return nil }
    return areas.allObjects.first { $0.window === window && !$0.isHiddenOrHasHiddenAncestor && hit.isDescendant(of: $0) }
  }

  static func route(window: NSWindow?, location: NSPoint, dy: Double, phase: NSEvent.Phase, momentum: Bool, precise: Bool) -> Bool {
    guard let window, let owner = area(at: location, in: window) else { return false }
    owner.onWheel(["dy": dy, "phase": phaseName(phase), "momentum": momentum, "precise": precise])
    return true
  }

  private static func phaseName(_ phase: NSEvent.Phase) -> String {
    if phase.contains(.began) { return "began" }
    if phase.contains(.changed) { return "changed" }
    if phase.contains(.ended) { return "ended" }
    if phase.contains(.cancelled) { return "cancelled" }
    if phase.contains(.mayBegin) { return "mayBegin" }
    return "none"
  }

  static func scrollView(in view: NSView) -> NSScrollView? {
    if let scroll = view as? NSScrollView { return scroll }
    for child in view.subviews {
      if let scroll = scrollView(in: child) { return scroll }
    }
    return nil
  }

  static func glide(_ scroll: NSScrollView, to y: CGFloat, duration: Double) {
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    defer { CATransaction.commit() }
    let clip = scroll.contentView
    let from = clip.bounds.origin.y
    let layerBefore = clip.layer?.bounds.origin.y
    clip.setBoundsOrigin(NSPoint(x: clip.bounds.origin.x, y: y))
    scroll.reflectScrolledClipView(clip)
    guard duration > 0, abs(y - from) > 0.5, let document = scroll.documentView else { return }
    document.wantsLayer = true
    guard let layer = document.layer else { return }
    let layerShift = layerBefore.flatMap { before in clip.layer.map { $0.bounds.origin.y - before } } ?? 0
    let shift = abs(layerShift) > 0.5 ? layerShift : (clip.isFlipped ? y - from : from - y)
    let glide = CABasicAnimation(keyPath: "transform.translation.y")
    glide.fromValue = shift
    glide.toValue = 0
    glide.isAdditive = true
    glide.duration = duration / 1000
    glide.timingFunction = CAMediaTimingFunction(controlPoints: 0.5, 1, 0.89, 1)
    glide.fillMode = .backwards
    layer.add(glide, forKey: "ardia.glide.\(CACurrentMediaTime())")
  }

  static func devWheel(windowId: String, x: Double, y: Double, steps: [[String: Any]]) -> [String: Any] {
    guard let window = WindowManager.shared.window(windowId) else { return ["error": "no window \(windowId)"] }
    let location = SyntheticInput.windowPoint(x: x, top: y, in: window)
    let phases: [String: NSEvent.Phase] = ["began": .began, "changed": .changed, "ended": .ended, "cancelled": .cancelled, "none": []]
    let claims = steps.map { step in
      route(
        window: window, location: location, dy: step["dy"] as? Double ?? 0, phase: phases[step["phase"] as? String ?? "none"] ?? [],
        momentum: step["momentum"] as? Bool ?? false, precise: step["precise"] as? Bool ?? true)
    }
    return ["claimed": claims]
  }
}

let installWheelMonitor: Void = {
  _ = NSEvent.addLocalMonitorForEvents(matching: [.scrollWheel]) { event in
    let window = event.window ?? NSApp.orderedWindows.first { $0.isVisible && $0.frame.contains(event.locationInWindow) }
    let location = event.window == nil ? window.map { $0.convertPoint(fromScreen: event.locationInWindow) } ?? event.locationInWindow : event.locationInWindow
    let claimed = WheelArea.route(
      window: window, location: location, dy: Double(event.scrollingDeltaY), phase: event.phase, momentum: !event.momentumPhase.isEmpty,
      precise: event.hasPreciseScrollingDeltas)
    return claimed ? nil : event
  }
}()
