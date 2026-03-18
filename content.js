// Fix YouTube - Content Script

(function () {
  "use strict";

  const DEFAULTS = {
    hideShorts: true,
    hideSidebar: true,
    noAutoplay: true,
    hideTrending: true,
    redirectHome: true,
    subsOnly: true,
    gridColumns: 0, // 0 = YouTube default
    dailyTimerEnabled: true,
    dailyLimitMinutes: 60,
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

  // Rewrite the YouTube logo and Home sidebar links to point to subscriptions
  function hijackHomeLinks() {
    if (!settings.redirectHome) return;
    const subUrl = "/feed/subscriptions";

    // Logo link
    document
      .querySelectorAll("#logo a, ytd-topbar-logo-renderer a, a.ytd-topbar-logo-renderer")
      .forEach((a) => {
        if (a.getAttribute("href") !== subUrl) {
          a.setAttribute("href", subUrl);
        }
      });

    // Home sidebar entries
    document
      .querySelectorAll(
        'ytd-mini-guide-entry-renderer a[title="Home"], ytd-guide-entry-renderer a[title="Home"]'
      )
      .forEach((a) => {
        if (a.getAttribute("href") !== subUrl) {
          a.setAttribute("href", subUrl);
        }
      });
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

  // ===== Subscribed Channels Filter =====

  let subscribedChannels = new Set();

  function loadCachedSubscriptions() {
    chrome.storage.local.get(
      ["subscribedChannels", "subscribedChannelsUpdated"],
      (data) => {
        if (data.subscribedChannels) {
          subscribedChannels = new Set(data.subscribedChannels);
        }
        // Refresh if cache is older than 1 hour or empty
        const age = Date.now() - (data.subscribedChannelsUpdated || 0);
        if (subscribedChannels.size === 0 || age > 3600000) {
          refreshSubscriptions();
        }
      }
    );
  }

  function collectSubscriptionsFromGuide() {
    document
      .querySelectorAll(
        'ytd-guide-section-renderer ytd-guide-entry-renderer a[href^="/@"],' +
          'ytd-guide-section-renderer ytd-guide-entry-renderer a[href^="/channel/"]'
      )
      .forEach((a) => {
        const href = a.getAttribute("href").toLowerCase().split("?")[0];
        subscribedChannels.add(href);
      });
  }

  function refreshSubscriptions() {
    fetch("/feed/channels", { credentials: "same-origin" })
      .then((res) => res.text())
      .then((html) => {
        // Extract channel handles and IDs from the page response
        const handleMatches = html.matchAll(/"(\/@[\w.-]+)"/g);
        for (const m of handleMatches) {
          subscribedChannels.add(m[1].toLowerCase());
        }
        const channelMatches = html.matchAll(
          /"(\/channel\/UC[\w-]+)"/g
        );
        for (const m of channelMatches) {
          subscribedChannels.add(m[1].toLowerCase());
        }

        chrome.storage.local.set({
          subscribedChannels: Array.from(subscribedChannels),
          subscribedChannelsUpdated: Date.now(),
        });
      })
      .catch(() => {});
  }

  function getChannelPath(renderer) {
    // Find the channel link within a video renderer
    const link = renderer.querySelector(
      'a[href^="/@"], a[href^="/channel/"]'
    );
    if (!link) return null;
    return link.getAttribute("href").toLowerCase().split("?")[0];
  }

  function isCurrentVideoChannel(channelPath) {
    // Don't filter the channel of the video you're currently watching
    const ownerLink = document.querySelector(
      "ytd-watch-metadata ytd-channel-name a, #owner a[href]"
    );
    if (!ownerLink) return false;
    const currentPath = ownerLink
      .getAttribute("href")
      ?.toLowerCase()
      .split("?")[0];
    return currentPath === channelPath;
  }

  function filterUnsubscribed() {
    if (!settings.subsOnly || subscribedChannels.size === 0) return;

    // Sidebar "Up next" recommendations on watch pages
    document
      .querySelectorAll("#related ytd-compact-video-renderer")
      .forEach((renderer) => {
        if (renderer.dataset.fixYtChecked) return;
        renderer.dataset.fixYtChecked = "1";

        const ch = getChannelPath(renderer);
        if (ch && !subscribedChannels.has(ch) && !isCurrentVideoChannel(ch)) {
          renderer.remove();
        }
      });

    // Endscreen overlay recommendations
    document.querySelectorAll(".ytp-ce-element a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      // Endscreen cards link to videos, not channels — hide all if subsOnly
      // since we can't determine the channel from the card itself
      if (href && !href.includes("/feed/") && !href.includes("/channel/")) {
        const card = link.closest(".ytp-ce-element");
        if (card) card.style.display = "none";
      }
    });

    // Homepage/feed recommendations (if user somehow lands there)
    document
      .querySelectorAll(
        "ytd-browse:not([page-subtype='subscriptions']) ytd-rich-item-renderer"
      )
      .forEach((renderer) => {
        if (renderer.dataset.fixYtChecked) return;
        renderer.dataset.fixYtChecked = "1";

        const ch = getChannelPath(renderer);
        if (ch && !subscribedChannels.has(ch)) {
          renderer.remove();
        }
      });

    // Search results
    document
      .querySelectorAll("ytd-search ytd-video-renderer")
      .forEach((renderer) => {
        if (renderer.dataset.fixYtChecked) return;
        renderer.dataset.fixYtChecked = "1";

        const ch = getChannelPath(renderer);
        if (ch && !subscribedChannels.has(ch)) {
          renderer.remove();
        }
      });
  }

  // Load settings and apply
  function init() {
    chrome.storage.sync.get(DEFAULTS, (stored) => {
      settings = { ...DEFAULTS, ...stored };
      applyClasses();
      redirectHomeToSubscriptions();
    });
  }

  // ===== Daily Timer =====

  let timerInterval = null;
  let blockerElement = null;
  let clockElement = null;

  function getTodayKey() {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  }

  function loadTimerState(callback) {
    chrome.storage.local.get(["timerDate", "timerSeconds"], (data) => {
      const today = getTodayKey();
      if (data.timerDate === today) {
        callback(data.timerSeconds || 0);
      } else {
        // New day — reset
        chrome.storage.local.set({ timerDate: today, timerSeconds: 0 });
        callback(0);
      }
    });
  }

  function saveTimerSeconds(seconds) {
    chrome.storage.local.set({
      timerDate: getTodayKey(),
      timerSeconds: seconds,
    });
  }

  function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }

  function ensureClock() {
    if (clockElement) return;
    clockElement = document.createElement("div");
    clockElement.id = "fix-yt-clock";
    clockElement.textContent = "--:--";

    function insert() {
      if (document.body) {
        document.body.appendChild(clockElement);
      } else {
        requestAnimationFrame(insert);
      }
    }
    insert();
  }

  function removeClock() {
    if (clockElement) {
      clockElement.remove();
      clockElement = null;
    }
  }

  function updateClock(remainingSeconds, limitSeconds) {
    if (!clockElement) return;
    clockElement.textContent = formatTime(remainingSeconds);

    const pct = remainingSeconds / limitSeconds;
    clockElement.classList.remove("warning", "critical");
    if (pct <= 0) {
      clockElement.classList.add("critical");
    } else if (pct <= 0.25) {
      clockElement.classList.add("warning");
    }
  }

  function showBlocker(usedSeconds) {
    if (blockerElement) return;

    blockerElement = document.createElement("div");
    blockerElement.id = "fix-yt-blocker";
    blockerElement.innerHTML = `
      <div class="fix-yt-blocker-content">
        <div class="fix-yt-blocker-icon">&#9203;</div>
        <h1>Daily limit reached</h1>
        <p>You've used <strong>${formatTime(usedSeconds)}</strong> of YouTube today.</p>
        <p class="fix-yt-blocker-sub">Come back tomorrow with fresh eyes.</p>
      </div>
    `;

    // Pause any playing video
    const video = document.querySelector("video");
    if (video) video.pause();

    function insertBlocker() {
      if (document.body) {
        document.body.appendChild(blockerElement);
      } else {
        requestAnimationFrame(insertBlocker);
      }
    }
    insertBlocker();
  }

  function removeBlocker() {
    if (blockerElement) {
      blockerElement.remove();
      blockerElement = null;
    }
  }

  function startTimer() {
    if (timerInterval) return;
    if (!settings.dailyTimerEnabled) {
      removeClock();
      return;
    }

    const limitSeconds = settings.dailyLimitMinutes * 60;
    ensureClock();

    loadTimerState((seconds) => {
      let elapsed = seconds;

      if (elapsed >= limitSeconds) {
        updateClock(0, limitSeconds);
        showBlocker(elapsed);
        return;
      }

      updateClock(limitSeconds - elapsed, limitSeconds);

      timerInterval = setInterval(() => {
        // Only count when the tab is visible
        if (document.visibilityState !== "visible") return;
        if (!settings.dailyTimerEnabled) {
          stopTimer();
          removeBlocker();
          removeClock();
          return;
        }

        elapsed++;
        const remaining = Math.max(0, limitSeconds - elapsed);
        updateClock(remaining, limitSeconds);

        // Save every 5 seconds to reduce writes
        if (elapsed % 5 === 0) {
          saveTimerSeconds(elapsed);
        }

        if (elapsed >= limitSeconds) {
          saveTimerSeconds(elapsed);
          showBlocker(elapsed);
          stopTimer();
        }
      }, 1000);
    });
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // ===== Init & Listeners =====

  // Listen for settings changes from popup
  chrome.storage.onChanged.addListener((changes) => {
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in settings) {
        settings[key] = newValue;
      }
    }
    applyClasses();

    // React to timer setting changes
    if ("dailyTimerEnabled" in changes || "dailyLimitMinutes" in changes) {
      stopTimer();
      removeBlocker();
      removeClock();
      if (settings.dailyTimerEnabled) {
        startTimer();
      }
    }
  });

  // Run on initial load
  init();

  // Observe DOM for dynamically added content
  function startObserver() {
    if (document.body) {
      const observer = new MutationObserver(() => {
        removeShortsElements();
        disableAutoplay();
        hijackHomeLinks();
        collectSubscriptionsFromGuide();
        filterUnsubscribed();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      removeShortsElements();
      disableAutoplay();
      hijackHomeLinks();
      loadCachedSubscriptions();
      startTimer();
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
    hijackHomeLinks();
    collectSubscriptionsFromGuide();
    filterUnsubscribed();
  });

  // Save timer when leaving
  window.addEventListener("beforeunload", () => {
    loadTimerState((seconds) => saveTimerSeconds(seconds));
  });
})();
