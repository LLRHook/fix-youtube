// A fixed, local cleanup of desktop YouTube. No settings or watch tracking.
(() => {
  "use strict";
  if (window.top !== window || location.pathname.startsWith("/embed/")) return;
  const recommendationTitles = new Set([
    "people also watched", "for you", "recommended", "breaking news",
    "channels new to you", "popular near you", "trending", "watch it again",
    "previously watched", "you might also like", "people also search for",
  ]);
  let scheduled = false;
  let lastAutoplayClick = -Infinity;
  let autoplayRetry = null;

  function redirect() {
    if (location.pathname === "/") {
      location.replace("https://www.youtube.com/feed/subscriptions");
      return true;
    }
    const shorts = location.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)(?:\/|$)/);
    if (shorts) {
      location.replace("https://www.youtube.com/watch?v=" + shorts[1]);
      return true;
    }
    return false;
  }

  function cleanPage() {
    scheduled = false;
    if (redirect()) return;
    // Change navigation links, never links inside descriptions or comments.
    document.querySelectorAll(
      'ytd-topbar-logo-renderer a[href], #logo a[href], ' +
      'ytd-guide-entry-renderer a[href="/"], ytd-mini-guide-entry-renderer a[href="/"]'
    ).forEach((link) => {
      if (link.getAttribute("href") !== "/feed/subscriptions") {
        link.setAttribute("href", "/feed/subscriptions");
      }
    });
    // Limit title matching to search/feed shelves, preserving channel pages.
    document.querySelectorAll(
      'ytd-search ytd-shelf-renderer, ' +
      'ytd-browse[page-subtype="subscriptions"] ytd-rich-shelf-renderer'
    ).forEach((shelf) => {
      const title = shelf.querySelector("#title-text, #title");
      const hidden = recommendationTitles.has(title?.textContent.trim().toLowerCase());
      // Re-evaluate renderers reused by YouTube after navigation.
      shelf.classList.toggle("fix-yt-recommendation", hidden);
    });
    // aria-checked is normally on the inner button, not its container.
    const toggle = document.querySelector(
      '.ytp-autonav-toggle-button[aria-checked="true"], ' +
      '.ytp-autonav-toggle-button-container[aria-checked="true"]'
    );
    if (toggle && Date.now() - lastAutoplayClick > 500) {
      lastAutoplayClick = Date.now();
      toggle.click();
    } else if (toggle && autoplayRetry === null) {
      autoplayRetry = setTimeout(() => {
        autoplayRetry = null;
        scheduleClean();
      }, 501 - (Date.now() - lastAutoplayClick));
    }
  }

  function scheduleClean() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(cleanPage);
  }

  function start() {
    cleanPage();
    const observer = new MutationObserver(scheduleClean);
    observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ["aria-checked", "href"],
    });
    document.addEventListener("yt-navigate-finish", cleanPage);
    document.addEventListener("yt-page-data-updated", scheduleClean);
    window.addEventListener("popstate", cleanPage);
  }

  if (redirect()) return;
  if (document.documentElement) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
