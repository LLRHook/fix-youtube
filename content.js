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
    weekdayLimitMinutes: 60,
    weekendLimitMinutes: 120,
    hideAlgorithmic: true,
    declutter: true,
    themeAccentColor: "",
    themeFontScale: 100,
    themeMode: "auto",
    playbackSpeed: 0, // 0 = YouTube default
    breakReminderEnabled: true,
    breakIntervalMinutes: 25,
  };

  const CLASS_MAP = {
    hideShorts: "fix-yt-hide-shorts",
    hideSidebar: "fix-yt-hide-sidebar",
    noAutoplay: "fix-yt-no-autoplay",
    hideAlgorithmic: "fix-yt-hide-algorithmic",
    declutter: "fix-yt-declutter",
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

    applyTheme();
  }

  // Apply custom theme (accent color, font scale, dark/light mode)
  let themeStyleEl = null;

  function applyTheme() {
    const root = document.documentElement;

    // Theme mode
    if (settings.themeMode === "dark") {
      root.setAttribute("dark", "");
    } else if (settings.themeMode === "light") {
      root.removeAttribute("dark");
    }
    // "auto" — don't touch the attribute, let YouTube decide

    // Font scale
    if (settings.themeFontScale && settings.themeFontScale !== 100) {
      root.style.fontSize = settings.themeFontScale + "%";
    } else {
      root.style.removeProperty("font-size");
    }

    // Accent color
    if (!themeStyleEl) {
      themeStyleEl = document.createElement("style");
      themeStyleEl.id = "fix-yt-theme";
    }

    if (settings.themeAccentColor) {
      const c = settings.themeAccentColor;
      themeStyleEl.textContent = `
        html {
          --yt-spec-call-to-action: ${c} !important;
          --yt-spec-brand-button-background: ${c} !important;
          --yt-spec-icon-active-other: ${c} !important;
          --yt-spec-text-primary-inverse: #fff !important;
        }
        /* Subscribe button */
        ytd-subscribe-button-renderer tp-yt-paper-button,
        ytd-subscribe-button-renderer button {
          background-color: ${c} !important;
        }
        /* Player progress bar */
        .ytp-play-progress, .ytp-swatch-background-color {
          background: ${c} !important;
        }
        /* Active sidebar entry */
        ytd-guide-entry-renderer[active] {
          background-color: color-mix(in srgb, ${c} 15%, transparent) !important;
        }
        ytd-guide-entry-renderer[active] .title {
          color: ${c} !important;
        }
      `;
    } else {
      themeStyleEl.textContent = "";
    }

    function insertStyle() {
      if (document.head) {
        if (!themeStyleEl.parentNode) document.head.appendChild(themeStyleEl);
      } else {
        requestAnimationFrame(insertStyle);
      }
    }
    insertStyle();
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

  // Remove algorithmic sections by matching shelf/section title text
  const ALGORITHMIC_TITLES = [
    "people also watched",
    "for you",
    "recommended",
    "breaking news",
    "latest posts",
    "channels new to you",
    "popular near you",
    "trending",
    "watch it again",
    "previously watched",
    "similar to",
    "you might also like",
  ];

  function removeAlgorithmicSections() {
    if (!settings.hideAlgorithmic) return;

    // Shelf renderers with algorithmic titles
    document
      .querySelectorAll(
        "ytd-rich-shelf-renderer:not([is-shorts]), ytd-shelf-renderer, ytd-rich-section-renderer"
      )
      .forEach((shelf) => {
        if (shelf.dataset.fixYtAlgoChecked) return;
        shelf.dataset.fixYtAlgoChecked = "1";

        const titleEl = shelf.querySelector(
          "#title-text, #title, span.style-scope.ytd-rich-shelf-renderer"
        );
        if (!titleEl) return;

        const title = titleEl.textContent.trim().toLowerCase();
        if (ALGORITHMIC_TITLES.some((t) => title.includes(t))) {
          shelf.remove();
        }
      });

    // Horizontal card carousels ("Channels new to you", etc.)
    document
      .querySelectorAll("ytd-horizontal-card-list-renderer")
      .forEach((el) => {
        if (el.dataset.fixYtAlgoChecked) return;
        el.dataset.fixYtAlgoChecked = "1";
        el.remove();
      });

    // Community/post renderers in feeds
    document
      .querySelectorAll(
        "ytd-post-renderer, ytd-backstage-post-thread-renderer"
      )
      .forEach((el) => {
        if (el.dataset.fixYtAlgoChecked) return;
        el.dataset.fixYtAlgoChecked = "1";
        el.remove();
      });

    // Auto-generated Mixes
    document
      .querySelectorAll("ytd-radio-renderer, ytd-compact-radio-renderer")
      .forEach((el) => {
        if (el.dataset.fixYtAlgoChecked) return;
        el.dataset.fixYtAlgoChecked = "1";
        el.remove();
      });
  }

  // Normalize ALL CAPS clickbait titles to sentence case
  function normalizeClickbaitTitles() {
    if (!settings.declutter) return;

    document
      .querySelectorAll(
        "#video-title, #video-title-link, yt-formatted-string#video-title"
      )
      .forEach((el) => {
        if (el.dataset.fixYtTitleNorm) return;
        el.dataset.fixYtTitleNorm = "1";

        const text = el.textContent.trim();
        if (text.length < 5) return;

        // Check if >60% of alphabetic chars are uppercase
        const letters = text.replace(/[^a-zA-Z]/g, "");
        if (letters.length === 0) return;
        const upperCount = letters.replace(/[^A-Z]/g, "").length;
        if (upperCount / letters.length < 0.6) return;

        // Convert to sentence case: capitalize first letter of each sentence
        const normalized = text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
        el.textContent = normalized;
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

  // Force playback speed on the video element
  let lastSpeedVideoSrc = "";

  function applyPlaybackSpeed() {
    if (!settings.playbackSpeed) return;
    const video = document.querySelector("video");
    if (!video) return;

    // Only set once per video source to avoid fighting the user
    if (video.src === lastSpeedVideoSrc) return;
    if (video.readyState >= 1) {
      video.playbackRate = settings.playbackSpeed;
      lastSpeedVideoSrc = video.src;
    }
  }

  // ===== Channel Blocklist =====

  let blockedChannels = new Set();

  function loadBlockedChannels() {
    chrome.storage.sync.get({ blockedChannels: [] }, (data) => {
      blockedChannels = new Set(
        data.blockedChannels.map((c) => c.toLowerCase())
      );
    });
  }

  function filterBlockedChannels() {
    if (blockedChannels.size === 0) return;

    const selectors =
      "ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer";

    document.querySelectorAll(selectors).forEach((renderer) => {
      if (renderer.dataset.fixYtBlockChecked) return;
      renderer.dataset.fixYtBlockChecked = "1";

      const ch = getChannelPath(renderer);
      if (ch && blockedChannels.has(ch)) {
        renderer.remove();
      }
    });
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

  function isWeekend() {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }

  function getEffectiveLimitMinutes() {
    return isWeekend()
      ? settings.weekendLimitMinutes
      : settings.weekdayLimitMinutes;
  }

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

    const limitSeconds = getEffectiveLimitMinutes() * 60;
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
        tickBreakReminder();
        tickWatchTracking();

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

  // ===== Break Reminders =====

  let continuousSeconds = 0;
  let hiddenSince = 0;
  let breakReminderElement = null;

  function showBreakReminder() {
    if (breakReminderElement) return;

    const video = document.querySelector("video");
    if (video) video.pause();

    breakReminderElement = document.createElement("div");
    breakReminderElement.id = "fix-yt-break";
    breakReminderElement.innerHTML = `
      <div class="fix-yt-break-content">
        <div class="fix-yt-break-icon">&#9749;</div>
        <h2>Time for a break</h2>
        <p>You've been watching for <strong>${settings.breakIntervalMinutes} minutes</strong> straight.</p>
        <p class="fix-yt-break-sub">Stand up, stretch, look away from the screen.</p>
        <button id="fix-yt-break-dismiss">Continue watching</button>
      </div>
    `;

    function insert() {
      if (document.body) {
        document.body.appendChild(breakReminderElement);
        document
          .getElementById("fix-yt-break-dismiss")
          .addEventListener("click", dismissBreakReminder);
      } else {
        requestAnimationFrame(insert);
      }
    }
    insert();
  }

  function dismissBreakReminder() {
    if (breakReminderElement) {
      breakReminderElement.remove();
      breakReminderElement = null;
    }
    continuousSeconds = 0;
  }

  function tickBreakReminder() {
    if (!settings.breakReminderEnabled) return;
    if (breakReminderElement) return; // already showing

    if (document.visibilityState !== "visible") {
      if (hiddenSince === 0) hiddenSince = Date.now();
      return;
    }

    // Reset continuous counter if tab was hidden for > 30s (user took a break)
    if (hiddenSince > 0) {
      const hiddenFor = (Date.now() - hiddenSince) / 1000;
      hiddenSince = 0;
      if (hiddenFor > 30) {
        continuousSeconds = 0;
        return;
      }
    }

    continuousSeconds++;
    if (continuousSeconds >= settings.breakIntervalMinutes * 60) {
      showBreakReminder();
    }
  }

  // ===== Watch History Tracking =====

  let currentWatch = null;

  function getVideoId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("v");
  }

  function startWatchTracking() {
    const videoId = getVideoId();
    if (!videoId) {
      saveCurrentWatch();
      currentWatch = null;
      return;
    }

    // Same video — keep tracking
    if (currentWatch && currentWatch.videoId === videoId) return;

    // New video — save old, start new
    saveCurrentWatch();

    const titleEl = document.querySelector(
      "ytd-watch-metadata yt-formatted-string.ytd-watch-metadata, h1.ytd-watch-metadata yt-formatted-string"
    );
    const channelLink = document.querySelector(
      "ytd-watch-metadata ytd-channel-name a, #owner a[href]"
    );
    const channelNameEl = document.querySelector(
      "ytd-watch-metadata ytd-channel-name yt-formatted-string, #owner ytd-channel-name yt-formatted-string"
    );

    currentWatch = {
      videoId,
      title: titleEl ? titleEl.textContent.trim() : "",
      channel: channelLink
        ? channelLink.getAttribute("href").toLowerCase().split("?")[0]
        : "",
      channelName: channelNameEl ? channelNameEl.textContent.trim() : "",
      startedAt: Date.now(),
      watchedSeconds: 0,
    };
  }

  function tickWatchTracking() {
    if (!currentWatch) return;
    if (document.visibilityState !== "visible") return;
    currentWatch.watchedSeconds++;
  }

  function saveCurrentWatch() {
    if (!currentWatch || currentWatch.watchedSeconds < 5) return;

    // Fill in title/channel if they weren't ready at start
    if (!currentWatch.title) {
      const titleEl = document.querySelector(
        "ytd-watch-metadata yt-formatted-string.ytd-watch-metadata, h1.ytd-watch-metadata yt-formatted-string"
      );
      if (titleEl) currentWatch.title = titleEl.textContent.trim();
    }
    if (!currentWatch.channelName) {
      const channelNameEl = document.querySelector(
        "ytd-watch-metadata ytd-channel-name yt-formatted-string, #owner ytd-channel-name yt-formatted-string"
      );
      if (channelNameEl)
        currentWatch.channelName = channelNameEl.textContent.trim();
    }

    const entry = {
      videoId: currentWatch.videoId,
      title: currentWatch.title,
      channel: currentWatch.channel,
      channelName: currentWatch.channelName,
      timestamp: currentWatch.startedAt,
      watchedSeconds: currentWatch.watchedSeconds,
    };

    chrome.storage.local.get({ watchHistory: [] }, (data) => {
      const history = data.watchHistory;
      history.push(entry);

      // Prune entries older than 30 days
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const pruned = history.filter((e) => e.timestamp >= cutoff);

      chrome.storage.local.set({ watchHistory: pruned });
    });
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

    // React to blocklist changes
    if ("blockedChannels" in changes) {
      blockedChannels = new Set(
        (changes.blockedChannels.newValue || []).map((c) => c.toLowerCase())
      );
    }

    // React to timer setting changes
    if (
      "dailyTimerEnabled" in changes ||
      "weekdayLimitMinutes" in changes ||
      "weekendLimitMinutes" in changes
    ) {
      stopTimer();
      removeBlocker();
      removeClock();
      if (settings.dailyTimerEnabled) {
        startTimer();
      }
    }

    if ("breakReminderEnabled" in changes || "breakIntervalMinutes" in changes) {
      dismissBreakReminder();
      continuousSeconds = 0;
    }
  });

  // Run on initial load
  init();

  // Observe DOM for dynamically added content
  function startObserver() {
    if (document.body) {
      const observer = new MutationObserver(() => {
        removeShortsElements();
        removeAlgorithmicSections();
        filterBlockedChannels();
        normalizeClickbaitTitles();
        disableAutoplay();
        applyPlaybackSpeed();
        hijackHomeLinks();
        collectSubscriptionsFromGuide();
        filterUnsubscribed();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      removeShortsElements();
      removeAlgorithmicSections();
      disableAutoplay();
      hijackHomeLinks();
      loadBlockedChannels();
      loadCachedSubscriptions();
      startTimer();
      startWatchTracking();
    } else {
      requestAnimationFrame(startObserver);
    }
  }

  startObserver();

  // Catch SPA navigations
  document.addEventListener("yt-navigate-finish", () => {
    redirectHomeToSubscriptions();
    removeShortsElements();
    removeAlgorithmicSections();
    filterBlockedChannels();
    normalizeClickbaitTitles();
    disableAutoplay();
    lastSpeedVideoSrc = "";
    applyPlaybackSpeed();
    hijackHomeLinks();
    collectSubscriptionsFromGuide();
    filterUnsubscribed();
    startWatchTracking();
  });

  // Save state when leaving
  window.addEventListener("beforeunload", () => {
    loadTimerState((seconds) => saveTimerSeconds(seconds));
    saveCurrentWatch();
  });
})();
