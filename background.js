// Fix YouTube - Background Service Worker
// Handles keyboard shortcut commands

const COMMAND_TO_SETTING = {
  "toggle-sidebar": "hideSidebar",
  "toggle-subs-only": "subsOnly",
  "toggle-timer": "dailyTimerEnabled",
};

const FOCUS_KEYS = [
  "hideShorts",
  "hideSidebar",
  "noAutoplay",
  "hideTrending",
  "hideAlgorithmic",
  "declutter",
  "subsOnly",
];

function toggleFocusMode() {
  chrome.storage.sync.get(null, (settings) => {
    if (settings.focusModeEnabled) {
      // Disable: restore pre-focus settings
      chrome.storage.local.get({ preFocusSettings: {} }, (data) => {
        const restore = data.preFocusSettings;
        restore.focusModeEnabled = false;
        chrome.storage.sync.set(restore);
      });
    } else {
      // Enable: snapshot current settings, then override
      const snapshot = {};
      for (const key of FOCUS_KEYS) {
        snapshot[key] = settings[key];
      }
      chrome.storage.local.set({ preFocusSettings: snapshot });

      const overrides = { focusModeEnabled: true };
      for (const key of FOCUS_KEYS) {
        overrides[key] = true;
      }
      chrome.storage.sync.set(overrides);
    }
  });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-focus") {
    toggleFocusMode();
    return;
  }

  const settingKey = COMMAND_TO_SETTING[command];
  if (!settingKey) return;

  chrome.storage.sync.get(settingKey, (data) => {
    const newValue = !data[settingKey];
    chrome.storage.sync.set({ [settingKey]: newValue });
  });
});
