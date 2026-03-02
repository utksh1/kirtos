// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "kirtos-window-helper",
    platforms: [.macOS(.v12)],
    targets: [
        .executableTarget(
            name: "kirtos-window-helper",
            path: "Sources",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("CoreGraphics")
            ]
        )
    ]
)
