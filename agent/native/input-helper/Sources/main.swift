import Foundation
import CoreGraphics
import AppKit

// ─── Kirtos Native Input Helper ────────────────────────────────────────────────
// Receives JSON commands on stdin, executes CGEvent mouse actions, returns JSON on stdout.
// No policy logic — that lives in the Node executor and PolicyEngine.
//
// Protocol (line-delimited JSON):
//   Request:  { "id": "...", "action": "move|click|scroll|drag", "params": { ... } }
//   Response: { "id": "...", "ok": true/false, "errorCode": "...", "message": "..." }
//
// Error codes:
//   INPUT_INVALID_PAYLOAD  — malformed JSON or missing fields
//   INPUT_OUT_OF_BOUNDS    — coordinates outside screen bounds
//   INPUT_RATE_LIMITED     — too many actions in time window
//   INPUT_EXEC_FAILED      — CGEvent creation or posting failed
//   INPUT_NO_ACCESSIBILITY — Accessibility permission not granted

// ─── Error Codes ───────────────────────────────────────────────────────────────
enum InputError: String {
    case invalidPayload  = "INPUT_INVALID_PAYLOAD"
    case outOfBounds     = "INPUT_OUT_OF_BOUNDS"
    case rateLimited     = "INPUT_RATE_LIMITED"
    case execFailed      = "INPUT_EXEC_FAILED"
    case noAccessibility = "INPUT_NO_ACCESSIBILITY"
}

// ─── Rate Limiter ──────────────────────────────────────────────────────────────
class RateLimiter {
    private var timestamps: [Date] = []
    private let maxActions: Int
    private let windowSeconds: Double

    init(maxActions: Int = 30, windowSeconds: Double = 1.0) {
        self.maxActions = maxActions
        self.windowSeconds = windowSeconds
    }

    func check() -> Bool {
        let now = Date()
        let cutoff = now.addingTimeInterval(-windowSeconds)
        timestamps = timestamps.filter { $0 > cutoff }
        if timestamps.count >= maxActions {
            return false
        }
        timestamps.append(now)
        return true
    }
}

// ─── Screen Bounds ─────────────────────────────────────────────────────────────
func getScreenBounds() -> CGRect {
    if let screen = NSScreen.main {
        let frame = screen.frame
        return CGRect(x: 0, y: 0, width: frame.width, height: frame.height)
    }
    // Fallback to CGDisplayBounds for the main display
    return CGDisplayBounds(CGMainDisplayID())
}

func isInBounds(x: Double, y: Double) -> Bool {
    let bounds = getScreenBounds()
    return x >= 0 && y >= 0 && x <= Double(bounds.width) && y <= Double(bounds.height)
}

// ─── Accessibility Check ───────────────────────────────────────────────────────
func checkAccessibility() -> Bool {
    return AXIsProcessTrusted()
}

// ─── CGEvent Helpers ───────────────────────────────────────────────────────────

func mouseMove(to point: CGPoint, durationMs: Int = 0) -> Bool {
    if durationMs <= 0 {
        // Instant move
        guard let event = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved,
                                   mouseCursorPosition: point, mouseButton: .left) else {
            return false
        }
        event.post(tap: CGEventTapLocation.cghidEventTap)
        return true
    }

    // Animated move: linearly interpolate over duration
    let steps = max(durationMs / 16, 1)  // ~60fps
    let currentPos = CGEvent(source: nil)?.location ?? CGPoint.zero
    let dx = (point.x - currentPos.x) / Double(steps)
    let dy = (point.y - currentPos.y) / Double(steps)
    let stepDelay = TimeInterval(durationMs) / 1000.0 / Double(steps)

    for i in 1...steps {
        let ix = currentPos.x + dx * Double(i)
        let iy = currentPos.y + dy * Double(i)
        let p = CGPoint(x: ix, y: iy)
        guard let event = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved,
                                   mouseCursorPosition: p, mouseButton: .left) else {
            return false
        }
        event.post(tap: CGEventTapLocation.cghidEventTap)
        Thread.sleep(forTimeInterval: stepDelay)
    }
    return true
}

