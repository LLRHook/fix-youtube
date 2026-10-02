# Distribution

Version 0.3.0 is a fixed desktop YouTube extension. Store publication is a separate action from generating these files.

## Deliverables

Run `python build.py` from the project root.

| File | Purpose |
| --- | --- |
| `fix-youtube-chrome.zip` | Upload to Chrome Web Store |
| `fix-youtube-firefox.zip` | Upload to Firefox Add-ons |
| `fix-youtube-submission-0.3.0.zip` | Handoff bundle with both packages, listing copy, policy, screenshots, and checksums |
| `dist-chrome/` | Load unpacked in Chrome or Helium |
| `dist-firefox/` | Load temporarily in Firefox |

Do not upload the handoff bundle as an extension. Upload the browser-specific ZIP.

## Preflight

```sh
npm ci
npm test
python build.py
npx --yes web-ext@10.7.0 lint --source-dir dist-firefox --warnings-as-errors --output text
npm run test:e2e
```

CI runs the same steps on every push and pull request.

The Mozilla validator is an optional development tool, not a product dependency. Version 10.7.0 was checked against npm and Mozilla's command reference on October 2, 2026.

Only the runtime scripts, styles, popup, rules, icons, manifest, and license are included in each browser ZIP. Source maps, tests, screenshots, developer profiles, and credentials are excluded.

## Browser smoke checks

Use the final built directory, then reload existing YouTube tabs.

1. Open Home, including `https://www.youtube.com/?app=desktop`. It must open Subscriptions.
2. Search for a creator. Ordinary videos should remain; Shorts should be hidden.
   Check the Shorts shortcut is also hidden in both expanded and collapsed sidebars.
3. Open a video from search. Recommendations and autoplay should be off; playback should work.
4. Check captions, theater mode, fullscreen, comments, a playlist queue, and live chat.
5. Open a direct Shorts link and follow one through YouTube's internal navigation. Both should use the standard player.
6. Open the popup and use its single link. There should be no feature settings.
7. Check a signed-out session: Subscriptions should show YouTube's sign-in state, while public search and playback remain usable.
8. Disable the extension and reload the page to restore ordinary YouTube.

See `docs/VERIFICATION.md` for actual results and remaining checks. The installed-extension tests use a stand-in for YouTube, so they do not replace these checks against live YouTube.

## Releasing

1. Set the same new version in `manifest.json`, `manifest.firefox.json`, `package.json`, `PRIVACY.md` and `docs/store/LISTING.md`. Replace the listing's **Release notes** section.
2. Merge to `main` with CI green, and complete the browser smoke checks on the built packages.
3. Tag the merge commit `vX.Y.Z` and push the tag. CI reruns every check, then publishes a GitHub release. The release contains `fix-youtube-chrome-X.Y.Z.zip`, `fix-youtube-firefox-X.Y.Z.zip`, `SHA256SUMS.txt`, and the listing's release notes. The job fails if the tag and manifest version differ.
4. Upload those exact ZIPs to the Chrome Web Store and Firefox Add-ons.

## Corrective updates

If a YouTube layout change brings back a hidden element or hides too much:

1. Reproduce it on live YouTube. Copy the affected element's shape into `tests/browser.html`, and confirm the new check fails.
2. Fix the selector in `styles.css` or `content.js`, scoped to the affected renderer. Prefer language-neutral hooks (URLs, icons, element names) over visible text.
3. Bump the patch version, and run the preflight and the affected smoke checks.
4. Release as above. Store review typically delays Chrome updates. Point users to GitHub issues while review is pending.

## Supported browsers

The tested versions are Chromium 154 (Chrome, Helium) and Firefox 156. The declared minimums are Chromium 105 and Firefox 142; versions between those minimums and the tested ones are untested. Search and Subscriptions shelf removal matches English shelf titles. Every other behavior is language-independent.

## Submission checklist

- [x] Matching 0.3.0 versions and product descriptions.
- [x] Desktop YouTube host scope and one API permission.
- [x] Firefox data-collection declaration set to `none`.
- [x] Runtime files and manifests at each ZIP root.
- [x] Store icon and 440 x 280 promotional graphic.
- [x] 1280 x 800 product screenshots.
- [x] Listing copy, permission justifications, privacy text, and release notes.
- [x] Installed-extension tests and live smoke checks in Chromium and Firefox (see verification notes).
- [x] Public project, issues and [privacy statement](https://github.com/LLRHook/fix-youtube/blob/main/PRIVACY.md) links respond.
- [ ] Confirm the store accepts the GitHub-hosted privacy statement, or host a dedicated policy page if required.
- [ ] Confirm publisher account, public support links, category, and desktop platforms.
- [ ] Upload, review the store forms, and submit through the publisher account.

## Sources checked October 2, 2026

- Chrome store assets: https://developer.chrome.com/docs/webstore/images
- Firefox data consent: https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
- Firefox manifest metadata: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings
- Mozilla validator: https://extensionworkshop.com/documentation/develop/web-ext-command-reference/

Chrome requires an extension icon, a 440 x 280 promotional image, and at least one screenshot. The supplied screenshots use the documented preferred 1280 x 800 size. Firefox's no-data declaration is included, with a minimum version of 142 to satisfy the validator's cross-platform schema checks; the listing should target desktop use.
