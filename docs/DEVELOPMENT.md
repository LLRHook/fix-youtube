# Developing Fix YouTube

The runtime is plain JavaScript, CSS, and HTML. Node 20+ runs the tests; Python 3.9+ builds the packages using its standard library. There are no project dependencies to install.

## Tests and builds

Run these commands from the repository root:

```sh
npm test
python build.py
```

To build one browser, use `python build.py chrome` or `python build.py firefox`. `build.sh` is a compatibility wrapper for systems with Bash and `python3`.

The build creates `dist-chrome/`, `dist-firefox/`, and a ZIP for each browser. Building both also creates a versioned submission ZIP with the store assets, documentation, and checksums. Each browser ZIP has its manifest at the root. Generated folders and ZIPs are ignored by Git.

GitHub Actions runs the Node tests, builds both packages, and uploads the browser ZIPs and submission bundle as one workflow artifact. Store upload remains a separate step; see [distribution](../DISTRIBUTION.md).

## Browser regression checks

Open `tests/browser.html` directly in a desktop browser, or serve the project locally:

```sh
python -m http.server 8766 --bind 127.0.0.1
```

Then open `http://localhost:8766/tests/browser.html`. Every listed check should pass. These fixtures exercise real DOM and CSS, including Shorts buttons without URLs, reused renderers, player dimensions, and preservation of native panels.

The fixtures supplement live YouTube testing. Load the built extension and follow the [browser smoke checks](../DISTRIBUTION.md#browser-smoke-checks) before a release. Record observed results and limitations in [VERIFICATION.md](VERIFICATION.md).

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
| `build.py`, `build.sh` | Allowlisted packaging and submission bundle generation |
| `docs/store/` | Listing copy, screenshots, promotional artwork, and screenshot source |

## Making changes

Keep the experience fixed. New settings, analytics, external services, and runtime dependencies would change the product's scope.

For a YouTube layout regression, inspect the affected live element and reproduce its shape in the browser fixture. Scope selectors to the relevant renderer so comments, channel content, and ordinary videos remain available. Test expanded and collapsed navigation as well as navigation without a full page reload.

Keep the version and description consistent across both manifests, `package.json`, and the store listing. Build after changing runtime files or submission documents, and reload the unpacked extension before refreshing open YouTube tabs.
