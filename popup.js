// Fix YouTube - Popup Script

const DEFAULTS = {
  hideShorts: true,
  hideSidebar: true,
  noAutoplay: true,
  hideTrending: true,
  redirectHome: true,
  hideAlgorithmic: true,
  declutter: true,
  playbackSpeed: 0,
  themeAccentColor: "",
  themeFontScale: 100,
  themeMode: "auto",
  subsOnly: true,
  gridColumns: 0,
  dailyTimerEnabled: true,
  weekdayLimitMinutes: 60,
  weekendLimitMinutes: 120,
  breakReminderEnabled: true,
  breakIntervalMinutes: 25,
};

const TOGGLE_IDS = [
  "hideShorts",
  "hideSidebar",
  "noAutoplay",
  "hideTrending",
  "redirectHome",
  "hideAlgorithmic",
  "declutter",
  "subsOnly",
  "dailyTimerEnabled",
  "breakReminderEnabled",
];

let currentSettings = {};

// Load saved settings and apply to UI
chrome.storage.sync.get(DEFAULTS, (settings) => {
  currentSettings = settings;

  for (const id of TOGGLE_IDS) {
    const el = document.getElementById(id);
    el.checked = settings[id];
    el.addEventListener("change", () => {
      chrome.storage.sync.set({ [id]: el.checked });
      currentSettings[id] = el.checked;
    });
  }

  updateGridButtons(settings.gridColumns);
  updateLimitButtons("weekday", settings.weekdayLimitMinutes);
  updateLimitButtons("weekend", settings.weekendLimitMinutes);
  highlightActiveSchedule();
  updateBreakButtons(settings.breakIntervalMinutes);
  updateSpeedButtons(settings.playbackSpeed);
  updateThemeMode(settings.themeMode);
  updateAccentSwatches(settings.themeAccentColor);
  updateFontScale(settings.themeFontScale);
  updateTimerDisplay();
});

// Grid column buttons
document.querySelectorAll(".grid-options button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = parseInt(btn.dataset.grid, 10);
    chrome.storage.sync.set({ gridColumns: value });
    updateGridButtons(value);
  });
});

// Daily limit buttons (weekday + weekend)
document.querySelectorAll("#weekdayLimits button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = parseInt(btn.dataset.limit, 10);
    chrome.storage.sync.set({ weekdayLimitMinutes: value });
    currentSettings.weekdayLimitMinutes = value;
    updateLimitButtons("weekday", value);
    updateTimerDisplay();
  });
});

document.querySelectorAll("#weekendLimits button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = parseInt(btn.dataset.limit, 10);
    chrome.storage.sync.set({ weekendLimitMinutes: value });
    currentSettings.weekendLimitMinutes = value;
    updateLimitButtons("weekend", value);
    updateTimerDisplay();
  });
});

// Break interval buttons
document.querySelectorAll("#breakOptions button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = parseInt(btn.dataset.break, 10);
    chrome.storage.sync.set({ breakIntervalMinutes: value });
    currentSettings.breakIntervalMinutes = value;
    updateBreakButtons(value);
  });
});

function updateBreakButtons(active) {
  document.querySelectorAll("#breakOptions button").forEach((btn) => {
    btn.classList.toggle(
      "active",
      parseInt(btn.dataset.break, 10) === active
    );
  });
}

function updateGridButtons(active) {
  document.querySelectorAll(".grid-options button").forEach((btn) => {
    btn.classList.toggle("active", parseInt(btn.dataset.grid, 10) === active);
  });
}

function updateLimitButtons(group, active) {
  const id = group === "weekday" ? "#weekdayLimits" : "#weekendLimits";
  document.querySelectorAll(id + " button").forEach((btn) => {
    btn.classList.toggle(
      "active",
      parseInt(btn.dataset.limit, 10) === active
    );
  });
}

function isWeekend() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

function highlightActiveSchedule() {
  const wdLabel = document.getElementById("weekdayLabel");
  const weLabel = document.getElementById("weekendLabel");
  if (isWeekend()) {
    weLabel.classList.add("schedule-active");
    wdLabel.classList.remove("schedule-active");
  } else {
    wdLabel.classList.add("schedule-active");
    weLabel.classList.remove("schedule-active");
  }
}

function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return "0:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function updateTimerDisplay() {
  const today = new Date().toISOString().slice(0, 10);

  chrome.storage.local.get(["timerDate", "timerSeconds"], (data) => {
    const usedSeconds =
      data.timerDate === today ? data.timerSeconds || 0 : 0;
    const effectiveLimit = isWeekend()
      ? currentSettings.weekendLimitMinutes
      : currentSettings.weekdayLimitMinutes;
    const limitSeconds = effectiveLimit * 60;
    const remaining = Math.max(0, limitSeconds - usedSeconds);

    const el = document.getElementById("timerRemaining");
    el.textContent = formatTime(remaining);

    // Color coding
    const pct = remaining / limitSeconds;
    el.classList.remove("warning", "critical");
    if (pct <= 0) {
      el.classList.add("critical");
    } else if (pct <= 0.25) {
      el.classList.add("warning");
    }
  });
}

// Refresh the timer display every second while popup is open
setInterval(updateTimerDisplay, 1000);

