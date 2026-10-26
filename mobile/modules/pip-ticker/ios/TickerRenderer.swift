import CoreImage
import CoreMedia
import CoreVideo
import UIKit

// Draws the ticker with Core Graphics into a BGRA pixel buffer that
// AVSampleBufferDisplayLayer can show. Dark palette B from
// src/theme/tokens.ts; no red anywhere, losses are muted instead.
enum TickerPalette {
  static let bg = UIColor(hex: 0x0E1430)
  static let card = UIColor(hex: 0x18214A)
  static let ink = UIColor(hex: 0xEEF0FF)
  static let muted = UIColor(hex: 0x8A93BD)
  static let rule = UIColor(hex: 0x222C57)
  static let brand = UIColor(hex: 0x8EA2FF)
  static let profit = UIColor(hex: 0xA9B8FF)
}

enum TickerLayout {
  /// Pixel width of every frame; PiP scales it to the window.
  static let width: CGFloat = 480
  static let header: CGFloat = 46
  static let row: CGFloat = 66
  static let padX: CGFloat = 18
  static let bottomPad: CGFloat = 8
  static let emptyHeight: CGFloat = 150

  static func size(rows: Int) -> CGSize {
    let body = rows == 0 ? emptyHeight : CGFloat(rows) * row + bottomPad
    return CGSize(width: width, height: header + body)
  }
}

private extension UIColor {
  convenience init(hex: Int) {
    self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
              blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
  }
}

enum TickerRenderer {
  private static let ciContext = CIContext()
  private static let timeFormatter: DateFormatter = {
    let f = DateFormatter()
    f.timeStyle = .short
    f.dateStyle = .none
    return f
  }()

  /// Renders `content` into a new pixel buffer, or nil if allocation fails.
  static func pixelBuffer(for content: TickerContent, now: Date = Date()) -> CVPixelBuffer? {
    let size = TickerLayout.size(rows: content.rows.count)
    var buffer: CVPixelBuffer?
    let attrs = [
      kCVPixelBufferCGImageCompatibilityKey: true,
      kCVPixelBufferCGBitmapContextCompatibilityKey: true,
      kCVPixelBufferIOSurfacePropertiesKey: [:] as CFDictionary
    ] as CFDictionary
    let status = CVPixelBufferCreate(kCFAllocatorDefault, Int(size.width), Int(size.height),
                                     kCVPixelFormatType_32BGRA, attrs, &buffer)
    guard status == kCVReturnSuccess, let pixels = buffer else {
      NSLog("[PipTicker] CVPixelBufferCreate failed: %d", status)
      return nil
    }
    CVPixelBufferLockBaseAddress(pixels, [])
    defer { CVPixelBufferUnlockBaseAddress(pixels, []) }
    guard let context = CGContext(
      data: CVPixelBufferGetBaseAddress(pixels),
      width: Int(size.width), height: Int(size.height), bitsPerComponent: 8,
      bytesPerRow: CVPixelBufferGetBytesPerRow(pixels),
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    ) else {
      NSLog("[PipTicker] CGContext creation failed")
      return nil
    }
    // UIKit text drawing expects a top-left origin.
    context.translateBy(x: 0, y: size.height)
    context.scaleBy(x: 1, y: -1)
    UIGraphicsPushContext(context)
    draw(content, size: size, now: now)
    UIGraphicsPopContext()
    return pixels
  }

  /// Wraps a pixel buffer in a sample buffer flagged to display immediately.
  static func sampleBuffer(from pixels: CVPixelBuffer) -> CMSampleBuffer? {
    var format: CMVideoFormatDescription?
    guard CMVideoFormatDescriptionCreateForImageBuffer(allocator: kCFAllocatorDefault, imageBuffer: pixels,
                                                       formatDescriptionOut: &format) == noErr,
          let format else { return nil }
    let now = CMClockGetTime(CMClockGetHostTimeClock())
    var timing = CMSampleTimingInfo(duration: CMTime(seconds: 1, preferredTimescale: 600),
                                    presentationTimeStamp: now, decodeTimeStamp: .invalid)
    var sample: CMSampleBuffer?
    guard CMSampleBufferCreateReadyWithImageBuffer(allocator: kCFAllocatorDefault, imageBuffer: pixels,
                                                   formatDescription: format, sampleTiming: &timing,
                                                   sampleBufferOut: &sample) == noErr,
          let sample else { return nil }
    if let attachments = CMSampleBufferGetSampleAttachmentsArray(sample, createIfNecessary: true),
       CFArrayGetCount(attachments) > 0 {
      let dict = unsafeBitCast(CFArrayGetValueAtIndex(attachments, 0), to: CFMutableDictionary.self)
      CFDictionarySetValue(dict, Unmanaged.passUnretained(kCMSampleAttachmentKey_DisplayImmediately).toOpaque(),
                           Unmanaged.passUnretained(kCFBooleanTrue).toOpaque())
    }
    return sample
  }

