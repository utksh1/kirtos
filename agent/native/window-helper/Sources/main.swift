import Foundation
import AppKit

// ─── Kirtos Native Window Helper ───────────────────────────────────────────────
// Receives JSON commands on stdin, executes AXUIElement window actions, returns JSON on stdout.
// No policy logic — that lives in the Node executor and PolicyEngine.
//
// Protocol (NDJSON — line-delimited JSON):
//   Request:  { "id": "...", "action": "focus|minimize|maximize|close|move|resize", "params": { ... } }
//   Response: { "id": "...", "ok": true/false, "errorCode": "...", "message": "...", "windowInfo": { ... } }
//
// Error codes:
//   WINDOW_AX_DENIED       — Accessibility permission not granted
//   WINDOW_NO_FRONTMOST    — No frontmost application or window found
//   WINDOW_ACTION_FAILED   — AX action execution failed
//   WINDOW_OUT_OF_BOUNDS   — Move/resize coordinates outside screen frame
//   WINDOW_INVALID_PAYLOAD — Malformed JSON or missing fields

// ─── Error Codes ───────────────────────────────────────────────────────────────
enum WindowError: String {
    case axDenied       = "WINDOW_AX_DENIED"
    case noFrontmost    = "WINDOW_NO_FRONTMOST"
    case actionFailed   = "WINDOW_ACTION_FAILED"
    case outOfBounds    = "WINDOW_OUT_OF_BOUNDS"
    case invalidPayload = "WINDOW_INVALID_PAYLOAD"
}

// ─── Screen Frame ──────────────────────────────────────────────────────────────
func getScreenVisibleFrame() -> CGRect {
    if let screen = NSScreen.main {
        return screen.visibleFrame
    }
    return CGDisplayBounds(CGMainDisplayID())
}

func getScreenFullFrame() -> CGRect {
    if let screen = NSScreen.main {
        return screen.frame
    }
    return CGDisplayBounds(CGMainDisplayID())
}

// ─── AX Helpers ────────────────────────────────────────────────────────────────

func getFocusedApplication() -> AXUIElement? {
    let systemWide = AXUIElementCreateSystemWide()
    var app: AnyObject?
    let result = AXUIElementCopyAttributeValue(systemWide, kAXFocusedApplicationAttribute as CFString, &app)
    guard result == .success else { return nil }
    return (app as! AXUIElement)
}

func getFocusedWindow(app: AXUIElement) -> AXUIElement? {
    var window: AnyObject?
    let result = AXUIElementCopyAttributeValue(app, kAXFocusedWindowAttribute as CFString, &window)
    guard result == .success else { return nil }
    return (window as! AXUIElement)
}

func getWindowTitle(window: AXUIElement) -> String? {
    var title: AnyObject?
    let result = AXUIElementCopyAttributeValue(window, kAXTitleAttribute as CFString, &title)
    guard result == .success else { return nil }
    return title as? String
}

func getAppName(app: AXUIElement) -> String? {
    var title: AnyObject?
    let result = AXUIElementCopyAttributeValue(app, kAXTitleAttribute as CFString, &title)
    guard result == .success else { return nil }
    return title as? String
}

func getWindowPosition(window: AXUIElement) -> CGPoint? {
    var pos: AnyObject?
    let result = AXUIElementCopyAttributeValue(window, kAXPositionAttribute as CFString, &pos)
    guard result == .success else { return nil }
    var point = CGPoint.zero
    AXValueGetValue(pos as! AXValue, .cgPoint, &point)
    return point
}

func getWindowSize(window: AXUIElement) -> CGSize? {
    var sizeVal: AnyObject?
    let result = AXUIElementCopyAttributeValue(window, kAXSizeAttribute as CFString, &sizeVal)
    guard result == .success else { return nil }
    var size = CGSize.zero
    AXValueGetValue(sizeVal as! AXValue, .cgSize, &size)
    return size
}

