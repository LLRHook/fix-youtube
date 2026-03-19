# Fix YouTube

A Chrome extension that takes back control of your YouTube experience. No Shorts. No algorithmic homepage. No distractions. Just the content you subscribed to.

## Features

- **Remove Shorts** — Hides Shorts shelves, sidebar links, search results, channel tabs, and notifications everywhere on YouTube. Redirects `/shorts/` URLs to the normal video player.
- **Redirect Home to Subscriptions** — The YouTube logo and all home navigation points to `/feed/subscriptions` instead. The homepage is dead to you.
- **Hide Suggested Videos** — Removes the related/recommended videos sidebar on watch pages and endscreen suggestions. The player expands to fill the space.
- **Disable Autoplay** — Turns off auto-play next and hides the toggle so YouTube can't re-enable it
- **Hide Trending / Explore** — Removes trending and explore from sidebar navigation
- **Channel Blocklist** — Permanently hide videos from specific channels everywhere. Add channels by handle (`@channelname`) from the popup. Blocks apply across all tabs instantly.
- **Subscriptions Only** — Filters recommendations, search results, and "Up next" to only show videos from channels you're subscribed to. Builds your subscription list from the sidebar guide and `/feed/channels`, caches it hourly.
- **Custom YouTube Theming** — Personalize YouTube's appearance:
  - Accent color: 8 preset colors (red, orange, yellow, green, blue, purple, pink, white) or YouTube default
  - Font size: S / M / L / XL (85% to 130% scaling)
  - Theme mode: force Dark, Light, or leave on Auto
- **Thumbnail Declutter** — Hides overlay badges (NEW, LIVE, 4K), watch progress bars, and view count overlays on thumbnails. Normalizes ALL CAPS clickbait titles to sentence case when >60% of letters are uppercase.
- **Hide Algorithmic Sections** — Removes "People also watched", "For you", "Recommended", "Breaking news", auto-generated Mixes, community posts, promoted shelves, and "Channels new to you" carousels. Matches section titles via JS and hides structural elements via CSS.
- **Hide Comments** — Toggle to completely hide the comments section on watch pages.
- **Disable Ambient Mode** — Turns off YouTube's ambient glow effect behind the video player.
- **Cinema Mode Default** — Automatically activates theater/cinema mode on every video.
- **Hide Notification Badge** — Removes the red notification count from the bell icon.
- **Auto Scroll to Player** — Automatically scrolls the video player to the top of the page on every navigation.
- **Pause on Tab Switch** — Pauses the video when you switch to another tab, resumes when you return.
- **Confirm Before Closing** — Browser warning before closing a tab with a playing video.
- **Playback Speed Default** — Force a default playback speed (1x / 1.25x / 1.5x / 1.75x / 2x) on all videos. Applied once per video so manual changes aren't overridden.
- **Grid Layout Control** — Set videos per row (2-6) or leave on Auto
- **Daily Usage Timer** — Separate weekday and weekend limits (30m / 1h / 1.5h / 2h) with:
  - Live countdown clock overlay on the page
  - Color-coded warnings (orange at 25%, red pulsing at 0%)
  - Full-screen blocker when time runs out — pauses video and locks the page
  - Per-day schedules: different limits for weekdays vs. weekends (default 1h / 2h)
  - Resets at midnight automatically
- **Focus Mode** — One-click toggle (`Alt+D`) that enables all distraction blockers at once: Shorts, sidebar, autoplay, trending, algorithmic sections, declutter, and subscriptions-only. Snapshots your settings on activate, restores them on deactivate.
- **Keyboard Shortcuts** — Quick toggles without opening the popup:
  - `Alt+D` — Toggle Focus Mode
  - `Alt+S` — Toggle suggested videos sidebar
  - `Alt+F` — Toggle subscriptions-only filter
  - `Alt+T` — Toggle daily usage timer
  - Customizable via `chrome://extensions/shortcuts`
