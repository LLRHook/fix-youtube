// Fix YouTube - Background Service Worker
// Handles keyboard shortcut commands and dynamic redirect rules

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

// ===== Dynamic Redirect Rules =====

const RULE_HOME_REDIRECT = {
  id: 1,
  priority: 1,
  action: {
    type: "redirect",
    redirect: { transform: { path: "/feed/subscriptions" } },
  },
  condition: {
    regexFilter: "^https?://www\\.youtube\\.com/?$",
    resourceTypes: ["main_frame"],
  },
};

const RULE_SHORTS_REDIRECT = {
  id: 2,
  priority: 1,
  action: {
    type: "redirect",
    redirect: {
      regexSubstitution: "https://www.youtube.com/watch?v=\\1",
    },
  },
  condition: {
    regexFilter:
      "^https?://www\\.youtube\\.com/shorts/([a-zA-Z0-9_-]+)",
    resourceTypes: ["main_frame"],
  },
};

function syncRedirectRules() {
  chrome.storage.sync.get(
    { redirectHome: true, hideShorts: true },
    (settings) => {
      const addRules = [];
      const removeRuleIds = [1, 2];

      if (settings.redirectHome) addRules.push(RULE_HOME_REDIRECT);
      if (settings.hideShorts) addRules.push(RULE_SHORTS_REDIRECT);

      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules,
      });
    }
  );
}

// Sync rules on install/startup
chrome.runtime.onInstalled.addListener(syncRedirectRules);
chrome.runtime.onStartup.addListener(syncRedirectRules);

// Sync rules when relevant settings change
chrome.storage.onChanged.addListener((changes) => {
  if ("redirectHome" in changes || "hideShorts" in changes) {
    syncRedirectRules();
  }
});

// ===== Focus Mode =====

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

// ===== Keyboard Shortcuts =====

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
