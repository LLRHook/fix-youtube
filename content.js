// Fix YouTube - Content Script
// Handles dynamic removal of Shorts and redirect logic for SPA navigation

(function () {
  "use strict";

  const SUBSCRIPTIONS_URL = "/feed/subscriptions";

  // Redirect bare youtube.com to subscriptions (catches SPA navigations)
  function redirectHomeToSubscriptions() {
    const path = window.location.pathname;
    if (path === "/" || path === "") {
      window.location.replace("https://www.youtube.com" + SUBSCRIPTIONS_URL);
    }
  }

  // Remove Shorts elements that slip past CSS (dynamically loaded content)
  function removeShortsElements() {
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

  // Run on initial load
  redirectHomeToSubscriptions();

  // Observe DOM for dynamically added Shorts content
  const observer = new MutationObserver(() => {
    removeShortsElements();
  });

  function startObserver() {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      removeShortsElements();
    } else {
      requestAnimationFrame(startObserver);
    }
  }

  startObserver();

  // Catch SPA navigations (YouTube uses History API)
  document.addEventListener("yt-navigate-finish", () => {
    redirectHomeToSubscriptions();
    removeShortsElements();
  });
})();
