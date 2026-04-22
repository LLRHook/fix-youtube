# Distribution

Fix YouTube ships as Manifest V3 browser-extension packages for Chrome and Firefox.

## Preflight

```bash
python -m json.tool manifest.json >/dev/null
python -m json.tool manifest.firefox.json >/dev/null
bash ./build.sh chrome
bash ./build.sh firefox
(cd dist-chrome && zip -qr ../fix-youtube-chrome.zip .)
(cd dist-firefox && zip -qr ../fix-youtube-firefox.zip .)
```

Load `dist-chrome/` in `chrome://extensions` and `dist-firefox/` from `about:debugging#/runtime/this-firefox`, then verify:

- Shorts redirects and hiding rules
- subscription/home redirect behavior
- popup setting persistence
- import/export settings
- timer, focus mode, and watch-history flows

## Store Checklist

- Confirm `name`, `description`, `version`, permissions, and icons in both manifests.
- Zip the contents of each `dist-*` folder, not the repository root.
- Include screenshots for popup settings, focus mode, timer lockout, and watch-history dashboard.
- Describe that settings and watch history are stored locally in browser storage.
- Do not include `.pem`, `.crx`, local browser profiles, or generated `dist-*` directories in git.
