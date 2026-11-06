# Developing Fix YouTube

The runtime is plain JavaScript, CSS, and HTML with no dependencies. Rust 1.88+ builds the packages. Node 22.12+ runs the extension tests, and Python 3.9+ supplies the independent package oracle and compatibility launcher. Puppeteer is the only npm development dependency; the Rust build dependencies are locked in `tools/packager/Cargo.lock`. `npm ci` installs it with its pinned Chrome for Testing and Firefox builds, configured in `.puppeteerrc.cjs`.

## Tests and builds

Run these commands from the repository root:

```sh
npm ci
npm test
npm run test:packager
npm run build
npm run test:e2e
```

The packaging core is Rust in `tools/packager/`. It runs through `npm run build` and the CI build step. Rust 1.88 or newer is required; CI pins 1.93.1. Cargo uses the committed lockfile. To build one browser, use `npm run build -- chrome` or `npm run build -- firefox`. The existing `python build.py [chrome|firefox|all]` command is a thin launcher for the same Rust implementation. `build.sh` remains a compatibility wrapper for systems with Bash and `python3`.

`npm run test:packager` runs Rust unit tests and 13 Python integration checks. They compare archive names and uncompressed file bytes with the frozen Python builder at published commit `03d8f8f`, and independently validate every SHA256SUMS line with Python's `hashlib`. They also cover browser selection, reproducible archives, missing inputs, malformed or mismatched versions, output types, and symlink refusal. ZIP timestamps and permissions are normalized, so compressed bytes can differ from the old builder even when payloads match. No packaging speed improvement is claimed.

The browser runtime remains plain JavaScript, CSS and HTML. Python remains only for compatibility entry points and the independent packaging oracle; no Rust binary or build dependency is shipped in an extension ZIP.

The build creates `dist-chrome/`, `dist-firefox/`, and a ZIP for each browser. Building both also creates a versioned submission ZIP with the store assets, documentation, and checksums. Each browser ZIP has its manifest at the root. Generated folders and ZIPs are ignored by Git.

GitHub Actions runs the Node tests, builds both packages, validates the Firefox package, and runs the installed-extension tests in Chrome and Firefox. It then uploads the browser ZIPs and submission bundle as one workflow artifact. A `v*` tag also publishes a GitHub release; see [distribution](../DISTRIBUTION.md#releasing).

## Installed-extension tests

`npm run test:e2e` loads `dist-chrome` and `dist-firefox` into real browsers, so build first. The tests reach a local HTTPS stand-in for YouTube through a proxy, which logs every request. This shows whether a redirect came from the browser's network rules or the content script. They require `openssl` on `PATH` to create a throwaway certificate. Set `E2E_BROWSERS=chrome` or `E2E_BROWSERS=firefox` to run one browser.

The tests also run the `tests/browser.html` DOM/CSS fixture in each browser. You can open that file directly for debugging. Its fixtures cover Shorts buttons without URLs, localized sidebar entries, ordinary videos with Shorts links in their descriptions, shelves reused across search/channel/Subscriptions views, delayed autoplay click handlers, retained hidden watch players, inline previews, replacement controls, disabled controls, container-only controls, stale container state, player dimensions, and preservation of native panels. Results are rendered after the checks so test output cannot trigger the mutation observer and mask a missing cleanup.

The upgrade test builds the 0.2.0 release from the published commit pinned in `tests/fixtures/legacy-release.json`. The Node tests check that this commit is an ancestor of the current checkout, so both test layers need a full clone. An unreachable object left in a local repository is not a valid upgrade fixture.

These tests supplement live YouTube testing. Before a release, load the built extension and follow the [browser smoke checks](../DISTRIBUTION.md#browser-smoke-checks). Record observed results and limitations in [VERIFICATION.md](VERIFICATION.md).

## File layout

| Path | Responsibility |
| --- | --- |
| `manifest.json`, `manifest.firefox.json` | Browser metadata, permissions, and content injection |
| `rules.json` | Full-page Home and Shorts redirects |
| `content.js` | Client-side navigation, logo links, recommendation shelf titles, and autoplay |
| `styles.css` | Hide distractions and retain space for native playback and discussion controls |
| `background.js` | Remove legacy configurable redirect rules during installation or update |
| `popup.html`, `icons/` | Fixed popup and extension artwork |
| `tests/` | Node behavior/package checks and the browser regression fixture |
| `tests/e2e/` | Installed-extension tests and their fake-YouTube harness |
| `tools/packager/` | Rust allowlisted ZIP generation, integrity checks, and submission checksums |
| `build.py`, `build.sh` | Compatibility launchers for the Rust packager |
| `docs/store/` | Listing copy, screenshots, promotional artwork, and screenshot source |

## Making changes

Keep the experience fixed. New settings, analytics, external services, and runtime dependencies would change the product's scope.

For a YouTube layout regression, inspect the affected live element and reproduce its shape in the browser fixture. Scope selectors to the relevant renderer so comments, channel content, and ordinary videos remain available. Test expanded and collapsed navigation as well as navigation without a full page reload.

Keep the version and description consistent across both manifests, `package.json`, and the store listing. Build after changing runtime files or submission documents, and reload the unpacked extension before refreshing open YouTube tabs.
