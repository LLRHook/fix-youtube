# Store listing for version 0.3.0

## Name

Fix YouTube

## Short description

Hide YouTube Shorts and recommendations, disable autoplay, and open Subscriptions by default. No settings or setup.

## Full description

Fix YouTube is a free, open-source extension that hides YouTube Shorts and recommendations, disables autoplay, and opens your Subscriptions feed by default. It starts working as soon as you install it.

Shorts are hidden in the sidebar, feeds, search results, and channel tabs. Watch-page recommendations and end-screen suggestions are removed, along with selected recommendation shelves and Mixes in search.

Search still works. Comments, channel pages, playlist queues, live chat, and YouTube's native playback controls remain available. Direct Shorts links open in the standard video player.

There is nothing to configure. The popup has one button to open YouTube. Disable or remove the extension in your browser whenever you want the original experience back.

Fix YouTube does not track what you watch, store preferences, or send data to a service. It works locally on desktop YouTube.

You must be signed in to YouTube to see your subscriptions. Public search and videos remain available while signed out. This extension is for desktop YouTube and does not modify YouTube Music or embedded players.

Independent open-source project. Not affiliated with YouTube or Google.

## Single purpose

Reduce distractions on desktop YouTube through a fixed set of navigation and page-cleanup rules.

## Permission justification

- youtube.com host access: applies the content script and styles to desktop YouTube and lets the browser redirect its Home and Shorts URLs.
- declarativeNetRequest: redirects only main-frame Home and Shorts navigation. The rules neither inspect request bodies nor transmit data.

No remote code. No analytics. No data collection or sale. No storage permission.

## Category and platforms

Chrome Web Store: Productivity.
Firefox Add-ons: Appearance / Other, desktop platforms only.
English listing. Chromium 105+; Firefox 142+.

## Release notes

Version 0.3.0 replaces the settings dashboard with one fixed experience. It removes custom themes, timers, settings import/export, watch tracking, and feature-toggle shortcuts. Updates autoplay handling and the watch-page layout for current YouTube. Shared Shorts links now open the correct video, and the Shorts sidebar entry is hidden in every YouTube language.

## Assets

- `01-overview.png`: 1280 x 800; the actual popup framed in a product overview.
- `02-search.png`: 1280 x 800; YouTube search with cleanup applied.
- `03-watch.png`: 1280 x 800; the watch page with cleanup applied.
- `promo-440x280.png`: required Chrome promotional graphic.
- `icon128.png`: store icon, also included in each browser ZIP.

Screenshot provenance and validation limits are documented in `../VERIFICATION.md`.

## Links for the publisher

Project/support: https://github.com/LLRHook/fix-youtube
Issues: https://github.com/LLRHook/fix-youtube/issues
Privacy: https://github.com/LLRHook/fix-youtube/blob/main/PRIVACY.md

Verify these public links before submission. If a store requires a dedicated privacy-policy page, publish the same text from `PRIVACY.md` on the project's website.