func setWindowPosition(window: AXUIElement, point: CGPoint) -> Bool {
    var p = point
    guard let value = AXValueCreate(.cgPoint, &p) else { return false }
    let result = AXUIElementSetAttributeValue(window, kAXPositionAttribute as CFString, value)
    return result == .success
}

func setWindowSize(window: AXUIElement, size: CGSize) -> Bool {
    var s = size
    guard let value = AXValueCreate(.cgSize, &s) else { return false }
    let result = AXUIElementSetAttributeValue(window, kAXSizeAttribute as CFString, value)
    return result == .success
}

func buildWindowInfo(app: AXUIElement, window: AXUIElement) -> [String: Any] {
    var info: [String: Any] = [:]
    info["appName"] = getAppName(app: app) ?? "unknown"
    info["title"] = getWindowTitle(window: window) ?? "untitled"
    if let pos = getWindowPosition(window: window) {
        info["position"] = ["x": Int(pos.x), "y": Int(pos.y)]
    }
    if let size = getWindowSize(window: window) {
        info["size"] = ["width": Int(size.width), "height": Int(size.height)]
    }
    return info
}

// ─── Response Encoding ─────────────────────────────────────────────────────────
func respond(id: String, ok: Bool, errorCode: String? = nil, message: String? = nil, windowInfo: [String: Any]? = nil) {
    var resp: [String: Any] = ["id": id, "ok": ok]
    if let ec = errorCode { resp["errorCode"] = ec }
    if let msg = message { resp["message"] = msg }
    if let wi = windowInfo { resp["windowInfo"] = wi }

    if let data = try? JSONSerialization.data(withJSONObject: resp),
       let str = String(data: data, encoding: .utf8) {
        print(str)
        fflush(stdout)
    }
}

func respondError(id: String, code: WindowError, message: String) {
    respond(id: id, ok: false, errorCode: code.rawValue, message: message)
}

func respondOk(id: String, message: String = "ok", windowInfo: [String: Any]? = nil) {
    respond(id: id, ok: true, message: message, windowInfo: windowInfo)
}

// ─── Action Handlers ───────────────────────────────────────────────────────────

func handleFocus(id: String, params: [String: Any]) {
    guard let appIdentifier = params["app"] as? String, !appIdentifier.isEmpty else {
        respondError(id: id, code: .invalidPayload, message: "focus requires 'app' (string)")
        return
    }

    var activated = false

    // Try bundle ID first
    if let runningApp = NSRunningApplication.runningApplications(withBundleIdentifier: appIdentifier).first {
        activated = runningApp.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])
    }

    // Fall back to name match
    if !activated {
        let workspace = NSWorkspace.shared
        let apps = workspace.runningApplications
        if let app = apps.first(where: { $0.localizedName?.lowercased() == appIdentifier.lowercased() }) {
            activated = app.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])
        }
    }

    if activated {
        // Brief delay to let activation settle, then report window info
        Thread.sleep(forTimeInterval: 0.2)
        if let app = getFocusedApplication(), let win = getFocusedWindow(app: app) {
            respondOk(id: id, message: "Focused \(appIdentifier)", windowInfo: buildWindowInfo(app: app, window: win))
        } else {
            respondOk(id: id, message: "Activated \(appIdentifier) (no focused window found)")
        }
    } else {
        respondError(id: id, code: .actionFailed, message: "Could not activate '\(appIdentifier)'. Is it running?")
    }
}

func handleMinimize(id: String) {
    guard let app = getFocusedApplication() else {
        respondError(id: id, code: .noFrontmost, message: "No frontmost application")
        return
    }
    guard let window = getFocusedWindow(app: app) else {
        respondError(id: id, code: .noFrontmost, message: "No focused window in frontmost app")
        return
    }

    let result = AXUIElementSetAttributeValue(window, kAXMinimizedAttribute as CFString, true as CFBoolean)
    if result == .success {
        respondOk(id: id, message: "Window minimized", windowInfo: buildWindowInfo(app: app, window: window))
    } else {
        respondError(id: id, code: .actionFailed, message: "Failed to minimize window (AX error \(result.rawValue))")
    }
}

