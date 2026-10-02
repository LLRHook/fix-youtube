# Fix YouTube privacy statement

Version 0.3.0. Updated October 2, 2026.

Fix YouTube runs locally in your browser on desktop youtube.com pages. It examines the current page's navigation links, shelf labels, and autoplay control to redirect Home and Shorts and hide distracting elements.

The extension does not collect, record, sell, or transmit personal information. It does not save viewing history, account details, searches, settings, or analytics. It does not use cookies, a remote server, remote scripts, or the browser storage API.

The extension's link and redirect rules navigate to YouTube. YouTube continues to process your use of its website under its own policies. Signing in to YouTube is handled by YouTube; this extension does not receive your credentials.

## Permissions

Access to youtube.com lets the extension apply its styles and content script. The declarativeNetRequest permission lets the browser redirect Home to Subscriptions and Shorts to the standard video player. Access does not include other websites, YouTube Music, or mobile YouTube.

## Earlier versions

Releases before 0.3.0 could keep settings and watch-history data in browser-managed extension storage. Version 0.3.0 does not read or write that data. Uninstalling the extension removes its local extension storage; browser sync may retain earlier synced preferences according to the browser's own policies.

## Contact

For questions about this extension, open an issue at https://github.com/LLRHook/fix-youtube/issues.
