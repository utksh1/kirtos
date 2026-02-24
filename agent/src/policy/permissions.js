// Permission Model Definition
// Authoritative source: docs/07-permission-model.md

const Permissions = {
    // System Categories
    'system.read': { risk: 'low', confirmation: false },
    'system.write': { risk: 'medium', confirmation: true },
    'system.admin': { risk: 'high', confirmation: true },

    // Docker Categories
    'docker.read': { risk: 'medium', confirmation: false },
    'docker.control': { risk: 'medium', confirmation: true },

    // File System Categories
    'file.read': { risk: 'medium', confirmation: false },
    'file.write': { risk: 'high', confirmation: true },

    // Network Categories
    'network.read': { risk: 'high', confirmation: true },
    'network.scan': { risk: 'high', confirmation: true },

    // Shell Categories
    'shell.exec': { risk: 'critical', confirmation: true },

    // Communication Categories
    'communication.send': { risk: 'high', confirmation: true },

    // Browser Categories
    'browser.open': { risk: 'medium', confirmation: true },

    // Code Categories
    'code.exec': { risk: 'critical', confirmation: true },

    // Computer Categories
    'computer.type': { risk: 'medium', confirmation: false },
    'screen.capture': { risk: 'medium', confirmation: false }
};

module.exports = { Permissions };
