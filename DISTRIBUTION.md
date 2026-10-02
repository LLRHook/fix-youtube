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
npm test
python build.py
npx --yes web-ext@10.7.0 lint --source-dir dist-firefox --warnings-as-errors --output text
```

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

See `docs/VERIFICATION.md` for actual results and remaining checks. A successful build or lint result is not equivalent to running an installed extension in both browsers.

## Submission checklist

- [x] Matching 0.3.0 versions and product descriptions.
- [x] Desktop YouTube host scope and one API permission.
- [x] Firefox data-collection declaration set to `none`.
- [x] Runtime files and manifests at each ZIP root.
- [x] Store icon and 440 x 280 promotional graphic.
- [x] 1280 x 800 product screenshots.
- [x] Listing copy, permission justifications, privacy text, and release notes.
- [ ] Complete the remaining browser checks identified in the verification notes.
- [ ] Confirm the store accepts the public [privacy statement](https://github.com/LLRHook/fix-youtube/blob/main/PRIVACY.md), or host a dedicated policy page if required.
- [ ] Confirm publisher account, public support links, category, and desktop platforms.
- [ ] Upload, review the store forms, and submit through the publisher account.

## Sources checked October 2, 2026

- Chrome store assets: https://developer.chrome.com/docs/webstore/images
- Firefox data consent: https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/
- Firefox manifest metadata: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings
- Mozilla validator: https://extensionworkshop.com/documentation/develop/web-ext-command-reference/

Chrome requires an extension icon, a 440 x 280 promotional image, and at least one screenshot. The supplied screenshots use the documented preferred 1280 x 800 size. Firefox's no-data declaration is included, with a minimum version of 142 to satisfy the validator's cross-platform schema checks; the listing should target desktop use.