  /// A UIImage of the same frame, for the in-app preview.
  static func image(from pixels: CVPixelBuffer) -> UIImage? {
    let ci = CIImage(cvPixelBuffer: pixels)
    guard let cg = ciContext.createCGImage(ci, from: ci.extent) else { return nil }
    return UIImage(cgImage: cg)
  }

  // MARK: Drawing

  private static func draw(_ content: TickerContent, size: CGSize, now: Date) {
    TickerPalette.bg.setFill()
    UIRectFill(CGRect(origin: .zero, size: size))
    drawHeader(content, width: size.width, now: now)
    if content.rows.isEmpty {
      text("Nothing to show yet", font: .systemFont(ofSize: 22, weight: .semibold), color: TickerPalette.muted)
        .draw(at: CGPoint(x: TickerLayout.padX, y: TickerLayout.header + 50))
      return
    }
    for (index, row) in content.rows.enumerated() {
      drawRow(row, top: TickerLayout.header + CGFloat(index) * TickerLayout.row, width: size.width,
              last: index == content.rows.count - 1)
    }
  }

  private static func drawHeader(_ content: TickerContent, width: CGFloat, now: Date) {
    TickerPalette.card.setFill()
    UIRectFill(CGRect(x: 0, y: 0, width: width, height: TickerLayout.header))
    TickerPalette.brand.setFill()
    UIBezierPath(roundedRect: CGRect(x: TickerLayout.padX, y: 17, width: 12, height: 12), cornerRadius: 3).fill()
    let title = text(content.title, font: .systemFont(ofSize: 21, weight: .bold), color: TickerPalette.ink)
    let stamp = content.updatedAt.map { timeFormatter.string(from: $0) } ?? ""
    let right = text(stamp, font: .monospacedDigitSystemFont(ofSize: 18, weight: .medium), color: TickerPalette.muted)
    let rightSize = right.size()
    right.draw(at: CGPoint(x: width - TickerLayout.padX - rightSize.width, y: (TickerLayout.header - rightSize.height) / 2))
    let titleWidth = width - TickerLayout.padX * 2 - 22 - rightSize.width - 12
    title.draw(with: CGRect(x: TickerLayout.padX + 22, y: 10, width: titleWidth, height: 28),
               options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine], context: nil)
  }

  private static func drawRow(_ row: TickerRow, top: CGFloat, width: CGFloat, last: Bool) {
    let x = TickerLayout.padX
    let gain = row.margin >= 0
    let marginText = text(GpFormat.signed(row.margin), font: .monospacedDigitSystemFont(ofSize: 25, weight: .bold),
                          color: gain ? TickerPalette.profit : TickerPalette.muted)
    let marginSize = marginText.size()
    marginText.draw(at: CGPoint(x: width - x - marginSize.width, y: top + 8))

    let name = text(row.name, font: .systemFont(ofSize: 24, weight: .semibold), color: TickerPalette.ink)
    name.draw(with: CGRect(x: x, y: top + 9, width: width - x * 2 - marginSize.width - 12, height: 30),
              options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine], context: nil)

    let sub = row.isHolding
      ? "Paid \(GpFormat.short(row.buy))  Now \(GpFormat.short(row.sell))" + (row.qty > 1 ? "  ×\(row.qty)" : "")
      : "Buy \(GpFormat.short(row.buy))  Sell \(GpFormat.short(row.sell))"
    let subFont = UIFont.monospacedDigitSystemFont(ofSize: 18, weight: .regular)
    text(sub, font: subFont, color: TickerPalette.muted).draw(at: CGPoint(x: x, y: top + 39))
    if let change = row.change {
      let up = change >= 0
      let chg = text(GpFormat.percent(change), font: .monospacedDigitSystemFont(ofSize: 18, weight: .semibold),
                     color: up ? TickerPalette.brand : TickerPalette.muted)
      chg.draw(at: CGPoint(x: width - x - chg.size().width, y: top + 39))
    }
    if !last {
      TickerPalette.rule.setFill()
      UIRectFill(CGRect(x: x, y: top + TickerLayout.row - 1, width: width - x * 2, height: 1))
    }
  }

  private static func text(_ string: String, font: UIFont, color: UIColor) -> NSAttributedString {
    let style = NSMutableParagraphStyle()
    style.lineBreakMode = .byTruncatingTail
    return NSAttributedString(string: string, attributes: [.font: font, .foregroundColor: color, .paragraphStyle: style])
  }
}
