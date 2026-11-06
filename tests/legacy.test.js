const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const legacy = require("./fixtures/legacy-release.json");
const root = path.resolve(__dirname, "..");

test("the upgrade fixture is a configurable release reachable from the current history", () => {
  const git = (...args) => execFileSync("git", ["-C", root, ...args], {encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]});
  // An unreachable local object can work locally but be missing in a full CI clone.
  assert.doesNotThrow(() => git("merge-base", "--is-ancestor", legacy.commit, "HEAD"));
  const manifest = JSON.parse(git("show", legacy.commit + ":manifest.json"));
  assert.equal(manifest.version, legacy.version);
  assert.ok(manifest.permissions.includes("storage"), "upgrade must start with the configurable product");
  assert.match(git("show", legacy.commit + ":background.js"), /updateDynamicRules/);
});