func handleMaximize(id: String) {
    guard let app = getFocusedApplication() else {
        respondError(id: id, code: .noFrontmost, message: "No frontmost application")
        return
    }
    guard let window = getFocusedWindow(app: app) else {
        respondError(id: id, code: .noFrontmost, message: "No focused window in frontmost app")
        return
    }

    // Strategy 1: Try the zoom button (native maximize toggle)
    var zoomButton: AnyObject?
    let zoomResult = AXUIElementCopyAttributeValue(window, kAXZoomButtonAttribute as CFString, &zoomButton)
    if zoomResult == .success, let button = zoomButton {
        let pressResult = AXUIElementPerformAction(button as! AXUIElement, kAXPressAction as CFString)
        if pressResult == .success {
            Thread.sleep(forTimeInterval: 0.3)
            respondOk(id: id, message: "Window maximized (zoom)", windowInfo: buildWindowInfo(app: app, window: window))
            return
        }
    }

    // Strategy 2: Fallback — set position + size to screen visible frame
    let frame = getScreenVisibleFrame()
    let fullFrame = getScreenFullFrame()
    // Convert from AppKit coordinates (origin bottom-left) to AX coordinates (origin top-left)
    let axY = fullFrame.height - frame.origin.y - frame.height
    let targetPos = CGPoint(x: frame.origin.x, y: axY)
    let targetSize = CGSize(width: frame.width, height: frame.height)

    let posOk = setWindowPosition(window: window, point: targetPos)
    let sizeOk = setWindowSize(window: window, size: targetSize)

    if posOk || sizeOk {
        respondOk(id: id, message: "Window maximized (set frame)", windowInfo: buildWindowInfo(app: app, window: window))
    } else {
        respondError(id: id, code: .actionFailed, message: "Failed to maximize window")
    }
}

func handleClose(id: String) {
    guard let app = getFocusedApplication() else {
        respondError(id: id, code: .noFrontmost, message: "No frontmost application")
        return
    }
    guard let window = getFocusedWindow(app: app) else {
        respondError(id: id, code: .noFrontmost, message: "No focused window in frontmost app")
        return
    }

    let info = buildWindowInfo(app: app, window: window)

    // Strategy 1: Try the close button
    var closeButton: AnyObject?
    let closeResult = AXUIElementCopyAttributeValue(window, kAXCloseButtonAttribute as CFString, &closeButton)
    if closeResult == .success, let button = closeButton {
        let pressResult = AXUIElementPerformAction(button as! AXUIElement, kAXPressAction as CFString)
        if pressResult == .success {
            respondOk(id: id, message: "Window closed", windowInfo: info)
            return
        }
    }

    // Strategy 2: Try AXCloseAction directly (some apps support this)
    let actionResult = AXUIElementPerformAction(window, "AXClose" as CFString)
    if actionResult == .success {
        respondOk(id: id, message: "Window closed (AXClose action)", windowInfo: info)
        return
    }

    respondError(id: id, code: .actionFailed, message: "Failed to close window")
}

func handleMove(id: String, params: [String: Any]) {
    guard let x = params["x"] as? Double, let y = params["y"] as? Double else {
        respondError(id: id, code: .invalidPayload, message: "move requires x, y (numbers)")
        return
    }

    // Bounds check against screen visible frame
    let frame = getScreenVisibleFrame()
    let fullFrame = getScreenFullFrame()

    // Allow reasonable negative offsets for multi-monitor but cap at reasonable bounds
    // AX coordinates have origin top-left; screen frame considers menu bar
    let minX = frame.origin.x - 100      // slight off-screen tolerance
    let maxX = frame.origin.x + frame.width + 100
    let minY: Double = -100
    let maxY = fullFrame.height + 100

    if x < minX || x > maxX || y < minY || y > maxY {
        respondError(id: id, code: .outOfBounds,
                     message: "Position (\(Int(x)), \(Int(y))) out of bounds. Screen range: x[\(Int(minX))..\(Int(maxX))], y[\(Int(minY))..\(Int(maxY))]")
        return
    }

    guard let app = getFocusedApplication() else {
        respondError(id: id, code: .noFrontmost, message: "No frontmost application")
        return
    }
    guard let window = getFocusedWindow(app: app) else {
        respondError(id: id, code: .noFrontmost, message: "No focused window in frontmost app")
        return
    }

    let point = CGPoint(x: x, y: y)
    if setWindowPosition(window: window, point: point) {
        respondOk(id: id, message: "Window moved to (\(Int(x)), \(Int(y)))", windowInfo: buildWindowInfo(app: app, window: window))
    } else {
        respondError(id: id, code: .actionFailed, message: "Failed to move window")
    }
}