func mouseClick(at point: CGPoint, button: String = "left", clicks: Int = 1) -> Bool {
    let (downType, upType, cgButton): (CGEventType, CGEventType, CGMouseButton) = {
        if button == "right" {
            return (.rightMouseDown, .rightMouseUp, .right)
        }
        return (.leftMouseDown, .leftMouseUp, .left)
    }()

    for clickNum in 1...clicks {
        guard let downEvent = CGEvent(mouseEventSource: nil, mouseType: downType,
                                       mouseCursorPosition: point, mouseButton: cgButton) else {
            return false
        }
        downEvent.setIntegerValueField(.mouseEventClickState, value: Int64(clickNum))
        downEvent.post(tap: CGEventTapLocation.cghidEventTap)

        guard let upEvent = CGEvent(mouseEventSource: nil, mouseType: upType,
                                     mouseCursorPosition: point, mouseButton: cgButton) else {
            return false
        }
        upEvent.setIntegerValueField(.mouseEventClickState, value: Int64(clickNum))
        upEvent.post(tap: CGEventTapLocation.cghidEventTap)

        if clickNum < clicks {
            Thread.sleep(forTimeInterval: 0.005) // Small delay between multi-clicks
        }
    }
    return true
}

func mouseScroll(deltaX: Int32, deltaY: Int32) -> Bool {
    // CGEvent scroll uses a different API
    guard let event = CGEvent(scrollWheelEvent2Source: nil, units: .pixel,
                               wheelCount: 2, wheel1: deltaY, wheel2: deltaX, wheel3: 0) else {
        return false
    }
    event.post(tap: CGEventTapLocation.cghidEventTap)
    return true
}

func mouseDrag(from: CGPoint, to: CGPoint, durationMs: Int = 200) -> Bool {
    // 1. Move to start position
    guard let moveEvent = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved,
                                   mouseCursorPosition: from, mouseButton: .left) else {
        return false
    }
    moveEvent.post(tap: CGEventTapLocation.cghidEventTap)
    Thread.sleep(forTimeInterval: 0.01)

    // 2. Mouse down at start
    guard let downEvent = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown,
                                   mouseCursorPosition: from, mouseButton: .left) else {
        return false
    }
    downEvent.post(tap: CGEventTapLocation.cghidEventTap)
    Thread.sleep(forTimeInterval: 0.01)

    // 3. Interpolate drag movement
    let steps = max(durationMs / 16, 1)
    let dx = (to.x - from.x) / Double(steps)
    let dy = (to.y - from.y) / Double(steps)
    let stepDelay = TimeInterval(durationMs) / 1000.0 / Double(steps)

    for i in 1...steps {
        let ix = from.x + dx * Double(i)
        let iy = from.y + dy * Double(i)
        let p = CGPoint(x: ix, y: iy)
        guard let dragEvent = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDragged,
                                       mouseCursorPosition: p, mouseButton: .left) else {
            return false
        }
        dragEvent.post(tap: CGEventTapLocation.cghidEventTap)
        Thread.sleep(forTimeInterval: stepDelay)
    }

    // 4. Mouse up at destination
    guard let upEvent = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp,
                                 mouseCursorPosition: to, mouseButton: .left) else {
        return false
    }
    upEvent.post(tap: CGEventTapLocation.cghidEventTap)
    return true
}

// ─── Response Encoding ─────────────────────────────────────────────────────────
func respond(id: String, ok: Bool, errorCode: String? = nil, message: String? = nil) {
    var resp: [String: Any] = ["id": id, "ok": ok]
    if let ec = errorCode { resp["errorCode"] = ec }
    if let msg = message { resp["message"] = msg }

    if let data = try? JSONSerialization.data(withJSONObject: resp),
       let str = String(data: data, encoding: .utf8) {
        print(str)
        fflush(stdout)
    }
}

func respondError(id: String, code: InputError, message: String) {
    respond(id: id, ok: false, errorCode: code.rawValue, message: message)
}

func respondOk(id: String, message: String = "ok") {
    respond(id: id, ok: true, message: message)
}

// ─── Command Processing ────────────────────────────────────────────────────────
func processCommand(_ json: [String: Any], rateLimiter: RateLimiter) {
    guard let id = json["id"] as? String else {
        // Can't even respond without an id, write a generic error
        respond(id: "unknown", ok: false, errorCode: InputError.invalidPayload.rawValue,
                message: "Missing 'id' field")
        return
    }

    guard let action = json["action"] as? String else {
        respondError(id: id, code: .invalidPayload, message: "Missing 'action' field")
        return
    }

    guard let params = json["params"] as? [String: Any] else {
        respondError(id: id, code: .invalidPayload, message: "Missing 'params' object")
        return
    }

    // Rate limit check
    if !rateLimiter.check() {
        respondError(id: id, code: .rateLimited, message: "Rate limit exceeded (max 30 actions/s)")
        return
    }

    switch action {
    case "move":
        handleMove(id: id, params: params)
    case "click":
        handleClick(id: id, params: params)
    case "scroll":
        handleScroll(id: id, params: params)
    case "drag":
        handleDrag(id: id, params: params)
    default:
        respondError(id: id, code: .invalidPayload, message: "Unknown action: \(action)")
    }
}

