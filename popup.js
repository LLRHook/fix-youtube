// Fix YouTube - Popup Script

const DEFAULTS = {
  hideShorts: true,
  hideSidebar: true,
  noAutoplay: true,
  hideTrending: true,
  redirectHome: true,
  subsOnly: true,
  gridColumns: 0,
  dailyTimerEnabled: true,
  dailyLimitMinutes: 60,
  breakReminderEnabled: true,
  breakIntervalMinutes: 25,
};

const TOGGLE_IDS = [
  "hideShorts",
  "hideSidebar",
  "noAutoplay",
  "hideTrending",
  "redirectHome",
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
  updateLimitButtons(settings.dailyLimitMinutes);
  updateBreakButtons(settings.breakIntervalMinutes);
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

// Daily limit buttons
document.querySelectorAll(".limit-options button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = parseInt(btn.dataset.limit, 10);
    chrome.storage.sync.set({ dailyLimitMinutes: value });
    currentSettings.dailyLimitMinutes = value;
    updateLimitButtons(value);
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

function updateLimitButtons(active) {
  document.querySelectorAll(".limit-options button").forEach((btn) => {
    btn.classList.toggle(
      "active",
      parseInt(btn.dataset.limit, 10) === active
    );
  });
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
    const limitSeconds = currentSettings.dailyLimitMinutes * 60;
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

// ===== Export / Import =====

function showStatus(msg) {
  const el = document.getElementById("actionStatus");
  el.textContent = msg;
  setTimeout(() => {
    el.textContent = "";
  }, 3000);
}

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
        if ("dailyLimitMinutes" in cleaned)
          updateLimitButtons(cleaned.dailyLimitMinutes);
        updateTimerDisplay();
      });
    } catch {
      showStatus("Invalid JSON file");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});
