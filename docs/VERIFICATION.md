# Verification: Fix YouTube 0.3.0

Checked October 2, 2026. Branch: `completion/20261002-production-readiness`.

## Automated results

| Check | Result | Evidence |
| --- | --- | --- |
| Node behavior/package tests | PASS | `npm test`, zero failures |
| Installed-extension tests | PASS | `npm run test:e2e` in Chrome for Testing 154 and Firefox 156: zero failures, two documented Firefox skips |
| DOM/CSS regression fixture | PASS | `tests/browser.html`, run by the installed-extension tests in both browsers |
| Mozilla package validation | PASS | `web-ext@10.7.0 lint --warnings-as-errors`: zero errors, warnings, or notices |
| Chrome and Firefox builds | PASS | `python build.py`; ZIP integrity checks passed |

CI runs every check above on each push and pull request. See `.github/workflows/extension.yml`.

The installed-extension tests load the built packages into real browsers. A local HTTPS stand-in for YouTube logs every request, so the network redirects are verified directly. They cover:

- Home and every shared Shorts URL form (plain, `?feature=share`, trailing slash with query, fragment). They are redirected before YouTube receives a request.
- Style and content-script injection, client-side Shorts navigation, embed exclusion, and the popup (Chrome).
- Upgrade from the configurable 0.2.0 release (`8ec06f4`). Legacy dynamic rules are removed (asserted in Chrome), fixed redirects apply, and an existing tab recovers after a reload.
- Browser restart with the same profile, plus disable, re-enable, and uninstall.

Firefox skips two checks because WebDriver BiDi cannot open `moz-extension:` pages. The package test covers the popup markup. In Firefox, the 0.2.0 Shorts rule already produced correct URLs, so a leftover legacy rule would not change behavior.

## Defects found and fixed in this pass

| Defect | Evidence | Fix |
| --- | --- | --- |
| Shared Shorts links corrupted the video ID in Chromium | With the previous rule loaded, Chrome redirected `/shorts/Ab_c-D12345?feature=share` to `/watch?v=Ab_c-D12345feature=share`. Chrome substitutes only the matched part of the URL. Firefox was unaffected. | `rules.json` now matches the complete URL. The installed-extension test fails on the old rule and passes on the new one. |
| Shorts sidebar entry stayed visible in non-English YouTube | In Japanese, the expanded sidebar showed ショート. Its anchor has a localized title and no href. | `styles.css` also matches the language-neutral Shorts icon. A localized fixture was added. Verified live in Japanese and German. |

## Live YouTube results

Two kinds of session were used. The first was the Helium 154 instance (Chromium 154) with the user's unpacked installation, signed in. The second was fresh Chrome for Testing 154 and Firefox 156 installs, signed out. No account writes were made.

| Check | Result | Evidence |
| --- | --- | --- |
| Shared Shorts redirect | PASS | `/shorts/MT-ErptvDmg?feature=share` and `youtube.com/shorts/MT-ErptvDmg/?si=…` opened `/watch?v=MT-ErptvDmg` |
| Home redirect | PASS | Helium, Chrome and Firefox: `/` and `/?app=desktop` opened Subscriptions |
| Playback | PASS | Helium, Chrome and Firefox reached `readyState` 4 with advancing time. The earlier Helium buffering issue did not recur. |
| Search-to-watch navigation | PASS | Client-side navigation kept the cleanup: recommendations hidden, autoplay `false`, video 1100 × 619 matching the player |
| Captions | PASS | Toggling with `c` rendered caption text |
| Theater and fullscreen | PASS | The video filled the player in theater mode (2552 × 1153) and fullscreen (2560 × 1440), and returned to 1100 × 619 afterward |
| End of video | PASS | No navigation to another video; end-screen suggestions hidden |
| Playlist | PASS | The queue panel kept the secondary column. Next video (Shift+N) navigated client-side and continued playing. A square source video correctly used a square player. |
| Live chat | PASS | An active chat kept the secondary column. After closing chat, YouTube's own **Live chat** control reopened it with the extension enabled. |
| Narrow windows / zoom | PASS | At 640, 960 and 1366 px wide, the video matched the player, with no horizontal overflow |
| Other languages | PASS | German and Japanese: Shorts results, shelves and sidebar entries hidden; ordinary results retained |
| Subscriptions (signed in) | PASS | Feed visible; no Shorts sidebar entry |

## Quality review

- **CPU.** CDP profiles attribute 5 ms of `content.js` time to 32 s of search scrolling (0.016%). Subscriptions scrolling, 60 s of playback, and 60 s of busy live chat produced no `content.js` samples at a 0.5 ms interval. Live chat runs in a frame that the content script does not enter.
- **Memory.** The content script keeps no growing state: one observer, one shelf-title set, and no caches.
- **Popup accessibility.** There is one focusable link with a visible focus ring. Contrast is at least 5.8:1 for all text. The button is 5.83:1, and the 11 px footer is 5.95:1.
- **Permissions and packages.** `declarativeNetRequest` plus desktop YouTube hosts only. Each browser ZIP contains only runtime files, icons, the manifest and the license.
- **Language scope.** Redirects, Shorts removal, watch-page recommendations and autoplay are language-independent. Recommendation-shelf removal in search and Subscriptions matches English shelf titles. In other languages, those shelves remain visible.

## Supported browsers

The tested versions are Chromium 154 (Helium, Chrome for Testing) and Firefox 156. The manifests declare Chromium 105+ and Firefox 142+, but versions below the tested ones were not exercised.

## Screenshot provenance

- `docs/store/01-overview.png`: 1280 x 800 browser capture of `docs/store/overview.html`, embedding the actual popup without changing its controls.
- `docs/store/02-search.png`: 1280 x 800 capture of live public YouTube search with the actual cleanup code applied.
- `docs/store/03-watch.png`: 1280 x 800 capture of live public YouTube playback with the actual cleanup code applied.
- `docs/images/popup-overview.png`: 360 x 526 crop of the actual popup render.
- `docs/store/promo-440x280.png`: original geometric brand artwork; not a screenshot.

The search and watch screenshots were captured signed out. They contain public NASA video material, not the user's account feed. They demonstrate the visible product effect and should not be described as native Firefox screenshots.

## Not covered here

- Chrome Web Store and Firefox Add-ons submission. Mozilla signing requires the publisher accounts.
- Upgrading from a store-installed build, as opposed to unpacked/temporary installs. No store build has been published yet.
