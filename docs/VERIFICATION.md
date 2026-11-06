# Verification: Fix YouTube 0.3.1

Checked November 6, 2026 on macOS arm64 with Node 22.23.4 and Rust 1.93.1. Browser automation used Chrome 156.0.8078.80 with disposable profiles and synthetic local fixtures. It did not use a signed-in account or a live YouTube page.

## Current automated results

| Check | Result | Scope |
| --- | --- | --- |
| `npm test` | PASS: 25 tests, 0 failures, 0 skips | Content behavior, manifests, permissions, popup, reachable upgrade fixture |
| `npm run test:packager` | PASS: 3 Rust unit tests and 13 Python integration tests, 0 failures or skips | Real Rust CLI, Python archive parity, all 14 submission checksums, both browser modes, reproducibility, malformed/missing inputs and symlink refusal |
| Rust formatting and Clippy | PASS: `cargo fmt --manifest-path tools/packager/Cargo.toml -- --check`; `cargo clippy --locked --manifest-path tools/packager/Cargo.toml --all-targets -- -D warnings` | No warnings |
| `npm run build` and `python build.py` | PASS | Rust creates Chrome/Firefox folders and ZIPs plus the 0.3.1 submission bundle; Python is a compatibility launcher |
| Mozilla package validation | PASS: web-ext 10.7.0, 0 errors, warnings or notices | `lint --source-dir dist-firefox --warnings-as-errors --output text` using the existing cached validator |
| Installed-extension Chrome tests | PASS: 18 tests, 0 failures, 0 skips | Local HTTPS stand-in; redirects, injection, SPA player replacement/readiness, upgrade, restart, disable/re-enable and uninstall |
| DOM/CSS fixture | PASS: 47 assertions in Chrome | Sanitized desktop renderers, Shorts, shelf reuse, active/retained players, inline previews, delayed handlers, disabled controls, stale container state, native panels and video dimensions |
| Installed-extension Firefox tests | NOT RUN | Firefox is not installed and the pinned Puppeteer Firefox 156.0.1 executable is absent; no browser was downloaded |

The Rust packager replaces the Python ZIP/checksum implementation in the normal npm and CI build paths. `build.py` and `build.sh` launch that same tool. Runtime scripts remain JavaScript, CSS and HTML. No Rust binary or build dependency is included in an extension ZIP. Permissions, the single popup action, and the absence of settings are unchanged.

The package parity oracle uses the old builder from published ancestor `03d8f8f`. Browser archive names and uncompressed contents match. The submission keeps the same names and SHA256SUMS format. ZIP metadata is normalized, so compressed bytes and their generated checksums can differ from the Python output. No packaging speed improvement is claimed.

## Lifecycle regressions and test corrections

- Autoplay cleanup targets the active watch player, prefers its inner button, waits for enabled controls, and cancels retries after the player becomes inactive. Hidden retained players and inline previews are left alone. A replacement control has its own cooldown.
- The new behavior tests failed on the preceding content script. The initial 42-assertion DOM fixture had 7 failures before the fix; the final expanded fixture passes all 47 assertions.
- The pre-existing package CI failures on October 29 were upgrade tests that referenced unreachable legacy commit `8ec06f4`. The fixture now pins published ancestor `4ed3e9a`, whose complete Git tree is identical, and checks its ancestry. This corrects the fixture without changing the legacy upgrade behavior.
- A Chrome restart exposed an unhandled peer reset in the local CONNECT proxy. The restart failure reproduced twice. The harness now handles only expected `ECONNRESET`/`EPIPE` disconnects; other socket errors still fail. The focused restart test and full Chrome matrix pass after the correction.

## Synthetic CPU comparison

The same Chrome build ran three samples for each content-script version, alternating order. Each sample contained 800 ordinary cards, 12 shelves and 180 frames of description mutations. Both versions coalesced those mutations into 90 cleanup callbacks. Median callback elapsed time was 0.259 ms before and 0.239 ms after, with median totals of 23.3 ms and 21.5 ms. Median script-attributed CPU samples at a 0.5 ms sampling interval were 4.334 ms before and 2.558 ms after across approximately 3.6-second profiles. Every sample had zero cleanup callbacks during a subsequent 600 ms idle interval.

These short synthetic samples support keeping the hot path near its baseline. They do not establish live YouTube CPU use or a performance benefit from the Rust packaging port.

## Current live smoke checklist

All rows below are dated November 6, 2026 and are NOT RUN against live YouTube. Chrome 156.0.8078.80 and Helium 0.12.5.1 are installed, but no live extension session was provisioned. The host preview can open an isolated incognito tab but exposes no extension-loading capability. Its blank tab was closed. No personal browser profile was used. Signed-in checks are NOT RUN because no disposable account was available.

| Distribution smoke check | November 6 result | Remaining proof |
| --- | --- | --- |
| Home and query-string Home open Subscriptions | NOT RUN live | Local stand-in redirects pass; current YouTube remains to be checked |
| Creator search, ordinary results, expanded/collapsed Shorts shortcuts | NOT RUN live | Sanitized DOM assertions pass; current markup remains to be checked |
| Search-to-watch playback, recommendations and autoplay | NOT RUN live | Synthetic player lifecycle passes; real playback remains to be checked |
| Captions, theater/fullscreen, comments, playlist and live chat | NOT RUN live | Fixtures preserve panels and dimensions; native controls/media remain to be checked |
| Direct and internal Shorts navigation | NOT RUN live | Installed-extension stand-in checks pass; live navigation remains to be checked |
| Popup single link and no settings | NOT RUN live | Package contract and installed Chrome popup checks pass |
| Signed-out Subscriptions, public search and playback | NOT RUN | No live signed-out session was opened |
| Disable and reload to restore ordinary YouTube | NOT RUN live | Installed-extension local stand-in checks pass |

The screenshots below retain their October 2 provenance. No new live screenshots were captured for 0.3.1. Current live smoke checks, the Firefox matrix, and fresh search/watch screenshots remain release prerequisites. No store upload, release or tag was performed.

---

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