- **Break Reminders** — Gentle nudge after continuous watching (15m / 25m / 45m / 1h). Pauses video, shows a dismissable overlay. Resets when you leave the tab for 30+ seconds or dismiss the reminder.
- **Watch History Dashboard** — Tracks every video you watch (title, channel, duration). Opens in a full tab with:
  - Today / this week total watch time
  - Top channels by watch time
  - Recent 50 videos with duration and timestamp
  - Auto-prunes entries older than 30 days
  - Clear all history button
- **Export/Import Settings** — Download your configuration as a JSON file, share it, or restore it on another machine. Import validates keys so unknown data is safely ignored.
- **Popup Settings Panel** — Dark-themed control panel with toggles for every feature. Changes apply instantly, no reload needed.

## Install

### Chrome
1. Clone or download this repo
2. Open `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select this folder
5. Click the extension icon to configure features

### Firefox
1. Clone or download this repo
2. Run `./build.sh firefox` (or manually copy `manifest.firefox.json` to `manifest.json`)
3. Open `about:debugging#/runtime/this-firefox`
4. Click **Load Temporary Add-on** and select `manifest.json` from the `dist-firefox/` folder
5. Click the extension icon to configure features

### Build Script
```bash
./build.sh chrome   # → dist-chrome/
./build.sh firefox  # → dist-firefox/
```

## How It Works

All features use a **CSS class toggle pattern**: the content script sets classes like `.fix-yt-hide-shorts` on the `<html>` element, and CSS rules activate based on those classes. This means features toggle instantly without page reloads.

The subscription redirect works on two layers:
- `declarativeNetRequest` intercepts `youtube.com/` at the network level before the page loads
- Content script catches SPA navigations via YouTube's `yt-navigate-finish` event

The daily timer only counts seconds while the YouTube tab is visible (`document.visibilityState`), saves progress to `chrome.storage.local` every 5 seconds, and persists across tabs and sessions.

## Roadmap

Features under consideration for future releases:

- [x] **Custom YouTube Theming** — Dark/light mode overrides, custom accent colors, font sizes, and overall page styling to make YouTube look the way you want
- [x] **Watch History Dashboard** — Track what you've watched, how long, and surface patterns in your viewing habits
- [x] **Channel Allowlist/Blocklist** — Only show videos from specific channels, or hide channels you never want to see
- [x] **Keyboard Shortcuts** — Quick toggles for features without opening the popup
- [x] **Per-Day Timer Schedules** — Different time limits for weekdays vs. weekends
- [x] **Break Reminders** — Gentle nudge after X minutes of continuous watching before the hard lockout
- [x] **Firefox Support** — Port to Firefox with WebExtension compatibility
- [x] **Hide "People Also Watched" / Algorithmic Sections** — Remove any remaining algorithmic content sections from feeds
- [x] **Thumbnail Declutter** — Hide clickbait indicators like excessive capitalization or view count badges
- [x] **Export/Import Settings** — Share your configuration across devices or with friends

### Next Up

- [x] **Focus Mode** — One-click toggle that enables all distraction blockers at once for deep focus sessions
- [x] **Playback Speed Default** — Force a default playback speed (1x–2x) on all videos
- [x] **Hide Comments** — Toggle to hide the comments section entirely
- [x] **Disable Ambient Mode** — Turn off YouTube's ambient glow effect behind the player
- [x] **Cinema Mode Default** — Always open videos in theater/cinema mode

### v3

- [x] **Redirect Shorts to Watch** — Rewrite /shorts/ URLs to play as normal videos in the standard player
- [x] **Hide Notification Badge** — Remove the red notification count from the bell icon
- [x] **Auto Scroll to Player** — On watch pages, auto-scroll so the video player is flush with the top
- [x] **Pause on Tab Switch** — Auto-pause video when switching to another tab, resume when returning
- [x] **Confirm Before Closing** — Warn before closing a tab with a playing video

## Tech Stack

- Manifest V3 Chrome Extension
- Vanilla JS + CSS (zero dependencies)
- `chrome.storage.sync` for settings
- `chrome.storage.local` for daily timer state
- `declarativeNetRequest` for network-level redirects

## License

MIT
