// Fix YouTube - Popup Script

const DEFAULTS = {
  hideShorts: true,
  hideSidebar: true,
  noAutoplay: true,
  hideTrending: true,
  redirectHome: true,
  gridColumns: 0,
};

const TOGGLE_IDS = [
  "hideShorts",
  "hideSidebar",
  "noAutoplay",
  "hideTrending",
  "redirectHome",
];

// Load saved settings and apply to UI
chrome.storage.sync.get(DEFAULTS, (settings) => {
  for (const id of TOGGLE_IDS) {
    const el = document.getElementById(id);
    el.checked = settings[id];
    el.addEventListener("change", () => {
      chrome.storage.sync.set({ [id]: el.checked });
    });
  }

  updateGridButtons(settings.gridColumns);
});

// Grid column buttons
document.querySelectorAll(".grid-options button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = parseInt(btn.dataset.grid, 10);
    chrome.storage.sync.set({ gridColumns: value });
    updateGridButtons(value);
  });
});

function updateGridButtons(active) {
  document.querySelectorAll(".grid-options button").forEach((btn) => {
    btn.classList.toggle("active", parseInt(btn.dataset.grid, 10) === active);
  });
}
