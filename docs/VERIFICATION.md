# Verification: Fix YouTube 0.3.0

Checked October 2, 2026. Worktree: `completion/20261002-working-release`.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Node behavior/package tests | PASS | `npm test`: 17 tests, zero failures |
| Browser DOM/CSS regression fixture | PASS | `tests/browser.html`: 23 checks, all passed in the user's Helium browser |
| Chrome and Firefox builds | PASS | Browser ZIPs built by `python build.py`; integrity checks passed |
| Mozilla package validation | PASS | `web-ext@10.7.0 lint --source-dir dist-firefox --warnings-as-errors --output text`: zero errors, warnings, or notices |
| Live Home redirect | PASS | Executing the actual content script on YouTube Home navigated to `/feed/subscriptions` |
| Live search | PASS | Public NASA search retained normal results; visible Shorts links dropped to zero |
| Live search-to-watch SPA navigation | PASS | Playback worked, autoplay read `false`, recommendations and their empty column were hidden |
| Video layout | PASS | Video and player bounds both measured 1100 x 618.75 after the layout correction |
| Signed-out Subscriptions | PASS | YouTube's sign-in state remained available |
| Installed Chromium network redirect | PASS | Isolated agent-browser session launched with `dist-chrome`; opening `https://www.youtube.com/` reached `/feed/subscriptions` |
| Installed extension in the user's Helium session | PASS | User loaded Downloads/Fix YouTube; version 0.3.0 enabled, zero extension runtime errors, static redirect_rules enabled, no legacy dynamic rules |
| Current desktop Shorts components | PASS | Fixed ytm-shorts-lockup-view-model and grid-shelf-view-model; signed-in NASA search retained five ordinary videos and zero visible Shorts links |
| Shorts sidebar shortcut without a URL | PASS | Reproduced the user's visible expanded sidebar button: its anchor has title Shorts and no href. Added title-based navigation selectors; the regression failed before the fix and passed afterward. Reloaded the installed extension and Subscriptions page in Helium: expanded and collapsed Shorts entries both display none, while Subscriptions remains visible. |
| Installed direct Shorts redirect | PASS | /shorts/MT-ErptvDmg opened /watch?v=MT-ErptvDmg, without the scrolling Shorts interface |
| Installed popup | PASS | One Open YouTube link, zero settings controls; the link opened Subscriptions in a new tab |
| Helium media playback | BLOCKED | New videos remained buffering at 0:00, readyState 0, with no buffered ranges; the same failure occurred after disabling Fix YouTube and reloading. No bot-wall text appeared. The extension was re-enabled afterward. |
| Installed Firefox runtime | NOT RUN | Package validation completed; no Firefox runtime session available |
| Store submission | NOT PERFORMED | Packages and listing assets prepared locally |

## Test scope

The Node suite covers route boundaries, direct and SPA redirects, observer coalescing, autoplay retries, reused shelves, embed/frame exclusions, legacy-rule cleanup, and manifest/package contracts.

The browser fixture exercises real DOM and CSS for normal search results, Shorts, recommendations, video dimensions, autoplay re-enablement, logo rewriting, reused shelves, channel content, comments, playlist queues, live chat, and open transcript panels. It is synthetic regression coverage, not a representation of a signed-in account.

The initial live-page checks used the actual content script and stylesheet through T3's browser evaluation tools. That proves their behavior on the observed live DOM, but does not prove native extension injection, worker lifecycle, or browser permission behavior. A separate installed Chromium session confirmed the network homepage redirect. Further live testing used agent-browser attached to the user's existing Helium instance over its already-enabled debugging port. The user installed the unpacked extension. The final stylesheet was copied into that installation and reloaded after the modern Shorts regression was found. Home with a query string redirected to Subscriptions; search-to-watch navigation retained the cleanup; autoplay read false; recommendations were hidden; video/player bounds matched; comments remained available. uBlock Origin was already enabled in that browser and was not changed.

No credentials were entered by the agent. The user handled Google sign-in. No likes, subscriptions, comments, or other account writes were submitted.

## Screenshot provenance

- `docs/store/01-overview.png`: 1280 x 800 browser capture of `docs/store/overview.html`, embedding the actual popup without changing its controls.
- `docs/store/02-search.png`: 1280 x 800 capture of live public YouTube search with the actual cleanup code applied.
- `docs/store/03-watch.png`: 1280 x 800 capture of live public YouTube playback with the actual cleanup code applied.
- `docs/images/popup-overview.png`: 360 x 526 crop of the actual popup render.
- `docs/store/promo-440x280.png`: original geometric brand artwork; not a screenshot.

The search and watch screenshots were captured signed out. They contain public NASA video material, not the user's account feed. They demonstrate the visible product effect and should not be described as native Firefox screenshots.

## Remaining release checks

Resolve the Helium media-buffering issue and recheck video playback, theater/fullscreen, and captions. The same buffering occurred with Fix YouTube disabled, so this run does not establish its cause. Load the final package in desktop Firefox and verify redirects, permissions, popup, search-to-watch navigation, autoplay, theater/fullscreen, and native panels. Signed-in playlist/live-chat coverage is currently represented by fixtures rather than a live account flow. Store acceptance and hosted public privacy/support links are not established by local validation.
