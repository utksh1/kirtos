// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "kirtos-input-helper",
    platforms: [.macOS(.v12)],
    targets: [
        .executableTarget(
            name: "kirtos-input-helper",
            path: "Sources",
            linkerSettings: [
                .linkedFramework("CoreGraphics"),
                .linkedFramework("AppKit")
            ]
        )
    ]
)
