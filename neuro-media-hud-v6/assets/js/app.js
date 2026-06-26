const BRIDGE_PREFIX = "NEURO_GATEWAY|";
const query = new URLSearchParams(window.location.search);
const liveBridge = query.get("bridge") === "sl";
const pendingBridge = new Map();

const state = {
  hiddenBalances: {
    checking: false,
    savings: false
  },
  profile: {
    title: "Resident",
    name: "Neuro Resident",
    age: "Adult",
    sex: "Not Set",
    location: "Not Set",
    avatar: "01"
  },
  stats: {
    hunger: 82,
    thirst: 64,
    sleep: 100,
    hygiene: 88,
    energy: 91,
    fun: 55,
    xp: 78
  },
  lastSnapshot: null
};

const avatarPath = (id) => `assets/img/avatars/avatar-${id}.png`;

function logBridge(line) {
  const log = document.querySelector("#bridge-log");
  if (!log) return;
  const lines = `${line}\n${log.textContent}`.trim().split("\n");
  log.textContent = lines.slice(0, 12).join("\n");
}

function sendBridge(op, text = "") {
  const tick = Date.now().toString();
  const query = new URLSearchParams({
    op,
    text,
    tick
  }).toString();

  pendingBridge.set(tick, op);
  window.parent.postMessage(`${BRIDGE_PREFIX}${query}`, "*");
  if (op !== "stats") logBridge(`sent: ${op}`);
  return tick;
}

function loadSavedProfile() {
  try {
    const saved = JSON.parse(window.localStorage.getItem("neuroProfile") || "{}");
    state.profile = { ...state.profile, ...saved };
  } catch {
    window.localStorage.removeItem("neuroProfile");
  }
}

function renderProfile() {
  document.querySelectorAll("[data-profile-field]").forEach((node) => {
    const key = node.dataset.profileField;
    if (key in state.profile) node.textContent = state.profile[key];
  });

  document.querySelectorAll("[data-avatar-display]").forEach((image) => {
    image.src = avatarPath(state.profile.avatar);
  });
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("is-active", screen.id === `screen-${name}`);
  });

  document.querySelectorAll("[data-screen-target]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screenTarget === name);
  });

  document.querySelector(".hud-shell")?.setAttribute("data-screen", name);
}

function toggleBalance(name) {
  state.hiddenBalances[name] = !state.hiddenBalances[name];
  const balance = document.querySelector(`[data-balance="${name}"]`);
  if (!balance) return;
  balance.textContent = state.hiddenBalances[name] ? "Hidden" : balance.dataset.original || balance.textContent;
  if (!balance.dataset.original && balance.textContent !== "Hidden") {
    balance.dataset.original = balance.textContent;
  }
}

function statState(value) {
  if (value <= 35) return "low";
  if (value <= 69) return "mid";
  return "good";
}

function statIcon(statName, stateName) {
  if (stateName === "low") return "#icon-stat-low";
  return {
    hunger: "#icon-stat-hunger",
    thirst: "#icon-stat-thirst",
    sleep: "#icon-stat-sleep",
    energy: "#icon-stat-energy",
    hygiene: "#icon-stat-hygiene",
    fun: "#icon-stat-fun",
    xp: "#icon-stat-xp"
  }[statName] || "#icon-stat-good";
}

function updateStatRow(row) {
  const valueText = row.dataset.value || row.querySelector("strong")?.textContent || "0";
  const value = Number.parseInt(valueText, 10);
  const stateName = statState(Number.isFinite(value) ? value : 0);
  const icon = row.querySelector(".stat-icon use");

  row.classList.toggle("is-good", stateName === "good");
  row.classList.toggle("is-mid", stateName === "mid");
  row.classList.toggle("is-low", stateName === "low");
  row.dataset.state = stateName;
  if (icon) icon.setAttribute("href", statIcon(row.dataset.stat, stateName));
}

function setupStats() {
  document.querySelectorAll(".stat-panel article").forEach((row) => {
    updateStatRow(row);
    const valueNode = row.querySelector("strong");
    if (!valueNode) return;
    new MutationObserver(() => {
      row.dataset.value = valueNode.textContent;
      updateStatRow(row);
    }).observe(valueNode, { childList: true, characterData: true, subtree: true });
  });
}

function asNumber(value, fallback = 0) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampStat(value) {
  return Math.max(0, Math.min(100, Math.round(asNumber(value))));
}

function snapshotValue(snapshot, key, fallback = "") {
  if (!snapshot || !(key in snapshot)) return fallback;
  const value = snapshot[key];
  return value === undefined || value === null || value === "" ? fallback : value;
}

function xpPercent(snapshot) {
  const xp = Math.max(0, Math.round(asNumber(snapshotValue(snapshot, "xp", 0))));
  const perLevel = Math.max(1, Math.round(asNumber(snapshotValue(snapshot, "xpPerLevel", 2500), 2500)));
  return Math.round(((xp % perLevel) / perLevel) * 100);
}

function statsFromSnapshot(snapshot) {
  return {
    hunger: clampStat(snapshotValue(snapshot, "stat.hunger", state.stats.hunger)),
    thirst: clampStat(snapshotValue(snapshot, "stat.thirst", state.stats.thirst)),
    sleep: clampStat(snapshotValue(snapshot, "stat.sleep", state.stats.sleep)),
    hygiene: clampStat(snapshotValue(snapshot, "stat.hygiene", state.stats.hygiene)),
    energy: clampStat(snapshotValue(snapshot, "stat.energy", state.stats.energy)),
    fun: clampStat(snapshotValue(snapshot, "stat.fun", state.stats.fun)),
    xp: clampStat(xpPercent(snapshot))
  };
}

