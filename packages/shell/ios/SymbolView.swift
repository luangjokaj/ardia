import AppKit
import ArdiaCore
import Carbon.HIToolbox
import ExpoModulesCore

final class SymbolView: ExpoView {
  private let imageView = NSImageView()
  private let glyph = CALayer()
  private var image: NSImage?
  var name = "questionmark" { didSet { update() } }
  var pointSize: Double = 14 { didSet { update() } }
  var weight = "regular" { didSet { update() } }
  var centresInk = false {
    didSet {
      placeImageView()
      render()
    }
  }
  private static var inkOffsets: [String: CGVector] = [:]
  var tint: NSColor? {
    didSet {
      imageView.contentTintColor = tint
      render()
    }
  }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    imageView.imageScaling = .scaleProportionallyDown
    imageView.imageAlignment = .alignCenter
    imageView.translatesAutoresizingMaskIntoConstraints = false
    addSubview(imageView)
    glyph.actions = ["bounds": NSNull(), "position": NSNull(), "contents": NSNull(), "contentsScale": NSNull(), "opacity": NSNull()]
    glyph.contentsGravity = .resize
    NotificationCenter.default.addObserver(self, selector: #selector(interfaceScaleDidChange), name: .ArdiaInterfaceScaleDidChange, object: nil)
    NotificationCenter.default.addObserver(self, selector: #selector(interfaceScaleDidChange), name: .ArdiaInterfaceScaleDidSettle, object: nil)
    update()
  }

  override func hitTest(_ point: NSPoint) -> NSView? { nil }

  override func layout() {
    super.layout()
    placeImageView()
  }

  override func setFrameSize(_ newSize: NSSize) {
    super.setFrameSize(newSize)
    placeImageView()
    render()
  }

  override func viewDidMoveToWindow() {
    super.viewDidMoveToWindow()
    render()
  }

  override func viewDidChangeBackingProperties() {
    super.viewDidChangeBackingProperties()
    placeImageView()
    render()
  }

  override func viewDidChangeEffectiveAppearance() {
    super.viewDidChangeEffectiveAppearance()
    render()
  }

  @objc private func interfaceScaleDidChange() {
    update()
  }

  private func update() {
    let weights: [String: NSFont.Weight] = [
      "light": .light, "regular": .regular, "medium": .medium, "semibold": .semibold, "bold": .bold,
    ]
    let config = NSImage.SymbolConfiguration(pointSize: pointSize, weight: weights[weight] ?? .regular)
    image = NSImage(systemSymbolName: name, accessibilityDescription: nil)?.withSymbolConfiguration(config)
    imageView.image = image
    placeImageView()
    render()
  }

  private func centredImageRect() -> NSRect? {
    guard let image, bounds.width > 0, bounds.height > 0, image.size.width > 0, image.size.height > 0 else { return nil }
    let fit = min(1, bounds.width / image.size.width, bounds.height / image.size.height)
    let size = NSSize(width: image.size.width * fit, height: image.size.height * fit)
    let nudge = centresInk ? inkOffset(of: image) : .zero
    let up = isFlipped ? -nudge.dy : nudge.dy
    return NSRect(
      x: bounds.midX - size.width / 2 + nudge.dx * fit, y: bounds.midY - size.height / 2 + up * fit, width: size.width,
      height: size.height)
  }

  private func inkOffset(of image: NSImage) -> CGVector {
    let density = max(1, backingDensity)
    let key = "\(name) \(pointSize) \(weight) \(density)"
    if let known = Self.inkOffsets[key] { return known }
    let wide = Int((image.size.width * density).rounded(.up)), high = Int((image.size.height * density).rounded(.up))
    guard wide > 0, high > 0,
      let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: wide, pixelsHigh: high, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
        isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
      let context = NSGraphicsContext(bitmapImageRep: rep)
    else { return .zero }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.cgContext.scaleBy(x: CGFloat(wide) / image.size.width, y: CGFloat(high) / image.size.height)
    image.draw(in: NSRect(origin: .zero, size: image.size), from: .zero, operation: .sourceOver, fraction: 1)
    NSGraphicsContext.restoreGraphicsState()
    guard let pixels = rep.bitmapData else { return .zero }
    var columns = [CGFloat](repeating: 0, count: wide), rows = [CGFloat](repeating: 0, count: high)
    for y in 0..<high {
      for x in 0..<wide {
        let alpha = CGFloat(pixels[y * rep.bytesPerRow + x * 4 + 3]) / 255
        columns[x] = max(columns[x], alpha)
        rows[y] = max(rows[y], alpha)
      }
    }
    guard let left = columns.firstIndex(where: { $0 > 0 }), let right = columns.lastIndex(where: { $0 > 0 }),
      let top = rows.firstIndex(where: { $0 > 0 }), let bottom = rows.lastIndex(where: { $0 > 0 })
    else { return .zero }
    let inkLeft = CGFloat(left) + 1 - columns[left], inkRight = CGFloat(wide) - CGFloat(right) - columns[right]
    let inkTop = CGFloat(top) + 1 - rows[top], inkBottom = CGFloat(high) - CGFloat(bottom) - rows[bottom]
    let offset = CGVector(
      dx: (inkRight - inkLeft) / 2 * image.size.width / CGFloat(wide),
      dy: (inkTop - inkBottom) / 2 * image.size.height / CGFloat(high))
    Self.inkOffsets[key] = offset
    return offset
  }

  private func placeImageView() {
    guard let drawn = centredImageRect() else {
      imageView.frame = bounds
      return
    }
    let origin = convertToBacking(drawn.origin)
    let snapped = convertFromBacking(NSPoint(x: origin.x.rounded(), y: origin.y.rounded()))
    imageView.frame = NSRect(origin: snapped, size: drawn.size)
  }

  private func render() {
    guard let layer else { return }
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    defer { CATransaction.commit() }
    if glyph.superlayer !== layer { layer.addSublayer(glyph) }
    let drawsAtWindowScale = window.map { abs(backingDensity - $0.backingScaleFactor) < 0.001 } ?? true
    imageView.isHidden = !drawsAtWindowScale
    guard !drawsAtWindowScale, let image, let drawn = centredImageRect() else {
      glyph.contents = nil
      return
    }
    let cell = backingAlignedRect(drawn, options: [.alignMinXOutward, .alignMinYOutward, .alignMaxXOutward, .alignMaxYOutward])
    let pixels = convertToBacking(cell).size
    let wide = Int(pixels.width.rounded()), high = Int(pixels.height.rounded())
    guard wide > 0, high > 0,
      let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: wide, pixelsHigh: high, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
        isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
      let context = NSGraphicsContext(bitmapImageRep: rep)
    else {
      glyph.contents = nil
      return
    }
    let density = CGFloat(wide) / cell.width
    let flipped = isFlipped
    var opacity: Float = 1
    effectiveAppearance.performAsCurrentDrawingAppearance {
      let resolved = (tint ?? .labelColor).usingColorSpace(.sRGB) ?? .black
      opacity = Float(resolved.alphaComponent)
      NSGraphicsContext.saveGraphicsState()
      NSGraphicsContext.current = context
      let cg = context.cgContext
      cg.scaleBy(x: density, y: CGFloat(high) / cell.height)
      let originY = flipped ? cell.maxY - drawn.maxY : drawn.minY - cell.minY
      let target = NSRect(x: drawn.minX - cell.minX, y: originY, width: drawn.width, height: drawn.height)
      image.draw(in: target, from: .zero, operation: .sourceOver, fraction: 1)
      resolved.withAlphaComponent(1).set()
      target.fill(using: .sourceAtop)
      NSGraphicsContext.restoreGraphicsState()
    }
    glyph.frame = cell
    glyph.contentsScale = density
    glyph.opacity = opacity
    glyph.contents = rep.cgImage
  }
}
