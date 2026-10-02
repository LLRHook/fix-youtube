# Developing Fix YouTube

The runtime is plain JavaScript, CSS, and HTML with no dependencies. Python 3.9+ builds the packages using its standard library. Node 22.12+ runs the tests. The only development dependency is Puppeteer. `npm ci` installs it with its pinned Chrome for Testing and Firefox builds, configured in `.puppeteerrc.cjs`.

## Tests and builds

Run these commands from the repository root:

```sh
npm ci
npm test
python build.py
npm run test:e2e
```

To build one browser, use `python build.py chrome` or `python build.py firefox`. `build.sh` is a compatibility wrapper for systems with Bash and `python3`.

The build creates `dist-chrome/`, `dist-firefox/`, and a ZIP for each browser. Building both also creates a versioned submission ZIP with the store assets, documentation, and checksums. Each browser ZIP has its manifest at the root. Generated folders and ZIPs are ignored by Git.

GitHub Actions runs the Node tests, builds both packages, validates the Firefox package, and runs the installed-extension tests in Chrome and Firefox. It then uploads the browser ZIPs and submission bundle as one workflow artifact. A `v*` tag also publishes a GitHub release; see [distribution](../DISTRIBUTION.md#releasing).

## Installed-extension tests

`npm run test:e2e` loads `dist-chrome` and `dist-firefox` into real browsers, so build first. The tests reach a local HTTPS stand-in for YouTube through a proxy, which logs every request. This shows whether a redirect came from the browser's network rules or the content script. They require `openssl` on `PATH` to create a throwaway certificate. Set `E2E_BROWSERS=chrome` or `E2E_BROWSERS=firefox` to run one browser.

The tests also run the `tests/browser.html` DOM/CSS fixture in each browser. You can open that file directly for debugging. Its fixtures cover Shorts buttons without URLs, localized sidebar entries, reused renderers, player dimensions, and preservation of native panels.

The upgrade test builds the 0.2.0 release from Git history, so it needs a full clone.

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
| `build.py`, `build.sh` | Allowlisted packaging and submission bundle generation |
| `docs/store/` | Listing copy, screenshots, promotional artwork, and screenshot source |

## Making changes

Keep the experience fixed. New settings, analytics, external services, and runtime dependencies would change the product's scope.

For a YouTube layout regression, inspect the affected live element and reproduce its shape in the browser fixture. Scope selectors to the relevant renderer so comments, channel content, and ordinary videos remain available. Test expanded and collapsed navigation as well as navigation without a full page reload.

Keep the version and description consistent across both manifests, `package.json`, and the store listing. Build after changing runtime files or submission documents, and reload the unpacked extension before refreshing open YouTube tabs.