function feelingFromStats(stats) {
  const core = [
    ["hunger", stats.hunger, "Hungry"],
    ["thirst", stats.thirst, "Thirsty"],
    ["sleep", stats.sleep, "Tired"],
    ["hygiene", stats.hygiene, "Needs Care"],
    ["energy", stats.energy, "Low Energy"],
    ["fun", stats.fun, "Bored"]
  ];
  const sorted = core.slice().sort((a, b) => a[1] - b[1]);
  const lowest = sorted[0];
  const average = Math.round(core.reduce((sum, item) => sum + item[1], 0) / core.length);

  if (lowest[1] <= 20) return { label: "Critical", level: "low", detail: `${lowest[2]} ${lowest[1]}%` };
  if (lowest[1] <= 40) return { label: lowest[2], level: "low", detail: `Needs attention` };
  if (average < 65) return { label: "Uneasy", level: "mid", detail: `Body ${average}%` };
  if (lowest[1] < 70) return { label: "Stable", level: "mid", detail: `${lowest[0].toUpperCase()} ${lowest[1]}%` };
  return { label: "Stable", level: "good", detail: "Live Sync" };
}

function renderBodyStatus(stats) {
  const status = feelingFromStats(stats);
  const shell = document.querySelector(".hud-shell");
  const label = document.querySelector("[data-body-status-label]");
  const detail = document.querySelector("[data-body-status-detail]");

  if (label) label.textContent = status.label;
  if (detail) detail.textContent = status.detail;
  if (shell) shell.dataset.vitals = status.level;
}

function renderStats(stats) {
  state.stats = { ...state.stats, ...stats };
  Object.entries(state.stats).forEach(([name, value]) => {
    const row = document.querySelector(`[data-stat="${name}"]`);
    const valueNode = row?.querySelector("strong");
    if (!row || !valueNode) return;
    const percent = clampStat(value);
    row.dataset.value = String(percent);
    valueNode.textContent = `${percent}%`;
    updateStatRow(row);
  });
  renderBodyStatus(state.stats);
}

function applyProfileSnapshot(snapshot) {
  const updates = {
    title: snapshotValue(snapshot, "title", state.profile.title) || state.profile.title,
    name: snapshotValue(snapshot, "displayName", state.profile.name) || state.profile.name,
    age: snapshotValue(snapshot, "age", state.profile.age) || state.profile.age,
    sex: snapshotValue(snapshot, "sex", state.profile.sex) || state.profile.sex,
    location: snapshotValue(snapshot, "location", state.profile.location) || state.profile.location
  };

  state.profile = { ...state.profile, ...updates };
  renderProfile();
}

function applySnapshot(snapshot) {
  if (!snapshot || snapshot.token !== "CDF_WORLD_V1") return;
  state.lastSnapshot = snapshot;
  renderStats(statsFromSnapshot(snapshot));
  applyProfileSnapshot(snapshot);
}

function handleStatsResponse(body) {
  let payload = body;
  if (payload.startsWith("STATS|")) payload = payload.substring(6);
  if (!payload || payload === "NO_STATS" || payload.startsWith("NO_STATS|")) {
    const detail = document.querySelector("[data-body-status-detail]");
    if (detail) detail.textContent = "SYNCING";
    return;
  }

  try {
    applySnapshot(JSON.parse(payload));
  } catch {
    logBridge(`bad stats payload`);
  }
}

function startLiveStats() {
  if (!liveBridge) {
    renderBodyStatus(state.stats);
    return;
  }

  const detail = document.querySelector("[data-body-status-detail]");
  if (detail) detail.textContent = "SYNCING";
  sendBridge("sync");
  sendBridge("stats");
  window.setInterval(() => sendBridge("stats"), 5000);
}

function setupClock() {
  const clock = document.querySelector("#slt-clock");
  if (!clock) return;

  function tick() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(now);
    const hour = parts.find((part) => part.type === "hour")?.value || "00";
    const minute = parts.find((part) => part.type === "minute")?.value || "00";
    clock.innerHTML = `${hour}:${minute} <span>SLT</span>`;
  }

  tick();
  window.setInterval(tick, 30000);
}

document.addEventListener("click", (event) => {
  const screenButton = event.target.closest("[data-screen-target]");
  if (screenButton) {
    showScreen(screenButton.dataset.screenTarget);
    return;
  }

  const commandButton = event.target.closest("[data-command]");
  if (commandButton) {
    sendBridge(commandButton.dataset.command);
    return;
  }

  const eyeButton = event.target.closest("[data-wallet-eye]");
  if (eyeButton) {
    toggleBalance(eyeButton.dataset.walletEye);
  }
});

window.addEventListener("message", (event) => {
  const data = String(event.data || "");
  if (!data.startsWith("NEURO_GATEWAY_ACK|")) return;
  const parts = data.split("|");
  const tick = parts[1] || "ack";
  const status = parts[2] || "?";
  const body = parts.slice(3).join("|");
  const op = pendingBridge.get(tick) || tick;
  pendingBridge.delete(tick);
  if (op !== "stats") logBridge(`${op}: LSL ${status} ${body}`);
  if (body.startsWith("STATS|") || body.startsWith("{") || body.startsWith("NO_STATS")) {
    handleStatsResponse(body);
  }
});

document.querySelectorAll("[data-balance]").forEach((balance) => {
  balance.dataset.original = balance.textContent;
});

setupStats();
loadSavedProfile();
renderProfile();
setupClock();
renderStats(state.stats);
startLiveStats();
