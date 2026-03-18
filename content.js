// Fix YouTube - Content Script

(function () {
  "use strict";

  const DEFAULTS = {
    hideShorts: true,
    hideSidebar: true,
    noAutoplay: true,
    hideTrending: true,
    redirectHome: true,
    gridColumns: 0, // 0 = YouTube default
  };

  const CLASS_MAP = {
    hideShorts: "fix-yt-hide-shorts",
    hideSidebar: "fix-yt-hide-sidebar",
    noAutoplay: "fix-yt-no-autoplay",
    hideTrending: "fix-yt-hide-trending",
  };

  let settings = { ...DEFAULTS };

  // Apply CSS classes to <html> based on settings
  function applyClasses() {
    const root = document.documentElement;

    for (const [key, cls] of Object.entries(CLASS_MAP)) {
      root.classList.toggle(cls, !!settings[key]);
    }

    // Grid columns: remove all, then add the active one
    for (let i = 2; i <= 6; i++) {
      root.classList.remove("fix-yt-grid-" + i);
    }
    if (settings.gridColumns >= 2 && settings.gridColumns <= 6) {
      root.classList.add("fix-yt-grid-" + settings.gridColumns);
    }
  }

  // Redirect youtube.com/ to subscriptions
  function redirectHomeToSubscriptions() {
    if (!settings.redirectHome) return;
    const path = window.location.pathname;
    if (path === "/" || path === "") {
      window.location.replace("https://www.youtube.com/feed/subscriptions");
    }
  }

  // Remove Shorts elements from DOM (backup for dynamically loaded content)
  function removeShortsElements() {
    if (!settings.hideShorts) return;

    document
      .querySelectorAll(
        "ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer"
      )
      .forEach((el) => el.remove());

    document.querySelectorAll('a[href*="/shorts/"]').forEach((link) => {
      const renderer = link.closest(
        "ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer"
      );
      if (renderer) renderer.remove();
    });
  }

  // Disable autoplay by clicking the toggle if it's on
  function disableAutoplay() {
    if (!settings.noAutoplay) return;
    const toggle = document.querySelector(
      ".ytp-autonav-toggle-button-container"
    );
    if (toggle && toggle.getAttribute("aria-checked") === "true") {
      toggle.click();
    }
  }

  // Load settings and apply
  function init() {
    chrome.storage.sync.get(DEFAULTS, (stored) => {
      settings = { ...DEFAULTS, ...stored };
      applyClasses();
      redirectHomeToSubscriptions();
    });
  }

  // Listen for settings changes from popup
  chrome.storage.onChanged.addListener((changes) => {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in settings) {
        settings[key] = newValue;
      }
    }
    applyClasses();
  });

  // Run on initial load
  init();

  // Observe DOM for dynamically added content
  function startObserver() {
    if (document.body) {
      const observer = new MutationObserver(() => {
        removeShortsElements();
        disableAutoplay();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      removeShortsElements();
      disableAutoplay();
    } else {
      requestAnimationFrame(startObserver);
    }
  }

  startObserver();

  // Catch SPA navigations
  document.addEventListener("yt-navigate-finish", () => {
    redirectHomeToSubscriptions();
    removeShortsElements();
    disableAutoplay();
  });
})();