func handleMove(id: String, params: [String: Any]) {
    guard let x = params["x"] as? Double, let y = params["y"] as? Double else {
        respondError(id: id, code: .invalidPayload, message: "move requires x, y (numbers)")
        return
    }
    if !isInBounds(x: x, y: y) {
        respondError(id: id, code: .outOfBounds, message: "Coordinates (\(x), \(y)) are outside screen bounds")
        return
    }
    let duration = min(params["duration_ms"] as? Int ?? 0, 1000) // Cap at 1000ms
    let point = CGPoint(x: x, y: y)

    if mouseMove(to: point, durationMs: duration) {
        respondOk(id: id, message: "Moved to (\(Int(x)), \(Int(y)))")
    } else {
        respondError(id: id, code: .execFailed, message: "CGEvent creation failed for move")
    }
}

func handleClick(id: String, params: [String: Any]) {
    guard let x = params["x"] as? Double, let y = params["y"] as? Double else {
        respondError(id: id, code: .invalidPayload, message: "click requires x, y (numbers)")
        return
    }
    if !isInBounds(x: x, y: y) {
        respondError(id: id, code: .outOfBounds, message: "Coordinates (\(x), \(y)) are outside screen bounds")
        return
    }
    let button = params["button"] as? String ?? "left"
    let clicks = min(max(params["clicks"] as? Int ?? 1, 1), 3)  // Clamp 1-3
    let point = CGPoint(x: x, y: y)

    if mouseClick(at: point, button: button, clicks: clicks) {
        respondOk(id: id, message: "\(button) click(\(clicks)) at (\(Int(x)), \(Int(y)))")
    } else {
        respondError(id: id, code: .execFailed, message: "CGEvent creation failed for click")
    }
}

func handleScroll(id: String, params: [String: Any]) {
    let deltaX = params["delta_x"] as? Int ?? 0
    let deltaY = params["delta_y"] as? Int ?? 0

    // Clamp scroll deltas
    let clampedX = Int32(min(max(deltaX, -2000), 2000))
    let clampedY = Int32(min(max(deltaY, -2000), 2000))

    if mouseScroll(deltaX: clampedX, deltaY: clampedY) {
        respondOk(id: id, message: "Scrolled (dx: \(clampedX), dy: \(clampedY))")
    } else {
        respondError(id: id, code: .execFailed, message: "CGEvent creation failed for scroll")
    }
}

func handleDrag(id: String, params: [String: Any]) {
    guard let fromX = params["from_x"] as? Double,
          let fromY = params["from_y"] as? Double,
          let toX = params["to_x"] as? Double,
          let toY = params["to_y"] as? Double else {
        respondError(id: id, code: .invalidPayload, message: "drag requires from_x, from_y, to_x, to_y")
        return
    }

    // Bounds check both endpoints
    if !isInBounds(x: fromX, y: fromY) {
        respondError(id: id, code: .outOfBounds, message: "Start (\(fromX), \(fromY)) outside screen bounds")
        return
    }
    if !isInBounds(x: toX, y: toY) {
        respondError(id: id, code: .outOfBounds, message: "End (\(toX), \(toY)) outside screen bounds")
        return
    }

    let duration = min(max(params["duration_ms"] as? Int ?? 200, 50), 2000) // 50ms..2000ms
    let from = CGPoint(x: fromX, y: fromY)
    let to = CGPoint(x: toX, y: toY)

    if mouseDrag(from: from, to: to, durationMs: duration) {
        respondOk(id: id, message: "Dragged from (\(Int(fromX)),\(Int(fromY))) to (\(Int(toX)),\(Int(toY)))")
    } else {
        respondError(id: id, code: .execFailed, message: "CGEvent creation failed for drag")
    }
}

// ─── Main Loop ─────────────────────────────────────────────────────────────────

// Check accessibility first
if !checkAccessibility() {
    respond(id: "startup", ok: false, errorCode: InputError.noAccessibility.rawValue,
            message: "Enable Accessibility for Kirtos in System Settings → Privacy & Security → Accessibility")
    exit(1)
}

// Signal handlers for clean shutdown
signal(SIGTERM, SIG_DFL)
signal(SIGINT, SIG_DFL)

let rateLimiter = RateLimiter(maxActions: 30, windowSeconds: 1.0)

// Ready signal
respond(id: "startup", ok: true, message: "kirtos-input-helper ready (v0.1.0)")

// Read stdin line by line
while let line = readLine(strippingNewline: true) {
    // Skip empty lines
    if line.isEmpty { continue }

    // Parse JSON
    guard let data = line.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        respond(id: "unknown", ok: false, errorCode: InputError.invalidPayload.rawValue,
                message: "Invalid JSON")
        continue
    }

    processCommand(json, rateLimiter: rateLimiter)
}
