// =====================================================//
// Name of script: neura-stats
// Build: 1001
// Update: Initial Stats Display Layer
// Date and time: 2026-07-02 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

const STAT_KEYS = Object.freeze(["hunger", "thirst", "sleep", "energy", "hygiene", "fun", "care"]);

const statsState = {
  bridgeOnline: false,
  values: new Map()
};

function statNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, parsed));
}

function statNode(statName) {
  return document.querySelector(`[data-stat="${statName}"]`);
}

function renderStat(statName, rawValue) {
  const value = statNumber(rawValue);
  const valueNode = statNode(statName);
  const row = valueNode?.closest(".stat-row");
  if (!valueNode || !row) return;

  if (value === null) {
    valueNode.textContent = "--%";
    row.style.setProperty("--stat-fill", "0%");
    row.dataset.statState = "empty";
    statsState.values.delete(statName);
    return;
  }

  valueNode.textContent = `${value}%`;
  row.style.setProperty("--stat-fill", `${value}%`);
  row.dataset.statState = value >= 100 ? "full" : value <= 25 ? "low" : "active";
  statsState.values.set(statName, value);
}

function renderStats(values = {}) {
  STAT_KEYS.forEach((statName) => renderStat(statName, values[statName] ?? ""));
}

function parseStatsPayload(message) {
  const data = {};
  String(message || "").split("|").slice(1).forEach((part) => {
    const index = part.indexOf("=");
    if (index <= 0) return;
    data[part.slice(0, index)] = part.slice(index + 1);
  });
  return data;
}

function receiveStats(message) {
  const payload = typeof message === "string" ? parseStatsPayload(message) : message;
  if (!payload || payload.feature !== "NEURA_STATS") return;
  statsState.bridgeOnline = true;
  document.querySelector(".stats-panel")?.setAttribute("data-stats-bridge", "online");
  renderStats(payload);
}

function markStatsOffline() {
  statsState.bridgeOnline = false;
  document.querySelector(".stats-panel")?.setAttribute("data-stats-bridge", "offline");
}

markStatsOffline();
renderStats();

window.neuraStats = Object.freeze({
  build: 1001,
  feature: "NEURA_STATS",
  receive: receiveStats,
  render: renderStats,
  values: () => Object.fromEntries(statsState.values)
});
