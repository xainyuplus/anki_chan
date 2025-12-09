// core/settingsStore.js
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.resolve(__dirname, "../config/ai_config.json");

let cachedSettings = null;

function loadSettings() {
    if (!cachedSettings) {
        const raw = fs.readFileSync(CONFIG_PATH, "utf8");
        cachedSettings = JSON.parse(raw);
    }
    return cachedSettings;
}

function saveSettings(newSettings) {
    cachedSettings = newSettings;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newSettings, null, 2), "utf8");
}

module.exports = {
    loadSettings,
    saveSettings
};
