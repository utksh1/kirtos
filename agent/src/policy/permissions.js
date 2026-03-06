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
    'browser.automation': { risk: 'high', confirmation: true, description: 'Drive browser automation (click, type, capture)' },

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
    'ui.screen.capture': { risk: 'medium', confirmation: true, description: 'Capture screenshots or record the screen' },

    // Shopping Assistant Categories
    'shopping.read': { risk: 'medium', confirmation: false, description: 'View shopping lists and track orders' },
    'shopping.write': { risk: 'medium', confirmation: true, description: 'Modify shopping lists and set price alerts' },

    // Finance Categories
    'finance.read': { risk: 'medium', confirmation: false, description: 'View financial records and reports' },
    'finance.write': { risk: 'high', confirmation: true, description: 'Modify financial data and perform transactions' },

    // Health & Fitness Categories
    'health.read': { risk: 'low', confirmation: false, description: 'View health and fitness data' },
    'health.write': { risk: 'medium', confirmation: true, description: 'Log health activities and meals' },

    // Home Automation Categories
    'home.control': { risk: 'high', confirmation: true, description: 'Control smart home devices and security systems' },

    // Learning Categories
    'learning.read': { risk: 'low', confirmation: false, description: 'View learning progress and courses' },
    'learning.write': { risk: 'low', confirmation: false, description: 'Track learning activities and progress' },

    // Entertainment Categories
    'entertainment.read': { risk: 'low', confirmation: false, description: 'Search for movies and recommendations' },
    'entertainment.write': { risk: 'medium', confirmation: false, description: 'Manage watchlists' },

    // Travel Categories
    'travel.read': { risk: 'medium', confirmation: false, description: 'Check flight status and find local attractions' },
    'travel.write': { risk: 'high', confirmation: true, description: 'Book flights and hotels' },

    // Wellness Categories
    'wellness.read': { risk: 'low', confirmation: false, description: 'Access mindfulness and wellness resources' },
    'wellness.write': { risk: 'low', confirmation: false, description: 'Track mood and wellness activities' }
};

module.exports = { Permissions };
