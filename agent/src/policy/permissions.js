// Permission Model Definition
// Authoritative source: docs/07-permission-model.md

const Permissions = {
    // System Categories
    'system.read': { risk: 'low', confirmation: false, description: 'Read system-level information and status' },
    'system.write': { risk: 'medium', confirmation: true, description: 'Modify non-critical system settings' },
    'system.admin': { risk: 'high', confirmation: true, description: 'Full administrative access to the system' },

    // Docker Categories
    'docker.read': { risk: 'medium', confirmation: false, description: 'List and inspect Docker containers and images' },
    'docker.control': { risk: 'medium', confirmation: true, description: 'Start, stop, and manage Docker resources' },

    // File System Categories
    'file.read': { risk: 'medium', confirmation: false, description: 'Read files and directory structures' },
    'file.write': { risk: 'high', confirmation: true, description: 'Create, modify, and delete files' },

    // Network Categories
    'network.read': { risk: 'high', confirmation: true, description: 'Monitor network traffic and connectivity' },
    'network.scan': { risk: 'high', confirmation: true, description: 'Scan the local network for devices and services' },

    // Shell Categories
    'shell.exec': { risk: 'critical', confirmation: true, description: 'Execute arbitrary shell commands' },

    // Communication Categories
    'communication.send': { risk: 'high', confirmation: true, description: 'Send messages or data to external services' },

    // Browser Categories
    'browser.open': { risk: 'medium', confirmation: true, description: 'Open URLs in the default web browser' },

    // Code Categories
    'code.exec': { risk: 'critical', confirmation: true, description: 'Execute and run arbitrary code' },

    // UI & Automation Categories (macOS Phase 1 MVP)
    'ui.window.focus': { risk: 'medium', confirmation: false, description: 'Switch focus between application windows' },
    'ui.input.send': { risk: 'high', confirmation: true, description: 'Simulate keyboard and mouse input events' },

    // Input Automation Categories (Phase 2 — native CGEvent helper)
    'ui.pointer.control': { risk: 'high', confirmation: true, description: 'Precise control of mouse pointer movements and clicks' },

    // Window Control Categories (Phase 2 — native AXUIElement helper)
    'ui.window.control': { risk: 'high', confirmation: true, description: 'Manipulate window states (minimize, maximize, close, move)' },

    // Screen Capture Categories
    'ui.screen.capture': { risk: 'medium', confirmation: true, description: 'Capture screenshots or record the screen' }
};

module.exports = { Permissions };
