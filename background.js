// Remove configurable redirect rules left by releases before 0.3.0.
// Fixed static rules now own redirects in both browsers.
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1, 2] });
});
