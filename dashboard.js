// Fix YouTube — Dashboard

function formatDuration(seconds) {
  if (seconds < 60) return seconds + "s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return h + "h " + m + "m";
  return m + "m";
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now - 86400000).toDateString();

  if (d.toDateString() === today) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (d.toDateString() === yesterday) {
    return "Yesterday";
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

chrome.storage.local.get({ watchHistory: [] }, (data) => {
  const history = data.watchHistory;

  if (history.length === 0) {
    document.getElementById("topChannels").innerHTML =
      '<div class="empty">No data yet</div>';
    document.getElementById("historyList").innerHTML =
      '<div class="empty">Start watching videos — they\'ll appear here.</div>';
    return;
  }

  // Stats
  const todayCutoff = startOfToday();
  const weekCutoff = startOfWeek();

  let todaySeconds = 0;
  let weekSeconds = 0;

  for (const entry of history) {
    if (entry.timestamp >= todayCutoff) todaySeconds += entry.watchedSeconds;
    if (entry.timestamp >= weekCutoff) weekSeconds += entry.watchedSeconds;
  }

  document.getElementById("todayTime").textContent = formatDuration(todaySeconds);
  document.getElementById("weekTime").textContent = formatDuration(weekSeconds);
  document.getElementById("totalVideos").textContent = history.length;

  // Top channels by total watch time
  const channelTime = {};
  for (const entry of history) {
    const name = entry.channelName || entry.channel || "Unknown";
    channelTime[name] = (channelTime[name] || 0) + entry.watchedSeconds;
  }

  const topChannels = Object.entries(channelTime)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  document.getElementById("topChannels").innerHTML = topChannels
    .map(
      ([name, seconds]) =>
        `<div class="channel-chip">
          <span class="ch-name">${name}</span>
          <span class="ch-time">${formatDuration(seconds)}</span>
        </div>`
    )
    .join("");

  // Recent history (newest first, limit 50)
  const recent = [...history].reverse().slice(0, 50);

  document.getElementById("historyList").innerHTML = recent
    .map(
      (e) =>
        `<div class="history-entry">
          <div class="entry-time">${formatDuration(e.watchedSeconds)}</div>
          <div class="entry-info">
            <div class="entry-title">${e.title || e.videoId}</div>
            <div class="entry-meta">${e.channelName || e.channel || ""}</div>
          </div>
          <div class="entry-date">${formatDate(e.timestamp)}</div>
        </div>`
    )
    .join("");
});

document.getElementById("clearBtn").addEventListener("click", () => {
  if (confirm("Clear all watch history?")) {
    chrome.storage.local.set({ watchHistory: [] }, () => {
      window.location.reload();
    });
  }
});
