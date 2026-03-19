// Fix YouTube - Background Service Worker
// Handles keyboard shortcut commands

const COMMAND_TO_SETTING = {
  "toggle-sidebar": "hideSidebar",
  "toggle-subs-only": "subsOnly",
  "toggle-timer": "dailyTimerEnabled",
};

chrome.commands.onCommand.addListener((command) => {
  const settingKey = COMMAND_TO_SETTING[command];
  if (!settingKey) return;

  chrome.storage.sync.get(settingKey, (data) => {
    const newValue = !data[settingKey];
    chrome.storage.sync.set({ [settingKey]: newValue });
  });
});
