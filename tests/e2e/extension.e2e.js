// Installed-extension smoke tests for the built packages. Run `python build.py` first.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const h = require("./harness");

const BROWSERS = (process.env.E2E_BROWSERS || "chrome,firefox").split(",");
const SUBSCRIPTIONS = "https://www.youtube.com/feed/subscriptions";
const WATCH = "https://www.youtube.com/watch?v=Ab_c-D12345";
const SHARED_SHORT = "https://www.youtube.com/shorts/Ab_c-D12345?feature=share";
const CLEAN = { logo: "/feed/subscriptions", ordinary: true, short: false, navShorts: false, related: false, autoplay: "false" };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function session(t, browser) {
  const site = await h.startYouTube();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "fix-yt-profile-"));
  const extension = fs.mkdtempSync(path.join(os.tmpdir(), "fix-yt-extension-"));
  const s = { site, profile, extension, browser: await h.launch(browser, site.port, profile) };
  t.after(async () => {
    await s.browser.close();
    site.close();
    for (const dir of [profile, extension]) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
  });
  return s;
}

for (const name of BROWSERS) {
  test(name + ": installed extension", async t => {
    const { site, browser } = await session(t, name);
    const id = await browser.installExtension(path.join(h.root, "dist-" + name));
    const page = await browser.newPage();

    await t.test("DOM/CSS regression fixture passes", async () => {
      await page.goto(pathToFileURL(path.join(h.root, "tests/browser.html")).href);
      await page.waitForFunction(() => window.testResults, { timeout: 10000 });
      const results = await page.evaluate(() => window.testResults);
      assert.ok(results.length > 0);
      assert.deepEqual(results.filter(result => !result.pass).map(result => result.name), []);
    });

    await t.test("Home opens Subscriptions before YouTube is requested", async () => {
      for (const url of ["https://www.youtube.com/", "https://www.youtube.com/?app=desktop", "https://youtube.com/"]) {
        assert.deepEqual(await h.visit(site, page, url), [SUBSCRIPTIONS], url);
      }
    });

    await t.test("Shorts links open the standard player with the complete video ID", async () => {
      for (const url of [
        "https://www.youtube.com/shorts/Ab_c-D12345",
        "https://www.youtube.com/shorts/Ab_c-D12345?feature=share",
        "https://youtube.com/shorts/Ab_c-D12345/?si=example",
        "https://www.youtube.com/shorts/Ab_c-D12345#details",
      ]) {
        assert.deepEqual(await h.visit(site, page, url), [WATCH], url);
      }
    });

    await t.test("styles and content script are injected", async () => {
      await page.goto("https://www.youtube.com/results?search_query=nasa");
      await h.cleaned(page);
      assert.deepEqual(await h.state(page), CLEAN);
    });

    await t.test("client-side navigation to Shorts uses the standard player", async () => {
      await page.goto(SUBSCRIPTIONS);
      site.requests.length = 0;
      await page.evaluate(() => {
        history.pushState({}, "", "/shorts/Ab_c-D12345");
        document.dispatchEvent(new CustomEvent("yt-navigate-finish"));
      });
      await h.until(() => site.requests.length > 0);
      assert.deepEqual([...new Set(site.requests)], [WATCH]);
    });

    await t.test("embedded players are untouched", async () => {
      await page.goto("https://www.youtube.com/embed/Ab_c-D12345");
      await pause(500);
      const embed = await h.state(page);
      assert.equal(embed.logo, "/");
      assert.equal(embed.short, true);
    });

    // WebDriver BiDi refuses moz-extension navigation; tests/package.test.js covers the markup.
    await t.test("popup offers one link to Subscriptions", { skip: name === "firefox" }, async () => {
      await page.goto(h.extensionPage(name, id, "popup.html"));
      assert.deepEqual(await page.$$eval("a", links => links.map(link => link.href)), [SUBSCRIPTIONS]);
    });

    await t.test("uninstall restores ordinary YouTube", async () => {
      await page.goto("about:blank");
      await browser.uninstallExtension(id);
      assert.deepEqual(await h.visit(site, page, "https://www.youtube.com/"), ["https://www.youtube.com/"]);
      await pause(500);
      assert.equal((await h.state(page)).short, true);
    });
  });

  test(name + ": upgrade from the configurable 0.2.0 release", async t => {
    const { site, browser, extension } = await session(t, name);
    h.legacyExtension(name, extension);
    const id = await browser.installExtension(extension);
    const page = await browser.newPage();
    // 0.2.0 writes its dynamic rules after reading settings on install.
    if (name === "chrome") await h.until(async () => (await h.dynamicRules(name, page, id)).length === 2);
    else await pause(1000);
    const existing = await browser.newPage();
    await existing.goto("https://www.youtube.com/results?search_query=nasa");

    await page.goto("about:blank");
    h.copyBuild(name, extension);
    assert.equal(await browser.installExtension(extension), id);
    await pause(1000);

    // Firefox cannot open extension pages here, and its 0.2.0 rules redirect like the fixed rules.
    await t.test("legacy dynamic rules are removed", { skip: name === "firefox" }, async () => {
      assert.deepEqual(await h.dynamicRules(name, page, id), []);
    });

    await t.test("fixed redirects apply after the update", async () => {
      assert.deepEqual(await h.visit(site, page, SHARED_SHORT), [WATCH]);
      assert.deepEqual(await h.visit(site, page, "https://www.youtube.com/"), [SUBSCRIPTIONS]);
    });

    await t.test("an existing tab recovers after reload", async () => {
      await existing.reload({ waitUntil: "load" });
      await h.cleaned(existing);
      assert.deepEqual(await h.state(existing), CLEAN);
    });
  });
}

if (BROWSERS.includes("chrome")) {
  test("chrome: browser restart, disable and re-enable", async t => {
    const site = await h.startYouTube();
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "fix-yt-profile-"));
    const load = [path.join(h.root, "dist-chrome")];
    let browser = await h.launch("chrome", site.port, profile, load);
    const worker = await browser.waitForTarget(target => target.type() === "service_worker");
    const id = new URL(worker.url()).host;
    await browser.close();
    browser = await h.launch("chrome", site.port, profile, load);
    t.after(async () => {
      await browser.close();
      site.close();
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
    });
    const page = await browser.newPage();

    await t.test("rules apply after a restart and no legacy rules return", async () => {
      assert.deepEqual(await h.dynamicRules("chrome", page, id), []);
      assert.deepEqual(await h.visit(site, page, "https://www.youtube.com/"), [SUBSCRIPTIONS]);
      await h.cleaned(page);
    });

    const setEnabled = async enabled => {
      const settings = await browser.newPage();
      await settings.goto("chrome://extensions");
      await settings.evaluate((extensionId, value) => chrome.management.setEnabled(extensionId, value), id, enabled);
      await settings.close();
      await pause(500);
    };

    await t.test("disabling restores ordinary YouTube", async () => {
      await setEnabled(false);
      assert.deepEqual(await h.visit(site, page, "https://www.youtube.com/"), ["https://www.youtube.com/"]);
      await pause(500);
      assert.equal((await h.state(page)).short, true);
    });

    await t.test("re-enabling restores the cleanup", async () => {
      await setEnabled(true);
      assert.deepEqual(await h.visit(site, page, SHARED_SHORT), [WATCH]);
      await h.cleaned(page);
      assert.deepEqual(await h.state(page), CLEAN);
    });
  });
}
