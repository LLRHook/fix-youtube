// Installed-extension harness. Browsers reach a local HTTPS stand-in for
// YouTube through a CONNECT proxy, so every request the page makes is logged.
const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const puppeteer = require("puppeteer");

const root = path.resolve(__dirname, "../..");
const HOSTS = new Set(["www.youtube.com", "youtube.com"]);
// Last configurable release (0.2.0). Its dynamic redirect rules must be removed on upgrade.
const LEGACY_COMMIT = "8ec06f45ae39ba6e6ac9aeefb8917474c52dd63b";

const PAGE = `<!doctype html><meta charset="utf-8"><title>YouTube fixture</title>
<style>ytd-video-renderer,ytd-guide-entry-renderer,ytd-watch-flexy,#secondary{display:block}</style>
<ytd-topbar-logo-renderer><a id="logo" href="/">YouTube</a></ytd-topbar-logo-renderer>
<ytd-guide-entry-renderer id="nav-shorts"><a title="Shorts">Shorts</a></ytd-guide-entry-renderer>
<ytd-video-renderer id="ordinary"><a href="/watch?v=ordinary">Video</a></ytd-video-renderer>
<ytd-video-renderer id="short"><a href="/shorts/Ab_c-D12345">Short</a></ytd-video-renderer>
<ytd-watch-flexy><div id="secondary"><div id="related">Up next</div></div></ytd-watch-flexy>
<div class="ytp-autonav-toggle-button-container"><button class="ytp-autonav-toggle-button" aria-checked="true">Autoplay</button></div>
<script>document.querySelector(".ytp-autonav-toggle-button").onclick = e => e.target.setAttribute("aria-checked", "false");</script>`;

function certificate(dir) {
  const key = path.join(dir, "key.pem"), cert = path.join(dir, "cert.pem");
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
    "-subj", "/CN=www.youtube.com", "-addext", "subjectAltName=DNS:www.youtube.com,DNS:youtube.com",
    "-keyout", key, "-out", cert], { stdio: "ignore" });
  return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };
}

async function startYouTube() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fix-yt-cert-"));
  const requests = [];
  const site = https.createServer(certificate(dir), (req, res) => {
    if (req.url.startsWith("/favicon")) return res.writeHead(404).end();
    requests.push("https://" + req.headers.host + req.url);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(PAGE);
  });
  const proxy = http.createServer((req, res) => res.writeHead(403).end());
  proxy.on("connect", (req, socket, head) => {
    // Refuse browser telemetry and update traffic; only the stand-in is reachable.
    if (!HOSTS.has(req.url.split(":")[0])) return socket.end("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length) socket.unshift(head);
    site.emit("connection", socket);
  });
  const tunnels = new Set();
  proxy.on("connection", socket => { tunnels.add(socket); socket.on("close", () => tunnels.delete(socket)); });
  await new Promise(resolve => proxy.listen(0, "127.0.0.1", resolve));
  return {
    port: proxy.address().port,
    requests,
    close: () => {
      for (const socket of tunnels) socket.destroy();
      proxy.close();
      site.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

// Firefox keeps the internal UUID it is given, which makes extension pages addressable.
const FIREFOX_UUID = "6f1d2c7a-3b4e-4f5a-8c9d-0e1f2a3b4c5d";

// Chrome forgets extensions installed over CDP on restart; pass `load` to use --load-extension.
function launch(browser, port, userDataDir, load) {
  const common = { browser, headless: true, pipe: true, enableExtensions: load || true, acceptInsecureCerts: true, userDataDir };
  if (browser === "firefox") {
    return puppeteer.launch({ ...common, extraPrefsFirefox: {
      "network.proxy.type": 1, "network.proxy.ssl": "127.0.0.1", "network.proxy.ssl_port": port,
      "extensions.webextensions.uuids": JSON.stringify({ "fix-youtube@fixyt.dev": FIREFOX_UUID }),
    } });
  }
  return puppeteer.launch({ ...common, args: ["--proxy-server=127.0.0.1:" + port] });
}

const extensionPage = (browser, id, file) =>
  browser === "firefox" ? `moz-extension://${FIREFOX_UUID}/${file}` : `chrome-extension://${id}/${file}`;

// Open an extension page and list the dynamic rule IDs the extension owns.
async function dynamicRules(browser, page, id) {
  await page.goto(extensionPage(browser, id, "popup.html"));
  return page.evaluate(() => chrome.declarativeNetRequest.getDynamicRules().then(rules => rules.map(rule => rule.id)));
}

// Write the 0.2.0 extension from Git history in the layout its build produced.
function legacyExtension(browser, target) {
  const git = (...args) => execFileSync("git", ["-C", root, ...args], { maxBuffer: 1 << 26 });
  for (const name of git("ls-tree", "-r", "--name-only", LEGACY_COMMIT).toString().split("\n")) {
    if (!/^(icons\/.+\.png|[^/]+\.(js|css|html|json))$/.test(name) || name.startsWith("package")) continue;
    const output = path.join(target, name);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, git("show", LEGACY_COMMIT + ":" + name));
  }
  if (browser === "firefox") fs.copyFileSync(path.join(target, "manifest.firefox.json"), path.join(target, "manifest.json"));
}

function copyBuild(browser, target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(path.join(root, "dist-" + browser), target, { recursive: true });
}

async function until(condition, timeout = 5000) {
  for (const end = Date.now() + timeout; !(await condition()); await new Promise(resolve => setTimeout(resolve, 100))) {
    if (Date.now() > end) throw new Error("Timed out waiting for " + condition);
  }
}

// Visit a URL and return the YouTube requests that navigation produced.
async function visit(site, page, url) {
  site.requests.length = 0;
  // Firefox can report a network-rule redirect as an interrupted navigation.
  await page.goto(url, { waitUntil: "load" }).catch(error => {
    if (!error.message.includes("navigation interrupted")) throw error;
  });
  await until(() => site.requests.length > 0);
  await page.waitForFunction(() => document.readyState === "complete");
  return [...site.requests];
}

const cleaned = page => page.waitForFunction(() =>
  document.querySelector("#logo")?.getAttribute("href") === "/feed/subscriptions", { timeout: 5000 });

const state = page => page.evaluate(() => {
  const visible = selector => document.querySelector(selector).checkVisibility();
  return {
    logo: document.querySelector("#logo").getAttribute("href"),
    ordinary: visible("#ordinary"), short: visible("#short"), navShorts: visible("#nav-shorts"),
    related: visible("#related"),
    autoplay: document.querySelector(".ytp-autonav-toggle-button").getAttribute("aria-checked"),
  };
});

module.exports = { root, until, startYouTube, launch, extensionPage, dynamicRules, legacyExtension, copyBuild, visit, cleaned, state };