// ===== Playback Speed =====

document.querySelectorAll("#speedOptions button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = parseFloat(btn.dataset.speed);
    chrome.storage.sync.set({ playbackSpeed: value });
    currentSettings.playbackSpeed = value;
    updateSpeedButtons(value);
  });
});

function updateSpeedButtons(active) {
  document.querySelectorAll("#speedOptions button").forEach((btn) => {
    btn.classList.toggle(
      "active",
      parseFloat(btn.dataset.speed) === active
    );
  });
}

// ===== Theme =====

// Mode buttons
document.querySelectorAll("#themeModeOptions button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    chrome.storage.sync.set({ themeMode: mode });
    currentSettings.themeMode = mode;
    updateThemeMode(mode);
  });
});

function updateThemeMode(active) {
  document.querySelectorAll("#themeModeOptions button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === active);
  });
}

// Accent color swatches
document.querySelectorAll("#accentSwatches .color-swatch").forEach((swatch) => {
  swatch.addEventListener("click", () => {
    const color = swatch.dataset.color;
    chrome.storage.sync.set({ themeAccentColor: color });
    currentSettings.themeAccentColor = color;
    updateAccentSwatches(color);
  });
});

function updateAccentSwatches(active) {
  document.querySelectorAll("#accentSwatches .color-swatch").forEach((s) => {
    s.classList.toggle("active", s.dataset.color === active);
  });
}

// Font scale buttons
document.querySelectorAll("#fontScaleOptions button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const scale = parseInt(btn.dataset.scale, 10);
    chrome.storage.sync.set({ themeFontScale: scale });
    currentSettings.themeFontScale = scale;
    updateFontScale(scale);
  });
});

function updateFontScale(active) {
  document.querySelectorAll("#fontScaleOptions button").forEach((btn) => {
    btn.classList.toggle(
      "active",
      parseInt(btn.dataset.scale, 10) === active
    );
  });
}

// ===== Channel Blocklist =====

function renderBlocklist(channels) {
  const container = document.getElementById("blocklist");
  if (channels.length === 0) {
    container.innerHTML = '<div class="blocklist-empty">No blocked channels</div>';
    return;
  }
  container.innerHTML = channels
    .map(
      (ch) =>
        `<div class="blocklist-item"><span>${ch}</span><button data-channel="${ch}">&times;</button></div>`
    )
    .join("");

  container.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const toRemove = btn.dataset.channel;
      chrome.storage.sync.get({ blockedChannels: [] }, (data) => {
        const updated = data.blockedChannels.filter((c) => c !== toRemove);
        chrome.storage.sync.set({ blockedChannels: updated });
        renderBlocklist(updated);
      });
    });
  });
}

chrome.storage.sync.get({ blockedChannels: [] }, (data) => {
  renderBlocklist(data.blockedChannels);
});

document.getElementById("blockAddBtn").addEventListener("click", addChannel);
document.getElementById("blockInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addChannel();
});

function addChannel() {
  const input = document.getElementById("blockInput");
  let value = input.value.trim().toLowerCase();
  if (!value) return;

  // Normalize: ensure it starts with /@
  if (value.startsWith("@")) value = "/" + value;
  if (!value.startsWith("/@") && !value.startsWith("/channel/")) {
    value = "/@" + value;
  }

  chrome.storage.sync.get({ blockedChannels: [] }, (data) => {
    if (data.blockedChannels.includes(value)) {
      input.value = "";
      return;
    }
    const updated = [...data.blockedChannels, value];
    chrome.storage.sync.set({ blockedChannels: updated });
    renderBlocklist(updated);
    input.value = "";
  });
}

// ===== Export / Import =====

function showStatus(msg) {
  const el = document.getElementById("actionStatus");
  el.textContent = msg;
  setTimeout(() => {
    el.textContent = "";
  }, 3000);
}

document.getElementById("dashboardBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

document.getElementById("exportBtn").addEventListener("click", () => {
  chrome.storage.sync.get(null, (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fix-youtube-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    showStatus("Settings exported");
  });
});

document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result);

      // Validate: only allow known setting keys
      const validKeys = new Set(Object.keys(DEFAULTS));
      const cleaned = {};
      for (const [key, value] of Object.entries(data)) {
        if (validKeys.has(key)) {
          cleaned[key] = value;
        }
      }

      if (Object.keys(cleaned).length === 0) {
        showStatus("No valid settings found in file");
        return;
      }

      chrome.storage.sync.set(cleaned, () => {
        showStatus("Settings imported — reload YouTube");
        // Update the popup UI to reflect imported settings
        for (const id of TOGGLE_IDS) {
          if (id in cleaned) {
            document.getElementById(id).checked = cleaned[id];
            currentSettings[id] = cleaned[id];
          }
        }
        if ("gridColumns" in cleaned) updateGridButtons(cleaned.gridColumns);
        if ("weekdayLimitMinutes" in cleaned)
          updateLimitButtons("weekday", cleaned.weekdayLimitMinutes);
        if ("weekendLimitMinutes" in cleaned)
          updateLimitButtons("weekend", cleaned.weekendLimitMinutes);
        updateTimerDisplay();
      });
    } catch {
      showStatus("Invalid JSON file");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});
