const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const source = fs.readFileSync(require("node:path").join(__dirname, "../content.js"), "utf8");

function load(pathname, options = {}) {
  const events = {}, windowEvents = {}, frames = [], redirects = [], timers = [];
  let observe, observerCallback, clicks = 0, now = 1000;
  let checked = !!options.toggle, acceptsClicks = !!options.toggleResponds;
  const links = options.links || [];
  const shelves = options.shelves || [];
  const toggle = options.toggle ? {
    getAttribute: () => String(checked),
    click() { clicks++; if (acceptsClicks) checked = false; },
  } : null;
  const document = {
    documentElement: options.noRoot ? null : {},
    addEventListener(name, fn) { events[name] = fn; },
    querySelectorAll(selector) { return selector.startsWith("ytd-topbar") ? links : shelves; },
    querySelector() { return checked ? toggle : null; },
  };
  const window = { addEventListener(name, fn) { windowEvents[name] = fn; } };
  window.top = options.iframe ? {} : window;
  const location = { pathname, replace(url) { redirects.push(url); } };
  vm.runInNewContext(source, {
    window, document, location, Date: { now: () => now },
    requestAnimationFrame(fn) { frames.push(fn); },
    setTimeout(fn) { timers.push(fn); return timers.length; },
    MutationObserver: class {
      constructor(fn) { observerCallback = fn; }
      observe(root, config) { observe = config; }
    },
  });
  return {events, windowEvents, frames, redirects, timers, location, document,
    mutate: () => observerCallback(), config: () => observe,
    clicks: () => clicks, advance: () => { now += 600; },
    attachToggleHandler: () => { acceptsClicks = true; },
    setChecked: value => { checked = value; }, checked: () => checked};
}

test("homepage redirects immediately without starting a DOM observer", () => {
  const page = load("/");
  assert.deepEqual(page.redirects, ["https://www.youtube.com/feed/subscriptions"]);
  assert.equal(page.config(), undefined);
});

test("direct Shorts route opens the standard watch player", () => {
  const page = load("/shorts/Ab_c-D12345");
  assert.deepEqual(page.redirects, ["https://www.youtube.com/watch?v=Ab_c-D12345"]);
});

test("watch, search, subscriptions and channel routes are preserved", () => {
  for (const path of ["/watch", "/results", "/feed/subscriptions", "/@creator", "/shorts/"]) {
    assert.deepEqual(load(path).redirects, [], path);
  }
});

test("embeds and frames are untouched", () => {
  assert.equal(load("/embed/Ab_c-D12345").config(), undefined);
  assert.equal(load("/watch", {iframe: true}).config(), undefined);
});

test("SPA navigation and browser back are redirected too", () => {
  const page = load("/watch");
  page.location.pathname = "/";
  page.events["yt-navigate-finish"]();
  page.location.pathname = "/shorts/Ab_c-D12345";
  page.windowEvents.popstate();
  assert.deepEqual(page.redirects, [
    "https://www.youtube.com/feed/subscriptions",
    "https://www.youtube.com/watch?v=Ab_c-D12345",
  ]);
});

test("DOM updates are coalesced and autoplay changes are observed", () => {
  const page = load("/watch");
  page.mutate(); page.mutate(); page.mutate();
  assert.equal(page.frames.length, 1);
  assert.deepEqual(Array.from(page.config().attributeFilter), ["aria-checked", "href", "page-subtype"]);
  page.frames.shift()();
  page.mutate();
  assert.equal(page.frames.length, 1);
});

test("autoplay click is rate limited while YouTube updates its state", () => {
  const page = load("/watch", {toggle: true});
  assert.equal(page.clicks(), 1);
  page.events["yt-navigate-finish"]();
  assert.equal(page.clicks(), 1);
  assert.equal(page.timers.length, 1);
  page.advance();
  page.timers.shift()();
  page.frames.shift()();
  assert.equal(page.clicks(), 2);
});

test("autoplay retries an ignored click without waiting for another DOM mutation", () => {
  const page = load("/watch", {toggle: true});
  assert.equal(page.clicks(), 1);
  assert.equal(page.checked(), true);
  assert.equal(page.timers.length, 1);
  // YouTube attaches its handler after the extension's first click.
  page.attachToggleHandler();
  page.advance();
  page.timers.shift()();
  page.frames.shift()();
  assert.equal(page.clicks(), 2);
  assert.equal(page.checked(), false);
  assert.equal(page.timers.length, 0);
});

test("an autoplay retry never clicks a toggle that has already switched off", () => {
  const page = load("/watch", {toggle: true});
  assert.equal(page.timers.length, 1);
  page.setChecked(false);
  page.advance();
  page.timers.shift()();
  page.frames.shift()();
  assert.equal(page.clicks(), 1);
  assert.equal(page.timers.length, 0);
});

test("a successful autoplay click does not schedule another attempt", () => {
  const page = load("/watch", {toggle: true, toggleResponds: true});
  assert.equal(page.clicks(), 1);
  assert.equal(page.checked(), false);
  assert.equal(page.timers.length, 0);
});

test("home links are rewritten without repeatedly mutating the same href", () => {
  let href = "/", changes = 0;
  const page = load("/watch", {links: [{
    getAttribute: () => href,
    setAttribute: (name, value) => { href = value; changes++; },
  }]});
  page.events["yt-navigate-finish"]();
  assert.equal(href, "/feed/subscriptions");
  assert.equal(changes, 1);
});

test("reused shelves are rechecked and ordinary channel titles are preserved", () => {
  let title = "For you", hidden;
  const shelf = {
    matches: () => true,
    querySelector: () => ({ textContent: title }),
    classList: { toggle: (name, value) => { hidden = value; } },
  };
  const page = load("/results", {shelves: [shelf]});
  assert.equal(hidden, true);
  title = "Recommended camera settings";
  page.events["yt-navigate-finish"]();
  assert.equal(hidden, false);
});

test("document-start waits for a root when necessary", () => {
  const page = load("/watch", {noRoot: true});
  assert.equal(page.config(), undefined);
  page.document.documentElement = {};
  page.events.DOMContentLoaded();
  assert.ok(page.config());
});

test("upgrade removes the legacy dynamic redirect rules", () => {
  let installed, removed;
  vm.runInNewContext(fs.readFileSync(require("node:path").join(__dirname, "../background.js"), "utf8"), {
    chrome: {
      runtime: { onInstalled: { addListener: fn => { installed = fn; } } },
      declarativeNetRequest: { updateDynamicRules: args => { removed = args.removeRuleIds; } },
    },
  });
  installed();
  assert.deepEqual(Array.from(removed), [1, 2]);
});