func handleResize(id: String, params: [String: Any]) {
    guard let width = params["width"] as? Double, let height = params["height"] as? Double else {
        respondError(id: id, code: .invalidPayload, message: "resize requires width, height (numbers)")
        return
    }

    // Enforce size constraints (also validated by Zod schema in Node, but defense in depth)
    if width < 200 || width > 4000 {
        respondError(id: id, code: .outOfBounds, message: "Width \(Int(width)) out of range [200..4000]")
        return
    }
    if height < 200 || height > 3000 {
        respondError(id: id, code: .outOfBounds, message: "Height \(Int(height)) out of range [200..3000]")
        return
    }

    guard let app = getFocusedApplication() else {
        respondError(id: id, code: .noFrontmost, message: "No frontmost application")
        return
    }
    guard let window = getFocusedWindow(app: app) else {
        respondError(id: id, code: .noFrontmost, message: "No focused window in frontmost app")
        return
    }

    let size = CGSize(width: width, height: height)
    if setWindowSize(window: window, size: size) {
        respondOk(id: id, message: "Window resized to \(Int(width))x\(Int(height))", windowInfo: buildWindowInfo(app: app, window: window))
    } else {
        respondError(id: id, code: .actionFailed, message: "Failed to resize window")
    }
}

// ─── Command Processing ────────────────────────────────────────────────────────
func processCommand(_ json: [String: Any]) {
    guard let id = json["id"] as? String else {
        respond(id: "unknown", ok: false, errorCode: WindowError.invalidPayload.rawValue,
                message: "Missing 'id' field")
        return
    }

    guard let action = json["action"] as? String else {
        respondError(id: id, code: .invalidPayload, message: "Missing 'action' field")
        return
    }

    let params = json["params"] as? [String: Any] ?? [:]

    switch action {
    case "focus":
        handleFocus(id: id, params: params)
    case "minimize":
        handleMinimize(id: id)
    case "maximize":
        handleMaximize(id: id)
    case "close":
        handleClose(id: id)
    case "move":
        handleMove(id: id, params: params)
    case "resize":
        handleResize(id: id, params: params)
    default:
        respondError(id: id, code: .invalidPayload, message: "Unknown action: \(action)")
    }
}

// ─── Main Loop ─────────────────────────────────────────────────────────────────

// Check accessibility first
if !AXIsProcessTrusted() {
    respond(id: "startup", ok: false, errorCode: WindowError.axDenied.rawValue,
            message: "Enable Accessibility for Kirtos in System Settings → Privacy & Security → Accessibility")
    exit(1)
}

// Signal handlers for clean shutdown
signal(SIGTERM, SIG_DFL)
signal(SIGINT, SIG_DFL)

// Ready signal
respond(id: "startup", ok: true, message: "kirtos-window-helper ready (v0.1.0)")

// Read stdin line by line (NDJSON)
while let line = readLine(strippingNewline: true) {
    if line.isEmpty { continue }

    guard let data = line.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        respond(id: "unknown", ok: false, errorCode: WindowError.invalidPayload.rawValue,
                message: "Invalid JSON")
        continue
    }

    processCommand(json)
}
