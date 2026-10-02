# Fix YouTube: hide Shorts and recommendations

Fix YouTube is a free, open-source browser extension that hides YouTube Shorts and recommendations, disables autoplay, and opens your Subscriptions feed by default. It has one fixed setup and nothing to configure.

Built for desktop Chrome and Helium, with a Firefox package available for testing. Version 0.3.0 is available for local installation; store publication is pending.

[Install](#install-locally) · [Privacy](PRIVACY.md) · [Report a problem](https://github.com/LLRHook/fix-youtube/issues) · [Development](docs/DEVELOPMENT.md)

![Fix YouTube extension overview with its single Open YouTube action](docs/store/01-overview.png)

## What it does

- Opens Subscriptions when you visit Home or click the YouTube logo.
- Hides Shorts in navigation, feeds, search results, and channel tabs. Direct Shorts links open in the normal player.
- Removes watch-page recommendations and end-screen suggestions.
- Switches autoplay off and hides its toggle.
- Removes selected recommendation shelves and Mixes from search.

Search, comments, channel pages, playlist queues, and live chat remain available. The player uses the space left by the recommendations. YouTube's own theme, captions, speed, and theater/fullscreen controls remain yours.

The popup has one action: **Open YouTube**. Disable or remove the extension through your browser to return to ordinary YouTube.

Subscriptions require a YouTube sign-in. You can still search and watch public videos while signed out. This extension targets desktop YouTube, not YouTube Music, mobile YouTube, or embedded players.

## Install locally

Download and extract the [source ZIP](https://github.com/LLRHook/fix-youtube/archive/refs/heads/main.zip), or clone this repository. Building requires Python 3.9 or later and no extra Python packages. Run the build command from the extracted project folder.

### Chrome or Helium

1. Run `python build.py chrome`, or use the already-built `dist-chrome` folder.
2. Open `chrome://extensions` and turn on Developer mode.
3. Choose **Load unpacked** and select `dist-chrome`.
4. Reload any YouTube tabs that were already open.

Requires Chromium 105 or later. The unpacked folder must stay in place.

### Firefox

1. Run `python build.py firefox`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on** and select `dist-firefox/manifest.json`.
4. Reload open YouTube tabs.

Requires Firefox 142 or later. Temporary add-ons are removed when Firefox closes. Permanent installation requires Mozilla signing.

## Common questions

### Does it remove all access to Shorts?

It hides Shorts buttons, shelves, search results, and channel tabs. If you open a direct Shorts link, the video opens in YouTube's regular player. The scrolling Shorts interface is removed; the underlying video remains accessible.

### Can I choose which features to enable?

No. Every installation uses the same cleanup rules. YouTube's own playback controls and theme are still available.

### Is this a YouTube ad blocker?

No. Fix YouTube removes discovery distractions and changes navigation. It does not block ads.

### What if Shorts reappear after a YouTube update?

Refresh the page after updating or reloading the extension. If the problem remains, [open an issue](https://github.com/LLRHook/fix-youtube/issues) with your browser version, extension version, and the affected page type. Crop account details out of any screenshot you share.

## Privacy

Fix YouTube does not record watch history, store preferences, run analytics, or send data to a service. Its code runs locally on desktop YouTube. See [the privacy statement](PRIVACY.md).

Version 0.3.0 ignores preferences from earlier versions and removes their dynamic redirect rules on update. Old browser-managed extension storage may remain until the extension is uninstalled; this version does not access it.

## Development and release status

The extension uses plain JavaScript and CSS, with no runtime or npm project dependencies. See the [development guide](docs/DEVELOPMENT.md) for tests, packaging, and the file layout, and the [distribution checklist](DISTRIBUTION.md) for store submission.

Installed Helium checks cover redirects, Shorts removal, navigation, and the popup. Full playback verification is incomplete: new videos also buffered with the extension disabled. Firefox package validation passed; native Firefox testing is still pending. The [verification record](docs/VERIFICATION.md) lists the evidence and remaining checks.

[MIT license](LICENSE). Fix YouTube is an independent extension and is not affiliated with YouTube or Google.
