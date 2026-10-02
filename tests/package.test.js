const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const chrome = require("../manifest.json");
const firefox = require("../manifest.firefox.json");
const rules = require("../rules.json");

test("both browser packages expose the same fixed product and version", () => {
  for (const manifest of [chrome, firefox]) {
    assert.equal(manifest.version, require("../package.json").version);
    assert.equal(manifest.name, "Fix YouTube");
    assert.deepEqual(manifest.permissions, ["declarativeNetRequest"]);
    assert.deepEqual(manifest.content_scripts[0].js, ["content.js"]);
    assert.equal(manifest.commands, undefined);
    assert.equal(manifest.options_ui, undefined);
    assert.deepEqual(manifest.declarative_net_request.rule_resources,
      [{ id: "redirect_rules", enabled: true, path: "rules.json" }]);
    for (const file of ["popup.html", "background.js", "content.js", "styles.css", "rules.json", ...Object.values(manifest.icons)]) {
      assert.ok(fs.existsSync(path.join(root, file)), file);
    }
  }
  assert.deepEqual(firefox.browser_specific_settings.gecko.data_collection_permissions, {required: ["none"]});
});

test("permissions and content injection are limited to desktop YouTube", () => {
  for (const manifest of [chrome, firefox]) {
    assert.deepEqual(manifest.host_permissions, ["*://www.youtube.com/*", "*://youtube.com/*"]);
    assert.deepEqual(manifest.content_scripts[0].exclude_matches,
      ["*://www.youtube.com/embed/*", "*://youtube.com/embed/*"]);
  }
});

test("network homepage rule covers query strings and bare domain, not other pages", () => {
  const pattern = new RegExp(rules[0].condition.regexFilter);
  for (const url of ["https://www.youtube.com/", "http://youtube.com/", "https://www.youtube.com/?app=desktop"]) {
    assert.ok(pattern.test(url), url);
  }
  for (const url of ["https://www.youtube.com/watch?v=test", "https://www.youtube.com/feed/subscriptions", "https://music.youtube.com/", "https://youtube.com.evil.test/"]) {
    assert.ok(!pattern.test(url), url);
  }
  assert.equal(rules[0].action.redirect.url, "https://www.youtube.com/feed/subscriptions");
});

test("network Shorts redirects retain the complete video ID and target only main frames", () => {
  const rule = rules[1];
  const pattern = new RegExp(rule.condition.regexFilter);
  const replacement = rule.action.redirect.regexSubstitution.replace(/\\(\d)/g, "$$$1");
  for (const url of [
    "https://www.youtube.com/shorts/Ab_c-D12345",
    "https://www.youtube.com/shorts/Ab_c-D12345?feature=share",
    "https://youtube.com/shorts/Ab_c-D12345/?si=example",
    "https://www.youtube.com/shorts/Ab_c-D12345#details",
  ]) {
    const match = url.match(pattern);
    assert.ok(match);
    assert.equal(match[2], "Ab_c-D12345");
    // The browser replaces the first match within the complete request URL.
    assert.equal(url.replace(pattern, replacement), "https://www.youtube.com/watch?v=Ab_c-D12345");
  }
  assert.ok(!pattern.test("https://www.youtube.com/shorts/"));
  assert.ok(!pattern.test("https://music.youtube.com/shorts/test"));
  for (const item of rules) assert.deepEqual(item.condition.resourceTypes, ["main_frame"]);
});

test("popup has one navigation action and no customization or executable scripts", () => {
  const html = fs.readFileSync(path.join(root, "popup.html"), "utf8");
  assert.equal((html.match(/<a\s/g) || []).length, 1);
  assert.match(html, /href="https:\/\/www.youtube.com\/feed\/subscriptions"/);
  assert.doesNotMatch(html, /<(input|select|button|script)\b/);
});

test("runtime contains no storage, tracking, fetches, remote code, or settings imports", () => {
  const source = ["content.js", "background.js"].map(file => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  assert.doesNotMatch(source, /chrome\.storage|browser\.storage|fetch\(|XMLHttpRequest|importScripts|eval\(/);
  for (const file of ["settings.js", "popup.js", "dashboard.js", "dashboard.html"]) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file);
  }
});
