const BRIDGE_PREFIX = "NEURO_GATEWAY|";
const query = new URLSearchParams(window.location.search);
const liveBridge = query.get("bridge") === "sl";
const pendingBridge = new Map();
let bridgeSeq = 0;

const state = {
  hiddenBalances: {
    checking: false,
    savings: false
  },
  wallet: {
    checking: null,
    savings: null,
    live: false,
    retryTimer: 0,
    refreshTimer: 0,
    users: [],
    selectedUser: null,
    userPickerOpen: false,
    receipts: [],
    pendingTransfer: null,
    transferStatus: "Transfers stay inside the wallet app and are logged by the G-Coin server."
  },
  profile: {
    role: "Resident",
    name: "Neuro Resident",
    age: "Adult",
    sex: "Not Set",
    location: "Not Set",
    avatar: "01",
    favoriteColor: "#28a1fc",
    zodiac: "sagittarius",
    level: 22,
    xpCurrent: 22840,
    xpGoal: 30000,
    xpPerLevel: 2500,
    verified: true,
    savedInHud: false
  },
  messages: {
    activeThreadId: "",
    live: false,
    loading: false,
    query: "",
    offline: false,
    refreshTimer: 0,
    threads: []
  },
  notifications: {
    items: [],
    dismissedStats: []
  },
  settings: {
    activePanel: "",
    breadcrumbNotify: true,
    breadcrumbSilent: false,
    lastCommand: "",
    updatedAt: 0
  },
  webState: {
    liveLoaded: false,
    saveTimer: 0,
    heartbeatTimer: 0,
    dirty: false,
    lastSaveHash: "",
    lastSaveAt: 0
  },
  neura: {
    alertTimer: 0,
    lastStatSignature: ""
  },
  stats: {
    hunger: 82,
    thirst: 64,
    sleep: 100,
    hygiene: 88,
    energy: 91,
    fun: 55,
    care: 88
  },
  lastSnapshot: null,
  perf: {
    activeTab: "home",
    loaded: {
      home: false,
      profile: false,
      wallet: false,
      health: false,
      settings: false,
      messages: false
    },
    timers: new Map(),
    lastRefresh: "none",
    bridgeActive: liveBridge,
    statsTimer: 0,
    clockTimer: 0
  },
  health: {
    activeGroups: {},
    activeMaleSection: "care",
    activeSection: "cycle",
    detailOpen: false,
    cycleLengthPickerOpen: false,
    bridgeWaiting: false,
    bridgeOffline: false
  },
  clock: {
    lastMinuteKey: "",
    lastHourNoticeKey: "",
    minuteToneIndex: 0
  }
};

const healthSectionLabels = {
  cycle: "Cycle Care",
  pregnancy: "Pregnancy",
  selfCare: "Self Care",
  birthControl: "Birth Control",
  planB: "Plan B Zero"
};

const healthSectionPurposes = {
  cycle: "Tracks cycle status, period care, pain, flow, pads, tampons, and Nue Relief.",
  pregnancy: "Shows pregnancy status, test info, alerts, and prenatal vitamin care.",
  selfCare: "Tracks personal care, wellness, salon care, lotion, and multivitamins.",
  birthControl: "Shows birth control status, last taken, and time left.",
  planB: "Shows emergency use status, times taken, last taken, and pregnancy status."
};

const maleHealthSectionLabels = {
  care: "Care",
  fitness: "Fitness",
  records: "Records"
};

const maleHealthSectionPurposes = {
  care: "Tracks hygiene and wellness care.",
  fitness: "Tracks workouts, gym use, stamina, and body conditioning.",
  records: "Shows recent health activity and care history."
};

const cycleActions = {
  start: {
    label: "Start Cycle",
    opensPicker: true
  },
  pause: {
    label: "Pause Cycle",
    command: "pause cycle",
    status: "Paused",
    nextStep: "Resume Cycle"
  },
  resume: {
    label: "Resume Cycle",
    command: "resume cycle",
    status: "Active",
    nextStep: "Track Care"
  },
  stop: {
    label: "Stop Cycle",
    command: "stop cycle",
    status: "Inactive",
    nextStep: "Start Cycle"
  }
};

const cycleLengthActions = [
  { key: "21", label: "21 Days", command: "21 days" },
  { key: "24", label: "24 Days", command: "24 days" },
  { key: "28", label: "28 Days", command: "28 days" },
  { key: "30", label: "30 Days", command: "30 days" },
  { key: "35", label: "35 Days", command: "35 days" }
];

const AVATAR_ASSET_VERSION = "profile-images-1";
const avatarPath = (id) => `assets/img/perf/avatars/avatar-${id}.png?v=${AVATAR_ASSET_VERSION}`;
const NEURA_ASSET_VERSION = "stamina-health-hud-3";
const neuraPath = () => `assets/img/neura.png?v=${NEURA_ASSET_VERSION}`;
const zodiacPath = (sign) => `assets/img/perf/zodiac/${sign}.png`;
const zodiacLabels = {
  aries: "Aries",
  taurus: "Taurus",
  gemini: "Gemini",
  cancer: "Cancer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  scorpio: "Scorpio",
  sagittarius: "Sagittarius",
  capricorn: "Capricorn",
  aquarius: "Aquarius",
  pisces: "Pisces"
};
const zodiacMeta = {
  aries: { element: "Fire", traits: "Bold \u2022 Driven \u2022 Fearless", line: "First through the door. Built for ignition." },
  taurus: { element: "Earth", traits: "Grounded \u2022 Loyal \u2022 Sensual", line: "Steady under pressure. Drawn to beauty and comfort." },
  gemini: { element: "Air", traits: "Curious \u2022 Social \u2022 Quick", line: "Reads the room fast. Carries two angles at once." },
  cancer: { element: "Water", traits: "Protective \u2022 Intuitive \u2022 Tender", line: "Soft heart, strong shell. Home is the anchor." },
  leo: { element: "Fire", traits: "Radiant \u2022 Creative \u2022 Proud", line: "Leads with presence. Powered by heart." },
  virgo: { element: "Earth", traits: "Precise \u2022 Helpful \u2022 Observant", line: "Finds the pattern. Fixes what others miss." },
  libra: { element: "Air", traits: "Balanced \u2022 Charming \u2022 Diplomatic", line: "Turns tension into grace. Seeks the elegant answer." },
  scorpio: { element: "Water", traits: "Intense \u2022 Loyal \u2022 Private", line: "Deep waters, sharp instincts. Trust is earned." },
  sagittarius: { element: "Fire", traits: "Adventurous \u2022 Honest \u2022 Free", line: "Chases distance and truth. Needs room to move." },
  capricorn: { element: "Earth", traits: "Disciplined \u2022 Ambitious \u2022 Patient", line: "Climbs with intent. Builds the thing that lasts." },
  aquarius: { element: "Air", traits: "Original \u2022 Visionary \u2022 Independent", line: "Future-facing mind. Refuses the default path." },
  pisces: { element: "Water", traits: "Dreamy \u2022 Empathic \u2022 Artistic", line: "Feels the unseen. Turns emotion into signal." }
};

document.body.classList.add("perf-lite");

function logBridge(line) {
  const log = document.querySelector("#bridge-log");
  if (!log) return;
  const lines = `${line}\n${log.textContent}`.trim().split("\n");
  log.textContent = lines.slice(0, 12).join("\n");
}

function activeTimerCount() {
  let count = 0;
  state.perf.timers.forEach((timer) => {
    if (timer.active) count += 1;
  });
  return count;
}

function setPerfTimer(name, id) {
  state.perf.timers.set(name, { id, active: true });
  renderPerfDebug();
  return id;
}

function perfInterval(name, fn, ms) {
  window.clearInterval(state.perf.timers.get(name)?.id || 0);
  return setPerfTimer(name, window.setInterval(fn, ms));
}

function perfTimeout(name, fn, ms) {
  window.clearTimeout(state.perf.timers.get(name)?.id || 0);
  return setPerfTimer(name, window.setTimeout(() => {
    const timer = state.perf.timers.get(name);
    if (timer) timer.active = false;
    renderPerfDebug();
    fn();
  }, ms));
}

function setLastRefresh(label) {
  state.perf.lastRefresh = label;
  renderPerfDebug();
}

function renderPerfDebug() {
  document.querySelectorAll("[data-perf-active-tab]").forEach((node) => { node.textContent = state.perf.activeTab; });
  document.querySelectorAll("[data-perf-active-timers]").forEach((node) => { node.textContent = String(activeTimerCount()); });
  document.querySelectorAll("[data-perf-last-refresh]").forEach((node) => { node.textContent = state.perf.lastRefresh; });
  document.querySelectorAll("[data-perf-messages-loaded]").forEach((node) => { node.textContent = state.perf.loaded.messages ? "yes" : "no"; });
  document.querySelectorAll("[data-perf-bridge-active]").forEach((node) => { node.textContent = state.perf.bridgeActive ? "yes" : "no"; });
}

function sendBridge(op, text = "") {
  bridgeSeq = (bridgeSeq + 1) % 100000;
  const tick = `${Date.now()}-${bridgeSeq}`;
  const query = new URLSearchParams({
    op,
    text,
    tick
  }).toString();

  pendingBridge.set(tick, op);
  window.setTimeout(() => {
    if (!pendingBridge.has(tick)) return;
    pendingBridge.delete(tick);
    if (op === "health-sync") {
      state.health.bridgeWaiting = false;
      state.health.bridgeOffline = true;
      setLastRefresh("health bridge offline");
      renderHealth();
    }
  }, 6000);
  window.parent.postMessage(`${BRIDGE_PREFIX}${query}`, "*");
  if (op !== "stats") logBridge(`sent: ${op}`);
  return tick;
}

function masterRefresh(button = null) {
  setLastRefresh("master refresh");
  addLocalNotification("HUD refreshed", "Media face and HUD scripts were asked to sync.", "System");
  if (button) {
    button.classList.add("is-refreshing");
    window.setTimeout(() => button.classList.remove("is-refreshing"), 460);
  }
  if (liveBridge) {
    saveWebStateNow("refresh", true);
    sendBridge("refresh");
    return;
  }
  window.location.reload();
}

function alertImagePath(alert) {
  if (alert?.assistant || alert?.avatar === "neura") return neuraPath();
  return alert?.avatar ? avatarPath(alert.avatar) : neuraPath();
}

function neuraReactorMessage(message = "", mood = "system") {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const timeMatch = text.match(/(\d{1,2}:00)\s*([AP]M)?/i);
  if (mood === "time" && timeMatch) return `CDF TIME\n${timeMatch[1]}${timeMatch[2] ? ` ${timeMatch[2].toUpperCase()}` : ""}`;
  if (lower.includes("messages") && lower.includes("did not answer")) return "MESSAGES\nOFFLINE";
  if (lower.includes("server") && lower.includes("offline")) return "SERVER\nOFFLINE";
  if (lower.includes("new message")) return "NEW\nMESSAGE";
  if (lower.includes("transfer") && lower.includes("failed")) return "TRANSFER\nFAILED";
  if (lower.includes("transfer")) return "TRANSFER\nCOMPLETE";
  if (lower.includes("refreshed") || lower.includes("sync")) return "HUD\nSYNCED";
  if (mood === "critical") return text.replace("I need you to handle that.", "Needs care.");
  if (text.length <= 18) return text;
  return text.split(/[.!?]/)[0].slice(0, 28).trim();
}

function showNeura(message = "Neura online.", mood = "system") {
  const panel = document.querySelector("[data-neura-hologram]");
  const copy = document.querySelector("[data-neura-message]");
  if (!panel) return;
  if (copy) copy.textContent = neuraReactorMessage(message, mood);
  panel.dataset.mood = mood;
  panel.classList.add("is-active");
  window.clearTimeout(state.neura.alertTimer);
  state.neura.alertTimer = window.setTimeout(() => {
    panel.classList.remove("is-active");
  }, 6200);
}

function gcMoney(value) {
  const amount = Number.parseInt(value, 10);
  if (!Number.isFinite(amount)) return "Syncing";
  return `GC ${amount.toLocaleString("en-US")}`;
}

function parseWalletUsers(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((user) => ({
        id: String(user.id || user.uuid || user.key || "").trim(),
        name: String(user.name || user.displayName || user.label || "").trim()
      }))
      .filter((user) => user.id && user.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function walletUserLabel(user) {
  if (!user) return "";
  return user.name || user.id || "";
}

function addWalletReceipt(receipt) {
  state.wallet.receipts = [{
    id: receipt.id || `wallet-${Date.now()}`,
    type: receipt.type || "Transfer",
    title: receipt.title || "G-Coin transfer",
    detail: receipt.detail || "Waiting for server detail.",
    amount: receipt.amount || "",
    sender: receipt.sender || state.profile.name || "You",
    receiver: receipt.receiver || "G-Coin",
    direction: receipt.direction || "out",
    time: receipt.time || Date.now()
  }, ...state.wallet.receipts].slice(0, 4);
  renderWalletReceipts();
  saveWebStateNow("wallet receipt", true);
}

function walletReceiptTime(value) {
  const date = new Date(value || Date.now());
  return `${date.toLocaleDateString([], { month: "numeric", day: "numeric", year: "2-digit" })} ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function renderWalletStatus(text, live = false) {
  const status = document.querySelector("[data-wallet-status]");
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("is-live", live);
  status.classList.toggle("is-waiting", !live);
}

function renderWallet() {
  if (!state.perf.loaded.wallet) return;
  Object.entries({
    checking: state.wallet.checking,
    savings: state.wallet.savings
  }).forEach(([name, value]) => {
    const balance = document.querySelector(`[data-balance="${name}"]`);
    if (!balance) return;
    const text = gcMoney(value);
    balance.dataset.original = text;
    balance.textContent = state.hiddenBalances[name] ? "GC ----" : text;
  });

  document.querySelectorAll("[data-wallet-eye]").forEach((button) => {
    const account = button.dataset.walletEye;
    const hidden = !!state.hiddenBalances[account];
    button.setAttribute("aria-label", `${hidden ? "Show" : "Hide"} ${account} balance`);
    button.innerHTML = `<svg><use href="#${hidden ? "icon-eye" : "icon-eye-off"}"></use></svg>`;
  });

  renderWalletStatus(state.wallet.live ? "Live wallet synced from Second Life" : "Waiting for Second Life wallet bridge", state.wallet.live);
  renderWalletUsers();
  renderWalletReceipts();
  renderWalletTransferStatus();
}

function renderWalletTransferStatus() {
  const status = document.querySelector("[data-wallet-transfer-status]");
  if (status) status.textContent = state.wallet.transferStatus;
}

function renderWalletUsers() {
  const list = document.querySelector("[data-wallet-users]");
  const field = document.querySelector("[data-wallet-user-field]");
  const selected = document.querySelector("[data-wallet-selected-user]");
  const modal = document.querySelector("[data-wallet-user-modal]");
  const type = document.querySelector("[data-wallet-transfer-type]")?.value || "checking-savings";
  const search = String(document.querySelector("[data-wallet-user-search]")?.value || "").trim().toLowerCase();
  const needsUser = type === "checking-user";
  if (field) field.hidden = !needsUser;
  if (selected) selected.textContent = state.wallet.selectedUser ? walletUserLabel(state.wallet.selectedUser) : "No user selected";
  if (modal) modal.hidden = !needsUser || !state.wallet.userPickerOpen;
  if (!list) return;
  if (!needsUser) {
    list.innerHTML = "";
    return;
  }

  const matches = state.wallet.users
    .filter((user) => !search || walletUserLabel(user).toLowerCase().includes(search))
    .slice(0, 8);

  list.innerHTML = "";
  if (!matches.length) {
    const empty = document.createElement("article");
    empty.className = "wallet-user-empty";
    empty.textContent = state.wallet.users.length ? "No matching G-Coin user." : "Loading G-Coin users...";
    list.append(empty);
    return;
  }

  matches.forEach((user) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.walletUser = user.id;
    button.className = state.wallet.selectedUser?.id === user.id ? "is-selected" : "";
    button.textContent = walletUserLabel(user);
    list.append(button);
  });
}

function openWalletUserPicker() {
  if (!liveBridge) {
    state.wallet.transferStatus = "Open in Second Life to load G-Coin users.";
    renderWalletTransferStatus();
    return;
  }
  state.wallet.userPickerOpen = true;
  sendBridge("wallet-users");
  renderWalletUsers();
  window.setTimeout(() => document.querySelector("[data-wallet-user-search]")?.focus(), 0);
}

function closeWalletUserPicker() {
  state.wallet.userPickerOpen = false;
  renderWalletUsers();
}

function renderWalletReceipts() {
  const list = document.querySelector("[data-wallet-receipts]");
  if (!list) return;
  list.innerHTML = "";
  if (!state.wallet.receipts.length) {
    const empty = document.createElement("article");
    empty.className = "wallet-receipt-empty";
    empty.innerHTML = "<strong>No receipts yet</strong><small>Transfers and incoming G-Coin activity will appear here.</small>";
    list.append(empty);
    return;
  }

  state.wallet.receipts.forEach((receipt) => {
    const item = document.createElement("article");
    item.className = `wallet-receipt is-${receipt.direction || "out"}`;
    item.innerHTML = "<span></span><strong></strong><small></small><time></time><em></em>";
    item.querySelector("span").textContent = receipt.type;
    item.querySelector("strong").textContent = receipt.title;
    item.querySelector("small").textContent = `${receipt.sender} -> ${receipt.receiver}. ${receipt.detail}`;
    item.querySelector("time").textContent = walletReceiptTime(receipt.time);
    item.querySelector("em").textContent = receipt.amount;
    list.append(item);
  });
}

function requestWalletBalance() {
  state.perf.loaded.wallet = true;
  if (!liveBridge) {
    renderWalletStatus("Open in Second Life to sync live G-Coin balances", false);
    return;
  }
  renderWalletStatus("Requesting live G-Coin balance...", false);
  sendBridge("wallet-balance");
  sendBridge("wallet-users");
  setLastRefresh("wallet requested");
}

function startWalletRefresh() {
  if (!liveBridge) return;
  window.clearInterval(state.wallet.refreshTimer);
  state.wallet.refreshTimer = window.setInterval(() => {
    if (state.perf.activeTab !== "wallet") return;
    sendBridge("wallet-balance");
    sendBridge("wallet-users");
    setLastRefresh("wallet requested");
  }, 15000);
}

function stopWalletRefresh() {
  window.clearInterval(state.wallet.refreshTimer);
  state.wallet.refreshTimer = 0;
}

function handleWalletResponse(body) {
  if (body.startsWith("WALLET|")) {
    const parts = body.split("|");
    state.wallet.checking = Number.parseInt(parts[1], 10);
    state.wallet.savings = Number.parseInt(parts[2], 10);
    state.wallet.live = true;
    renderWallet();
    return true;
  }

  if (body.startsWith("WALLET_USERS|")) {
    state.wallet.users = parseWalletUsers(body.slice("WALLET_USERS|".length));
    renderWalletUsers();
    return true;
  }

  if (body.startsWith("WALLET_TX|")) {
    const parts = body.split("|");
    const status = parts[1] || "OK";
    const kind = parts[2] || "Transfer";
    const amount = parts[3] || "";
    const detail = parts.slice(4).join("|") || "G-Coin server accepted the transfer.";
    const pending = state.wallet.pendingTransfer;
    state.wallet.transferStatus = status === "OK" ? detail : `Transfer failed: ${detail}`;
    if (status === "OK") {
      const receiver = pending?.to === "user"
        ? pending.targetName
        : walletAccountLabel(pending?.to || "G-Coin");
      const sender = walletAccountLabel(pending?.from || "checking", state.profile.name || "You");
      addWalletReceipt({
        type: kind,
        title: pending?.label || "Transfer complete",
        detail,
        amount: gcMoney(amount),
        sender,
        receiver,
        direction: kind === "Incoming" ? "in" : "out",
        time: Date.now()
      });
      addLocalNotification("Wallet Transfer", `${gcMoney(amount)} moved from ${sender} to ${receiver}.`, "Wallet");
      state.wallet.pendingTransfer = null;
      clearWalletTransferFields();
      requestWalletBalance();
    } else {
      addLocalNotification("Wallet Transfer Failed", detail, "Wallet");
    }
    renderWalletTransferStatus();
    return true;
  }

  if (body.startsWith("WALLET_SYNC_REQUESTED")) {
    renderWalletStatus("Wallet sync requested. Waiting for G-Coin reply...", false);
    window.clearTimeout(state.wallet.retryTimer);
    state.wallet.retryTimer = perfTimeout("wallet retry", () => {
      if (document.querySelector("#screen-wallet")?.classList.contains("is-active")) sendBridge("wallet-balance");
    }, 1200);
    return true;
  }

  if (body.startsWith("WALLET_")) {
    renderWalletStatus(body.replaceAll("_", " "), false);
    return true;
  }

  return false;
}

function loadSavedProfile() {
  const storageKey = profileStorageKey();
  try {
    let saved = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
    if (!liveBridge && !Object.keys(saved).length) {
      saved = JSON.parse(window.localStorage.getItem("neuroProfile") || "{}");
    }
    applySavedProfile(saved, false);
  } catch {
    window.localStorage.removeItem(storageKey);
  }
}

function applyBridgeIdentityDefaults() {
  if (!liveBridge) return;
  const displayName = String(query.get("name") || "").trim();
  if (displayName && (state.profile.name === "Neuro Resident" || state.profile.name === "Resident")) {
    state.profile.name = displayName;
  }
}

function persistProfileLocal() {
  try {
    window.localStorage.setItem(profileStorageKey(), JSON.stringify(profileSavePayload()));
  } catch {
    // Second Life media can deny browser storage; the LSL gateway is the durable save path.
  }
}

function profileStorageKey() {
  const owner = String(query.get("avatar") || "local").replace(/[^a-z0-9-]/gi, "");
  return liveBridge ? `neuroProfile:${owner || "local"}` : "neuroProfile";
}

function profileSavePayload() {
  const { role, name, age, sex, location, avatar, favoriteColor, zodiac } = state.profile;
  return { ownerUuid: currentOwnerUuid(), role, name, age, sex, location, avatar, favoriteColor, zodiac };
}

function applySavedProfile(profile, fromHud = false) {
  if (!profile || typeof profile !== "object") return;
  if (profile.role === undefined && profile.title !== undefined) profile.role = profile.title;
  const allowed = ["role", "name", "age", "sex", "location", "avatar", "favoriteColor", "zodiac"];
  allowed.forEach((key) => {
    if (profile[key] !== undefined && profile[key] !== null && profile[key] !== "") {
      state.profile[key] = profile[key];
    }
  });
  if (fromHud) state.profile.savedInHud = true;
}

function profileXp() {
  const level = Math.max(0, Math.round(asNumber(state.profile.level, 0)));
  const current = Math.max(0, Math.round(asNumber(state.profile.xpCurrent, 0)));
  const goal = Math.max(1, Math.round(asNumber(state.profile.xpGoal, 1)));
  const perLevel = Math.max(1, Math.round(asNumber(state.profile.xpPerLevel, 2500)));
  const levelFloor = Math.max(0, goal - perLevel);
  const levelSpan = Math.max(1, goal - levelFloor);
  const levelProgress = Math.max(0, Math.min(levelSpan, current - levelFloor));
  const needed = Math.max(0, goal - current);
  const absolutePercent = Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
  const percent = current >= levelFloor ? Math.round((levelProgress / levelSpan) * 100) : absolutePercent;
  const verified = state.profile.verified === undefined ? level >= 10 : Boolean(state.profile.verified);
  return { level, current, goal, needed, percent, verified };
}

function renderProfile() {
  if (!state.perf.loaded.profile && !document.querySelector("[data-profile-editor]:not([hidden])")) return;
  const accent = state.profile.favoriteColor || "#28a1fc";
  const zodiac = state.profile.zodiac || "sagittarius";
  const zodiacLabel = zodiacLabels[zodiac] || zodiacLabels.sagittarius;
  const zodiacInfo = zodiacMeta[zodiac] || zodiacMeta.sagittarius;
  const xp = profileXp();

  document.querySelectorAll("[data-profile-field]").forEach((node) => {
    const key = node.dataset.profileField;
    if (key === "zodiac") {
      node.textContent = zodiacLabel;
    } else if (key in state.profile) {
      node.textContent = state.profile[key];
    }
  });

  document.querySelectorAll("[data-avatar-display]").forEach((image) => {
    image.src = avatarPath(state.profile.avatar);
  });

  document.querySelectorAll("[data-profile-accent], .profile-editor").forEach((node) => {
    node.style.setProperty("--profile-accent", accent);
  });

  document.querySelectorAll("[data-zodiac-mark]").forEach((node) => {
    node.src = zodiacPath(zodiac);
    node.alt = zodiacLabel;
  });

  document.querySelectorAll("[data-profile-story]").forEach((node) => {
    const role = state.profile.role || "Resident";
    const location = state.profile.location && state.profile.location !== "Not Set" ? state.profile.location : "Location unset";
    node.textContent = `${role} / ${location}`;
  });

  document.querySelectorAll("[data-zodiac-name]").forEach((node) => { node.textContent = zodiacLabel; });
  document.querySelectorAll("[data-zodiac-element]").forEach((node) => { node.textContent = zodiacInfo.element; });
  document.querySelectorAll("[data-zodiac-traits]").forEach((node) => { node.textContent = zodiacInfo.traits; });
  document.querySelectorAll("[data-zodiac-line]").forEach((node) => { node.textContent = zodiacInfo.line; });
  document.querySelectorAll("[data-profile-level]").forEach((node) => { node.textContent = xp.level; });
  document.querySelectorAll("[data-profile-xp-current]").forEach((node) => { node.textContent = xp.current.toLocaleString("en-US"); });
  document.querySelectorAll("[data-profile-xp-goal]").forEach((node) => { node.textContent = xp.goal.toLocaleString("en-US"); });
  document.querySelectorAll("[data-profile-xp-needed]").forEach((node) => { node.textContent = xp.needed.toLocaleString("en-US"); });
  document.querySelectorAll("[data-profile-xp-percent]").forEach((node) => { node.textContent = `${xp.percent}%`; });
  document.querySelectorAll("[data-profile-verified-note]").forEach((node) => {
    node.textContent = xp.verified ? "Verified Member" : "Unlocks at Level 10";
  });
  document.querySelectorAll("[data-verified-badge]").forEach((node) => {
    node.hidden = !xp.verified;
    node.classList.toggle("is-unlocked", xp.verified);
  });
  document.querySelectorAll("[data-profile-xp-bar]").forEach((node) => {
    node.style.width = `${xp.percent}%`;
  });

  document.querySelectorAll("[data-avatar-choice]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.avatarChoice === state.profile.avatar);
  });

  renderConnectionStatus(liveBridge ? "Online" : "Offline");
}

function normalizeAvatarSex(value) {
  const sex = String(value || "").trim().toLowerCase();
  if (sex === "female" || sex === "woman") return "female";
  if (sex === "male" || sex === "man") return "male";
  return "";
}

function snapshotSuggestsSex(snapshot = {}) {
  if (!snapshot || typeof snapshot !== "object") return "";
  const hasMaleKeys = ["male.care.score", "male.care.dailyVitamin", "male.care.hair", "fitness.status"]
    .some((key) => snapshotValue(snapshot, key, "") !== "");
  if (hasMaleKeys) return "male";
  const hasFemaleKeys = ["cycle.status", "pregnancy.status", "selfCare.score", "birthControl.status"]
    .some((key) => snapshotValue(snapshot, key, "") !== "");
  if (hasFemaleKeys) return "female";
  return "";
}

function currentAvatarSex() {
  return normalizeAvatarSex(snapshotValue(state.lastSnapshot || {}, "sex", ""))
    || snapshotSuggestsSex(state.lastSnapshot || {})
    || normalizeAvatarSex(state.profile.sex);
}

function isFemaleAvatar() {
  return currentAvatarSex() === "female";
}

function isMaleAvatar() {
  return currentAvatarSex() === "male";
}

function hasKnownAvatarSex() {
  return currentAvatarSex() !== "";
}

function healthValue(keys, fallback = "") {
  const value = firstSnapshotValue(state.lastSnapshot || {}, Array.isArray(keys) ? keys : [keys], fallback);
  if (value === undefined || value === null || value === "" || value === "JSON_INVALID") return fallback;
  return value;
}

function healthPercentValue(keys, fallback = 0) {
  const raw = healthValue(keys, fallback);
  const number = Number(String(raw).replace("%", "").split("/")[0].trim());
  if (!Number.isFinite(number)) return `${fallback}%`;
  return `${Math.round(Math.max(0, Math.min(100, number)))}%`;
}

function healthIntegerValue(keys, fallback = 0) {
  const raw = healthValue(keys, fallback);
  const number = Number(String(raw).replace("%", "").split("/")[0].trim());
  if (!Number.isFinite(number)) return String(fallback);
  return String(Math.round(number));
}

function staminaValue() {
  return healthPercentValue(["fitness.stamina", "stamina.current", "male.fitness.stamina"], 100);
}

function staminaRankValue() {
  return titleCaseHealthValue(healthValue(["stamina.rank"], "Untrained"));
}

function healthRows(groups) {
  return groups.map((group) => ({
    title: group.title,
    rows: group.rows.map(([label, keys, fallback, formatter]) => {
      const value = typeof formatter === "function" ? formatter(keys, fallback) : healthValue(keys, fallback);
      return [label, value];
    })
  }));
}

function setSnapshotValue(key, value) {
  if (!state.lastSnapshot || typeof state.lastSnapshot !== "object") state.lastSnapshot = {};
  state.lastSnapshot[key] = value;
}

function scheduleHealthRefresh(reason = "health") {
  if (!liveBridge) return;
  window.setTimeout(() => sendBridge("health-sync"), 650);
  window.setTimeout(() => sendBridge("stats"), 900);
  setLastRefresh(`${reason} sync`);
}

function sendHealthCommand(command, label = command) {
  const cleanCommand = String(command || "").trim();
  if (!cleanCommand) return;
  sendBridge("health-command", cleanCommand);
  addLocalNotification("Health Updated", label || cleanCommand, "Health");
  scheduleHealthRefresh("health command");
}

function handleCycleAction(actionKey) {
  const action = cycleActions[actionKey];
  if (!action) return;
  if (action.opensPicker) {
    state.health.cycleLengthPickerOpen = true;
    renderHealthDetail("cycle", state.health.activeGroups.cycle || 0);
    return;
  }
  setSnapshotValue("cycle.status", action.status);
  setSnapshotValue("cycle.nextStep", action.nextStep);
  setSnapshotValue("cycle.lastAction", action.label);
  renderHealthDetail("cycle", state.health.activeGroups.cycle || 0);
  sendHealthCommand(action.command, action.label);
}

function handleCycleLengthAction(lengthKey) {
  const action = cycleLengthActions.find((item) => item.key === String(lengthKey));
  if (!action) return;
  state.health.cycleLengthPickerOpen = false;
  setSnapshotValue("cycle.status", "Active");
  setSnapshotValue("cycle.nextStep", "Track Care");
  setSnapshotValue("cycle.length", action.key);
  setSnapshotValue("cycle.lastAction", `Start ${action.label}`);
  renderHealthDetail("cycle", state.health.activeGroups.cycle || 0);
  sendHealthCommand(action.command, `Start ${action.label}`);
}

function cycleStatusKey() {
  return String(healthValue(["cycle.status"], "Inactive"))
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function visibleCycleActions() {
  const status = cycleStatusKey();
  if (status === "active") return ["pause", "stop"];
  if (status === "paused") return ["resume", "stop"];
  if (status === "inactive" || status === "none" || status === "") return ["start"];
  if (status === "pregnant" || status === "test needed") return [];
  return ["start"];
}

function renderKeyValueRows(target, rows) {
  if (!target) return;
  target.replaceChildren();
  rows.forEach(([label, value]) => {
    const row = document.createElement("p");
    row.innerHTML = "<span></span><strong></strong>";
    row.querySelector("span").textContent = label;
    row.querySelector("strong").textContent = String(value);
    target.append(row);
  });
}

function healthDetailGroups(section) {
  const xp = profileXp();
  const groups = {
    cycle: [
      { title: "Cycle Status", rows: [
        ["Status", ["cycle.status"], "Inactive"],
        ["Cycle Day", ["cycle.dayLabel", "cycle.day"], healthValue(["cycle.day"], "1") + " / " + healthValue(["cycle.length"], "28")],
        ["Phase", ["cycle.phase"], "None"],
        ["Risk", ["cycle.risk"], "NONE"],
        ["Next Step", ["cycle.nextStep"], "Start Cycle"]
      ] },
      { title: "Cycle Timing", rows: [
        ["Flow", ["cycle.flow"], "None"],
        ["Period Status", ["period.status", "cycle.periodStatus"], "Inactive"],
        ["Fertile Window", ["cycle.fertileWindow"], "Closed"],
        ["Ovulation", ["cycle.ovulation"], "No"],
        ["Pregnancy Status", ["pregnancy.status"], "Not Pregnant"],
        ["Next Period", ["cycle.nextPeriod"], "23 CDF days"],
        ["Next Ovulation", ["cycle.nextOvulation"], "8 CDF days"]
      ] },
      { title: "Cycle Care", rows: [
        ["Pad Status", ["cycle.padStatus", "pad.status"], "Not Needed"],
        ["Tampon Status", ["cycle.tamponStatus", "tampon.status"], "Not Needed"],
        ["Last Pad Used", ["cycle.lastPadUsed", "last.padUsed"], "None"],
        ["Last Tampon Used", ["cycle.lastTamponUsed", "last.tamponUsed"], "None"],
        ["Care Stat", ["cycle.care", "care.self"], "0", healthIntegerValue],
        ["Hygiene Stat", ["stat.hygiene"], state.stats.hygiene, healthIntegerValue],
        ["Next Change Timer", ["cycle.nextChangeTimer"], "None"],
        ["Care Item XP", ["cycle.careItemXP", "careItemXP"], "0"]
      ] },
      { title: "Cycle Relief", rows: [
        ["Nue Relief", ["nueRelief.name"], "Nue Relief"],
        ["Status", ["nueRelief.status"], "Period Only"],
        ["Taken", ["nueRelief.taken"], "None"],
        ["Ends", ["nueRelief.ends"], "0"],
        ["Need", ["nueRelief.need"], "Now"],
        ["Purpose", ["nueRelief.purpose"], "Used for cycle pain and cramps."],
        ["Effect", ["nueRelief.effect"], "Pain relief during period/cycle care."]
      ] }
    ],
    pregnancy: [
      { title: "Pregnancy Tab", rows: [
        ["Status", ["pregnancy.status"], "No active pregnancy."],
        ["Last Test", ["pregnancy.lastTest", "last.pregnancyTest"], "None"],
        ["Test Taken", ["pregnancy.testTaken"], "None"]
      ] },
      { title: "Pregnancy Care", rows: [
        ["Pregnancy Test", ["pregnancy.testAvailable"], "Available"],
        ["Prenatal Vitamin", ["pregnancy.prenatalVitamin"], "Not Taken"],
        ["Last Prenatal Vitamin", ["pregnancy.lastPrenatalVitamin", "last.prenatalVitamin"], "None"],
        ["Prenatal Care Status", ["pregnancy.prenatalCareStatus"], "None"]
      ] },
    ],
    selfCare: [
      { title: "Self Care Tab", rows: [
        ["Self Care", ["selfCare.score", "care.self"], 0, healthPercentValue],
        ["Status", ["selfCare.status"], "Needs Care"],
        ["Last Care", ["selfCare.lastCare", "care.lastCare"], "None"],
        ["Next Care Due", ["selfCare.nextDue", "care.nextDue"], "Now"]
      ] },
      { title: "Salon Services", rows: [
        ["Hair", ["selfCare.hair", "care.hair"], "Not Done"],
        ["Nails", ["selfCare.nails", "care.nails"], "Not Done"],
        ["Feet", ["selfCare.feet", "care.feet"], "Not Done"],
        ["Facial", ["selfCare.facial", "care.facial"], "Not Done"],
        ["Last Visit", ["selfCare.salonLastVisit", "care.salonLastVisit"], "None"],
        ["Next Due", ["selfCare.salonNextDue", "care.salonNextDue"], "Now"]
      ] },
      { title: "Body Care", rows: [
        ["Skin Care", ["selfCare.skinCare", "care.skinCare"], "Not Done"],
        ["Lotion", ["selfCare.lotion", "care.lotion"], "Not Used"],
        ["Last Used", ["selfCare.skinLastUsed", "care.skinLastUsed"], "None"],
        ["Product", ["selfCare.skinProduct", "care.skinProduct"], "None"],
        ["Hygiene", ["stat.hygiene"], state.stats.hygiene, healthPercentValue],
        ["Rest", ["stat.sleep"], state.stats.sleep, healthPercentValue],
        ["Stamina", ["fitness.stamina", "stamina.current"], 100, healthPercentValue],
        ["Stamina Strength", ["stamina.rank"], "Untrained"],
        ["Stamina Level", ["stamina.level"], "1"],
        ["Multivitamin", ["selfCare.multivitamin", "care.multivitamin"], "Not Taken"],
        ["Last Multivitamin", ["selfCare.lastMultivitamin", "last.multivitamin"], "None"],
        ["Need Multivitamin", ["selfCare.multivitaminNeed", "care.multivitaminNeed"], "Now"]
      ] }
    ],
    birthControl: [
      { title: "Birth Control Tab", rows: [
        ["Status", ["birthControl.status", "bc.status"], "Not Active"],
        ["Last Taken", ["birthControl.lastTaken", "last.bcTaken"], "None"],
        ["BC Time Left", ["birthControl.timeLeft", "bc.timeLeft"], "0"],
        ["Protected", ["birthControl.protected", "bc.protected"], "No"]
      ] }
    ],
    planB: [
      { title: "Plan B Tab", rows: [
        ["Plan B Zero", ["planB.name"], "Plan B Zero"],
        ["Pregnancy Status", ["pregnancy.status"], "Not Pregnant"],
        ["Times Taken", ["planB.timesTaken"], "0"],
        ["Last Taken", ["planB.lastTaken", "last.planBTaken"], "None"],
        ["Last Use Status", ["planB.lastUseStatus"], "None"]
      ] }
    ]
  };
  return healthRows(groups[section] || groups.cycle);
}

function renderHealthDetail(section = "cycle", groupIndex = state.health.activeGroups[section] || 0) {
  const panel = document.querySelector("[data-health-detail-panel]");
  const title = document.querySelector("[data-health-detail-title]");
  const purpose = document.querySelector("[data-health-detail-purpose]");
  const subnav = document.querySelector("[data-health-subsections]");
  const cycleActionBar = document.querySelector("[data-health-cycle-actions]");
  const target = document.querySelector("[data-health-detail]");
  const sectionKey = healthSectionLabels[section] ? section : "cycle";
  state.health.activeSection = sectionKey;
  if (panel) {
    panel.hidden = !state.health.detailOpen;
    panel.classList.toggle("is-open", state.health.detailOpen);
  }
  const groups = healthDetailGroups(sectionKey);
  const activeIndex = Math.min(Math.max(Number(groupIndex) || 0, 0), groups.length - 1);
  state.health.activeGroups[sectionKey] = activeIndex;
  if (title) title.textContent = healthSectionLabels[sectionKey] || healthSectionLabels.cycle;
  if (purpose) purpose.textContent = healthSectionPurposes[sectionKey] || healthSectionPurposes.cycle;
  if (subnav) {
    subnav.replaceChildren();
    subnav.hidden = groups.length <= 1;
    if (groups.length > 1) {
      groups.forEach((group, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.healthSubsection = String(index);
        button.dataset.healthSectionKey = sectionKey;
        button.classList.toggle("is-active", index === activeIndex);
        button.textContent = group.title.replace(/^Cycle /, "").replace(/ Tab$/, "");
        subnav.append(button);
      });
    }
  }
  if (cycleActionBar) {
    cycleActionBar.hidden = sectionKey !== "cycle";
    cycleActionBar.replaceChildren();
    if (sectionKey === "cycle") {
      const actions = visibleCycleActions();
      if (!actions.includes("start")) state.health.cycleLengthPickerOpen = false;
      cycleActionBar.classList.toggle("is-picker-open", state.health.cycleLengthPickerOpen);
      if (state.health.cycleLengthPickerOpen) {
        const label = document.createElement("span");
        label.className = "health-cycle-picker-label";
        label.textContent = "Choose cycle length";
        cycleActionBar.append(label);

        cycleLengthActions.forEach((action) => {
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.cycleLength = action.key;
          button.textContent = action.label;
          cycleActionBar.append(button);
        });

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.dataset.cycleLengthClose = "true";
        closeButton.textContent = "Close";
        cycleActionBar.append(closeButton);
      } else {
        cycleActionBar.dataset.cycleStatus = cycleStatusKey();
        actions.forEach((key) => {
          const action = cycleActions[key];
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.cycleAction = key;
          button.textContent = action.label;
          cycleActionBar.append(button);
        });
      }
    } else {
      cycleActionBar.classList.remove("is-picker-open");
    }
  }
  if (!target) return;
  target.replaceChildren();
  const group = groups[activeIndex] || groups[0];
  const article = document.createElement("section");
  article.className = "health-detail-group";
  article.classList.toggle("is-body-care", group.title === "Body Care");
  const heading = document.createElement("h3");
  heading.textContent = group.title;
  article.append(heading);
  const appendRow = (parent, [label, value]) => {
    const row = document.createElement("p");
    row.innerHTML = "<span></span><strong></strong>";
    row.querySelector("span").textContent = label;
    row.querySelector("strong").textContent = String(value);
    parent.append(row);
  };
  if (group.title === "Body Care") {
    const columns = document.createElement("div");
    const left = document.createElement("div");
    const right = document.createElement("div");
    columns.className = "health-detail-columns";
    left.className = "health-detail-column";
    right.className = "health-detail-column";
    group.rows.slice(0, 4).forEach((row) => appendRow(left, row));
    group.rows.slice(4).forEach((row) => appendRow(right, row));
    columns.append(left, right);
    article.append(columns);
  } else {
    group.rows.forEach((row) => appendRow(article, row));
  }
  target.append(article);
}

function maleHealthDetailRows(section) {
  const groups = {
    care: [
      ["Hygiene", ["stat.hygiene"], state.stats.hygiene, healthPercentValue],
      ["Daily Vitamin", ["male.care.dailyVitamin", "care.dailyVitamin", "selfCare.multivitamin"], "Not Taken"],
      ["Haircut / Hair Done", ["male.care.hair", "care.hair", "selfCare.hair"], "Not Done"],
      ["Last Care", ["male.care.lastCare", "care.lastCare", "selfCare.lastCare"], "None"],
      ["Next Care Due", ["male.care.nextDue", "care.nextDue", "selfCare.nextDue"], "Now"],
      ["Care XP", ["male.care.xp", "care.xp", "selfCare.careItemXP"], "0"]
    ],
    fitness: [
      ["Workout Status", ["fitness.status", "male.fitness.status"], "Inactive"],
      ["Last Workout", ["fitness.lastWorkout", "male.fitness.lastWorkout"], "None"],
      ["Workout Type", ["fitness.workoutType", "male.fitness.workoutType"], "None"],
      ["Stamina", ["fitness.stamina", "stamina.current", "male.fitness.stamina"], 100, healthPercentValue],
      ["Stamina Strength", ["stamina.rank"], "Untrained"],
      ["Stamina Level", ["stamina.level"], "1"],
      ["Stamina XP", ["stamina.xp"], "0"],
      ["Decay Resistance", ["stamina.decayResist"], "0"],
      ["Body Conditioning", ["fitness.bodyConditioning", "male.fitness.bodyConditioning"], "0"],
      ["Fitness XP", ["fitness.xp", "male.fitness.xp"], "0"],
      ["Last Gym Visit", ["fitness.lastGymVisit", "male.fitness.lastGymVisit"], "None"],
      ["Gym Machine Used", ["fitness.gymMachine", "male.fitness.gymMachine"], "None"],
      ["Workout Timer", ["fitness.workoutTimer", "male.fitness.workoutTimer"], "0"]
    ],
    records: [
      ["Last Vitamin Taken", ["records.lastVitamin", "male.records.lastVitamin", "male.care.lastVitamin"], "None"],
      ["Last Hair Service", ["records.lastHair", "male.records.lastHair", "male.care.lastHair"], "None"],
      ["Last Workout", ["records.lastWorkout", "male.records.lastWorkout", "fitness.lastWorkout"], "None"],
      ["Last Gym Visit", ["records.lastGymVisit", "male.records.lastGymVisit", "fitness.lastGymVisit"], "None"],
      ["Last Fitness XP", ["records.lastFitnessXP", "male.records.lastFitnessXP", "fitness.lastXP"], "0"]
    ]
  };
  return (groups[section] || groups.care).map(([label, keys, fallback, formatter]) => {
    const value = typeof formatter === "function" ? formatter(keys, fallback) : healthValue(keys, fallback);
    return [label, value];
  });
}

function maleCareScore() {
  const raw = healthValue(["male.care.score", "stat.care"], state.stats.care);
  const value = Number(String(raw).replace("%", "").split("/")[0].trim());
  if (!Number.isFinite(value)) return Math.round(Number(state.stats.care) || 0);
  return Math.max(0, Math.min(100, Math.round(value)));
}

function maleCareStatus(score) {
  if (score >= 90) return "Excellent *";
  if (score >= 70) return "Good";
  if (score >= 40) return "Needs Care";
  if (score >= 1) return "Low Care";
  return "Neglected";
}

function titleCaseHealthValue(value) {
  const text = String(value || "None").trim();
  if (!text || text.toLowerCase() === "none") return "None";
  return text.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function renderMaleHealthDetail(section = state.health.activeMaleSection || "care") {
  const key = maleHealthSectionLabels[section] ? section : "care";
  state.health.activeMaleSection = key;
  const title = document.querySelector("[data-male-health-title]");
  const purpose = document.querySelector("[data-male-health-purpose]");
  const target = document.querySelector("[data-male-health-detail]");
  if (title) title.textContent = maleHealthSectionLabels[key];
  if (purpose) purpose.textContent = maleHealthSectionPurposes[key];
  if (!target) return;
  target.replaceChildren();
  const article = document.createElement("section");
  article.className = "health-detail-group";
  const heading = document.createElement("h3");
  heading.textContent = maleHealthSectionLabels[key];
  article.append(heading);
  maleHealthDetailRows(key).forEach(([label, value]) => {
    const row = document.createElement("p");
    const normalizedValue = String(value).toLowerCase();
    row.innerHTML = "<span></span><strong></strong>";
    row.classList.toggle("is-good", label === "Hygiene" && normalizedValue === "good");
    row.classList.toggle("is-warning", ["not done", "not taken", "needs care", "now"].includes(normalizedValue));
    row.querySelector("span").textContent = label;
    row.querySelector("strong").textContent = String(value);
    article.append(row);
  });
  target.append(article);
}

function renderMaleHealth() {
  const care = maleCareScore();
  const activity = titleCaseHealthValue(healthValue(["health.lastActivity", "male.lastActivity", "fitness.lastWorkout"], "None"));
  const fitness = titleCaseHealthValue(healthValue(["fitness.status", "male.fitness.status"], "Ready"));
  renderKeyValueRows(document.querySelector("[data-male-health-summary]"), [
    ["Care", `${care}%`],
    ["Status", maleCareStatus(care)],
    ["Stamina", `${staminaValue()} ${staminaRankValue()}`],
    ["Fitness", fitness === "Inactive" ? "Ready" : fitness],
    ["Last Activity", activity]
  ]);

  const buttons = document.querySelector("[data-male-health-buttons]");
  if (buttons && !buttons.children.length) {
    Object.entries(maleHealthSectionLabels).forEach(([key, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.maleHealthSection = key;
      button.textContent = label;
      buttons.append(button);
    });
  }
  buttons?.querySelectorAll("[data-male-health-section]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.maleHealthSection === state.health.activeMaleSection);
  });
  renderMaleHealthDetail(state.health.activeMaleSection);
}

function renderHealth() {
  const female = isFemaleAvatar();
  const male = isMaleAvatar();
  const knownSex = hasKnownAvatarSex();
  const statusCard = document.querySelector("[data-health-status-card]");
  const statusTitle = document.querySelector("[data-health-status-title]");
  const statusMessage = document.querySelector("[data-health-status-message]");
  const grid = document.querySelector(".health-grid");

  if (statusCard) statusCard.hidden = (female || male) && !state.health.bridgeOffline;
  grid?.classList.toggle("is-male-health", male);
  grid?.classList.toggle("is-female-health", female);
  if (state.health.bridgeOffline || state.health.bridgeWaiting) {
    if (statusTitle) statusTitle.textContent = state.health.bridgeOffline ? "Health Bridge Offline" : "Checking Health Bridge";
    if (statusMessage) {
      statusMessage.textContent = state.health.bridgeOffline
        ? "The web HUD did not receive an LSL health-sync answer. Part 1 needs a working bridge URL."
        : "Asking Part 1 for the latest Neuro Server health snapshot.";
    }
  }
  if (!female && !male) {
    if (statusTitle) statusTitle.textContent = knownSex ? "Health Hidden" : "Loading Health";
    if (statusMessage) {
      statusMessage.textContent = knownSex
        ? "Health sections are hidden until avatar sex is Male or Female."
        : "Checking avatar profile. Health sections will appear when Neuro receives avatar sex.";
    }
  }

  document.querySelectorAll("[data-female-health]").forEach((node) => {
    if (node.matches("[data-health-detail-panel]")) node.hidden = !female || !state.health.detailOpen;
    else node.hidden = !female;
  });

  document.querySelectorAll("[data-male-health]").forEach((node) => {
    node.hidden = !male;
  });

  if (male) {
    renderMaleHealth();
    return;
  }

  if (!female) return;

  const buttons = document.querySelector("[data-health-section-buttons]");
  if (buttons && !buttons.children.length) {
    Object.entries(healthSectionLabels).forEach(([key, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.healthSection = key;
      button.textContent = label;
      buttons.append(button);
    });
  }
  buttons?.querySelectorAll("[data-health-section]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.healthSection === state.health.activeSection);
  });
  renderHealthDetail(state.health.activeSection || "cycle");
}

function renderConnectionStatus(status) {
  document.querySelectorAll("[data-profile-status], [data-bridge-status]").forEach((node) => {
    node.textContent = status;
    node.classList.toggle("is-online", status === "Online");
    node.classList.toggle("is-offline", status !== "Online");
  });
  document.querySelectorAll("[data-profile-status-light]").forEach((node) => {
    node.classList.toggle("is-online", status === "Online");
    node.classList.toggle("is-offline", status !== "Online");
    node.setAttribute("aria-label", status);
  });
}

function openProfileEditor() {
  const editor = document.querySelector("[data-profile-editor]");
  const form = document.querySelector("[data-profile-form]");
  if (!editor || !form) return;

  ["role", "name", "age", "sex", "location", "favoriteColor", "zodiac"].forEach((name) => {
    if (form.elements[name]) form.elements[name].value = state.profile[name] || "";
  });

  editor.hidden = false;
  renderProfile();
  window.setTimeout(() => {
    const first = form.elements.name || form.elements.role;
    if (first) {
      first.removeAttribute("readonly");
      first.focus({ preventScroll: true });
      first.select?.();
    }
  }, 80);
}

function closeProfileEditor() {
  const editor = document.querySelector("[data-profile-editor]");
  if (editor) editor.hidden = true;
}

function saveProfileFromForm(form) {
  const next = { ...state.profile };
  ["role", "name", "age", "sex", "location", "favoriteColor", "zodiac"].forEach((name) => {
    if (!form.elements[name]) return;
    const value = String(form.elements[name].value || "").trim();
    next[name] = value || state.profile[name];
  });

  state.profile = next;
  persistProfileLocal();
  renderProfile();
  if (liveBridge) sendBridge("profile-save", JSON.stringify(profileSavePayload()));
  addLocalNotification("Profile Saved", "Role and profile details were saved to the HUD server.", "Profile");
  closeProfileEditor();
}

function requestStoredProfile(force = false) {
  if (liveBridge && (force || state.perf.loaded.profile)) {
    sendBridge("profile-load");
    setLastRefresh("profile loaded");
  }
}

function handleProfileResponse(body) {
  if (!body.startsWith("PROFILE|")) return false;

  const payload = body.substring(8);
  if (!payload || payload === "{}") return true;

  try {
    applySavedProfile(JSON.parse(payload), true);
    persistProfileLocal();
    renderProfile();
    if (state.perf.loaded.health) renderHealth();
  } catch {
    logBridge("bad profile payload");
  }
  return true;
}

function timeAgo(time) {
  const seconds = Math.max(1, Math.round((Date.now() - Number(time || Date.now())) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function messageListDate(time) {
  const value = Number(time || 0);
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (startDate === startToday) {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  }
  if (startDate === startToday - 86400000) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { month: "numeric", day: "numeric", year: "2-digit" }).format(date);
}

function initialsFor(name) {
  const parts = String(name || "Resident").trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]).join("");
  return letters.toUpperCase() || "R";
}

function currentOwnerUuid() {
  return String(query.get("avatar") || snapshotValue(state.lastSnapshot, "ownerUuid", snapshotValue(state.lastSnapshot, "avatarUuid", "local-web-profile")));
}

function currentHandle() {
  return `@${String(state.profile.name || "you").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 18) || "you"}.sl`;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function postImageSrc(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isUuid(raw)) return `https://secondlife.com/app/image/${raw}/2`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return "";
}


function normalizeDmMessage(message, thread) {
  const now = Date.now();
  const rawTimestamp = Number(message?.timestamp || now);
  const timestamp = rawTimestamp > 0 && rawTimestamp < 100000000000 ? rawTimestamp * 1000 : rawTimestamp;
  return {
    message_id: String(message?.message_id || `msg-${now}-${Math.round(Math.random() * 10000)}`),
    sender_uuid: String(message?.sender_uuid || thread.participantUuid),
    receiver_uuid: String(message?.receiver_uuid || currentOwnerUuid()),
    sender_name: String(message?.sender_name || thread.participantName),
    receiver_name: String(message?.receiver_name || state.profile.name || "Neuro Resident"),
    message_text: String(message?.message_text || message?.text || ""),
    timestamp,
    read: message?.read === true || message?.read === 1 || message?.read === "1" || message?.read === "true"
  };
}

function normalizeDmThread(thread) {
  const participantUuid = String(thread.participantUuid || thread.participant_uuid || "unknown");
  const participantName = String(thread.participantName || thread.participant_name || thread.name || "Resident");
  const base = {
    threadId: String(thread.threadId || thread.thread_id || `dm-${participantUuid}`),
    avatar: String(thread.avatar || "01"),
    participantUuid,
    participantName,
    participantHandle: String(thread.participantHandle || thread.participant_handle || `@${participantUuid.slice(0, 8)}`)
  };
  const messages = Array.isArray(thread.messages) ? thread.messages : [];
  const normalizedMessages = messages
    .map((message) => normalizeDmMessage(message, base))
    .filter((message) => message.message_text)
    .sort((a, b) => a.timestamp - b.timestamp);
  const unread = normalizedMessages.filter((message) => !message.read && message.sender_uuid !== currentOwnerUuid()).length;
  return {
    ...base,
    unread: Math.max(0, Math.round(asNumber(thread.unread, unread))),
    messages: normalizedMessages
  };
}

function saveMessagesLocal() {
  try {
    localStorage.setItem("neuroMessages", JSON.stringify(state.messages.threads));
  } catch {
    logBridge("messages local save blocked");
  }
}

function loadMessagesLocal() {
  if (liveBridge) {
    state.messages.threads = [];
    return;
  }
  try {
    const saved = JSON.parse(localStorage.getItem("neuroMessages") || "[]");
    if (Array.isArray(saved) && saved.length) {
      state.messages.threads = saved.map(normalizeDmThread);
    } else {
      state.messages.threads = [];
    }
  } catch {
    state.messages.threads = [];
  }
}

function requestDmInbox(force = false) {
  if (!liveBridge || state.messages.loading) return;
  if (!force && state.messages.live) return;
  state.messages.loading = true;
  if (!state.messages.live) {
    state.messages.threads = [];
    if (state.perf.loaded.messages) renderMessageInbox();
    renderNotificationCount();
  }
  sendBridge("dm-inbox", JSON.stringify({ avatar_name: state.profile.name || "Neuro Resident" }));
  setLastRefresh("messages requested");
}

function startMessageRefresh() {
  if (!liveBridge) return;
  window.clearInterval(state.messages.refreshTimer);
  state.messages.refreshTimer = window.setInterval(() => {
    if (state.perf.activeTab !== "profile" || !state.perf.loaded.messages) return;
    requestDmInbox(true);
  }, 7000);
}

function stopMessageRefresh() {
  window.clearInterval(state.messages.refreshTimer);
  state.messages.refreshTimer = 0;
}

function handleDmResponse(body) {
  if (body.startsWith("DM_OFFLINE|")) {
    state.messages.loading = false;
    state.messages.offline = true;
    addLocalNotification("Messages Offline", "Neuro Messages server did not answer.", "System");
    if (state.perf.loaded.messages) renderMessageInbox();
    return true;
  }
  if (!body.startsWith("DM|")) return false;

  state.messages.loading = false;
  state.messages.offline = false;
  try {
    const previousUnread = state.messages.threads.reduce((total, thread) => total + Math.max(0, Math.round(asNumber(thread.unread, 0))), 0);
    const payload = body.substring(3) || "[]";
    const threads = JSON.parse(payload);
    state.messages.threads = Array.isArray(threads) ? threads.map(normalizeDmThread) : [];
    state.messages.live = true;
    const nextUnread = state.messages.threads.reduce((total, thread) => total + Math.max(0, Math.round(asNumber(thread.unread, 0))), 0);
    if (nextUnread > previousUnread) showNeura("You have a new message.", "message");
    saveMessagesLocal();
    if (state.perf.loaded.messages) {
      if (state.messages.activeThreadId && activeDmThread()) renderMessageThread();
      else renderMessageInbox();
    }
    renderNotificationCount();
  } catch {
    logBridge("bad messages payload");
  }
  return true;
}

function lastDmMessage(thread) {
  return thread.messages[thread.messages.length - 1] || null;
}

function sortedDmThreads() {
  return state.messages.threads
    .slice()
    .sort((a, b) => Number(lastDmMessage(b)?.timestamp || 0) - Number(lastDmMessage(a)?.timestamp || 0));
}

function activeDmThread() {
  return state.messages.threads.find((thread) => thread.threadId === state.messages.activeThreadId) || null;
}

function setMessagesTitle(text) {
  const title = document.querySelector(".messages-headbar span");
  if (title) title.textContent = text;
}

function renderMessageInbox() {
  if (!state.perf.loaded.messages || state.perf.activeTab !== "profile") return;
  const inbox = document.querySelector("[data-message-inbox]");
  const threadView = document.querySelector("[data-dm-thread]");
  const compose = document.querySelector("[data-dm-form]");
  const back = document.querySelector("[data-message-back]");
  const search = document.querySelector(".message-search");
  if (!inbox) return;

  state.messages.activeThreadId = "";
  setMessagesTitle("Messages");
  inbox.hidden = false;
  if (threadView) threadView.hidden = true;
  if (compose) compose.hidden = true;
  if (back) back.hidden = true;
  if (search) search.hidden = false;
  inbox.replaceChildren();

  const needle = state.messages.query.trim().toLowerCase();
  const threads = sortedDmThreads().filter((thread) => {
    if (!needle) return true;
    const last = lastDmMessage(thread);
    return [
      thread.participantName,
      thread.participantHandle,
      last?.message_text
    ].join(" ").toLowerCase().includes(needle);
  });

  threads.forEach((thread) => {
    const last = lastDmMessage(thread);
    const row = document.createElement("button");
    row.type = "button";
    row.className = thread.unread > 0 ? "dm-row is-unread" : "dm-row";
    row.dataset.messageThread = thread.threadId;
    row.innerHTML = `
      <span class="dm-avatar"><img alt=""><b></b></span>
      <span class="dm-row-copy">
        <header><strong></strong><time></time></header>
        <small></small>
      </span>
      <span class="dm-chevron" aria-hidden="true">›</span>
      <i hidden></i>`;
    const image = row.querySelector("img");
    image.src = avatarPath(thread.avatar);
    image.alt = thread.participantName;
    image.onerror = () => { image.hidden = true; };
    row.querySelector(".dm-avatar b").textContent = initialsFor(thread.participantName);
    row.querySelector("strong").textContent = thread.participantName;
    row.querySelector("time").textContent = last ? messageListDate(last.timestamp) : "";
    row.querySelector("small").textContent = last?.message_text || "Registered Neuro user. Start the conversation.";
    const unread = row.querySelector("i");
    if (thread.unread > 0) {
      unread.hidden = false;
      unread.textContent = thread.unread > 9 ? "9+" : String(thread.unread);
    }
    inbox.append(row);
  });

  if (!inbox.children.length) {
    const empty = document.createElement("article");
    empty.className = "dm-empty";
    if (state.messages.loading) {
      empty.innerHTML = "<strong>Checking Messages</strong><small>Asking the Neuro Messages server for live avatar chats.</small>";
    } else if (state.messages.offline) {
      empty.innerHTML = "<strong>Messages Server Offline</strong><small>The HUD is wired to the server, but the in-world message server did not answer yet.</small>";
    } else if (needle) {
      empty.innerHTML = "<strong>No Results</strong><small>No server conversations match that search.</small>";
    } else if (liveBridge && state.messages.live) {
      empty.innerHTML = "<strong>No Registered Contacts</strong><small>When another Neuro HUD user opens Profile, they will appear here from the message server.</small>";
    } else {
      empty.innerHTML = "<strong>Server Messages Only</strong><small>Open this HUD in Second Life to load live Neuro Messages.</small>";
    }
    inbox.append(empty);
  }
}

function unreadNotificationCount() {
  const dmCount = state.messages.threads.reduce((total, thread) => total + Math.max(0, Math.round(asNumber(thread.unread, 0))), 0);
  const localCount = state.notifications.items.filter((item) => !item.read).length;
  return dmCount + localCount + generatedStatNotifications().length;
}

function renderNotificationCount() {
  const count = unreadNotificationCount();
  document.querySelectorAll("[data-notification-count]").forEach((node) => {
    node.hidden = count <= 0;
    node.textContent = count > 9 ? "9+" : String(count);
  });
  document.querySelectorAll("[data-notification-button]").forEach((button) => {
    button.classList.toggle("has-alerts", count > 0);
    button.setAttribute("aria-label", count > 0 ? `${count} unread notifications` : "Notifications");
  });
  if (document.querySelector("[data-notification-menu]:not([hidden])")) renderNotificationMenu();
}

function renderNotificationMenu() {
  const list = document.querySelector("[data-notification-list]");
  if (!list) return;
  list.replaceChildren();

  const alertItems = [
    ...generatedStatNotifications(),
    ...state.notifications.items,
    ...sortedDmThreads().filter((thread) => thread.unread > 0).map((thread) => {
      const last = lastDmMessage(thread);
      return {
        id: thread.threadId,
        kind: "dm",
        avatar: "neura",
        assistant: true,
        category: "Message",
        title: "New Message",
        message: `${thread.participantName}: ${last?.message_text || "New private message."}`,
        timestamp: last?.timestamp || Date.now(),
        unread: thread.unread > 0
      };
    })
  ].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, 8);

  alertItems.forEach((alert) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = alert.unread === false || alert.read ? "notification-item" : "notification-item is-unread";
    if (alert.kind === "dm") item.dataset.notificationThread = alert.id;
    if (alert.kind === "local") item.dataset.notificationId = alert.id;
    item.innerHTML = `
      <img alt="">
      <span class="notification-copy">
        <header><em></em><strong></strong></header>
        <small></small>
      </span>
      <time></time>`;
    item.querySelector("img").src = alertImagePath(alert);
    item.querySelector("img").alt = alert.category || "Notification";
    item.querySelector("em").textContent = alert.category || "Update";
    item.querySelector("strong").textContent = alert.title || "Notification";
    item.querySelector("small").textContent = alert.message || "No details.";
    item.querySelector("time").textContent = alert.timestamp ? timeAgo(alert.timestamp) : "now";
    list.append(item);
  });

  if (!list.children.length) {
    const empty = document.createElement("article");
    empty.className = "notification-item";
    empty.innerHTML = "<span><strong>No Updates</strong><small>Nothing new right now.</small></span>";
    list.append(empty);
  }
}

function generatedStatNotifications() {
  return [
    ["hunger", "Hunger"],
    ["thirst", "Thirst"],
    ["sleep", "Sleep"],
    ["hygiene", "Hygiene"],
    ["energy", "Energy"],
    ["fun", "Fun"],
    ["care", "Care"]
  ].filter(([key]) => asNumber(state.stats[key], 100) < 50)
    .filter(([key]) => !state.notifications.dismissedStats.includes(`stat-${key}`))
    .map(([key, label]) => ({
      id: `stat-${key}`,
    kind: "stat",
    avatar: "neura",
    assistant: true,
    category: "Stats",
    title: `Neura: ${label} is low`,
    message: `${label} is at ${Math.round(asNumber(state.stats[key], 0))}%. Take care of it soon.`,
    timestamp: Date.now(),
    unread: true
  }));
}

function resetRecoveredStatDismissals() {
  const before = state.notifications.dismissedStats.join("|");
  state.notifications.dismissedStats = state.notifications.dismissedStats.filter((id) => {
    const key = id.replace("stat-", "");
    return asNumber(state.stats[key], 100) < 50;
  });
  if (before !== state.notifications.dismissedStats.join("|")) saveNotificationsLocal();
}

function compactSavedText(value, limit = 90) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
}

function compactSavedReceipt(receipt) {
  return {
    id: compactSavedText(receipt.id || `wallet-${Date.now()}`, 48),
    type: compactSavedText(receipt.type || "Transfer", 28),
    title: compactSavedText(receipt.title || "G-Coin transfer", 50),
    detail: compactSavedText(receipt.detail || "", 96),
    amount: compactSavedText(receipt.amount || "", 24),
    sender: compactSavedText(receipt.sender || state.profile.name || "You", 44),
    receiver: compactSavedText(receipt.receiver || "G-Coin", 44),
    direction: receipt.direction === "in" ? "in" : "out",
    time: Number(receipt.time || Date.now())
  };
}

function compactSavedNotification(item) {
  return {
    id: compactSavedText(item.id || `note-${Date.now()}`, 48),
    kind: compactSavedText(item.kind || "local", 16),
    avatar: compactSavedText(item.avatar || "01", 12),
    assistant: Boolean(item.assistant),
    category: compactSavedText(item.category || "System", 24),
    title: compactSavedText(item.title || "HUD Update", 42),
    message: compactSavedText(item.message || "", 90),
    timestamp: Number(item.timestamp || Date.now()),
    read: Boolean(item.read),
    unread: Boolean(item.unread)
  };
}

function webStatePayload() {
  return {
    settings: {
      activePanel: state.settings.activePanel,
      breadcrumbNotify: Boolean(state.settings.breadcrumbNotify),
      breadcrumbSilent: Boolean(state.settings.breadcrumbSilent),
      lastCommand: state.settings.lastCommand,
      updatedAt: state.settings.updatedAt
    },
    notifications: {
      items: state.notifications.items.slice(0, 8).map(compactSavedNotification),
      dismissedStats: state.notifications.dismissedStats
    },
    wallet: {
      receipts: state.wallet.receipts.slice(0, 4).map(compactSavedReceipt)
    },
    savedAt: Date.now()
  };
}

function applyWebState(saved) {
  if (!saved || typeof saved !== "object") return;
  if (saved.settings && typeof saved.settings === "object") {
    state.settings = {
      ...state.settings,
      ...saved.settings,
      breadcrumbNotify: saved.settings.breadcrumbNotify !== false,
      breadcrumbSilent: Boolean(saved.settings.breadcrumbSilent)
    };
  }
  const notifications = saved.notifications || {};
  if (Array.isArray(notifications.items)) {
    state.notifications.items = notifications.items
      .filter((item) => item && typeof item === "object")
      .slice(0, 8);
  }
  if (Array.isArray(notifications.dismissedStats)) {
    state.notifications.dismissedStats = notifications.dismissedStats;
  }
  if (Array.isArray(saved.wallet?.receipts)) {
    state.wallet.receipts = saved.wallet.receipts
      .filter((receipt) => receipt && typeof receipt === "object")
      .slice(0, 4);
    renderWalletReceipts();
  }
  renderNotificationCount();
  const menu = document.querySelector("[data-notification-menu]");
  if (menu && !menu.hidden) renderNotificationMenu();
}

function saveWebStateNow(reason = "manual", force = false) {
  if (!liveBridge) return;
  const payload = JSON.stringify(webStatePayload());
  if (!force && payload === state.webState.lastSaveHash) return;
  state.webState.lastSaveHash = payload;
  state.webState.lastSaveAt = Date.now();
  state.webState.dirty = false;
  sendBridge("memory-save", payload);
  setLastRefresh(`memory saved: ${reason}`);
}

function queueWebStateSave(reason = "change") {
  if (!liveBridge) return;
  state.webState.dirty = true;
  window.clearTimeout(state.webState.saveTimer);
  state.webState.saveTimer = window.setTimeout(() => {
    state.webState.saveTimer = 0;
    saveWebStateNow(reason);
  }, 350);
}

function requestWebState(force = false) {
  if (!liveBridge) return;
  if (!force && state.webState.liveLoaded) return;
  sendBridge("memory-load");
  setLastRefresh("memory loaded");
}

function startMemoryHeartbeat() {
  if (!liveBridge) return;
  window.clearInterval(state.webState.heartbeatTimer);
  state.webState.heartbeatTimer = window.setInterval(() => {
    if (state.webState.dirty) saveWebStateNow("heartbeat");
    sendBridge("memory-touch", JSON.stringify({
      activeTab: state.perf.activeTab,
      open: true,
      time: Date.now()
    }));
  }, 5000);
}

function syncHudOpen(reason = "open") {
  if (!liveBridge) return;
  requestWebState(true);
  requestStoredProfile(true);
  sendBridge("stats");
  sendBridge("wallet-balance");
  sendBridge("wallet-users");
  requestDmInbox(true);
  sendBridge("settings", reason);
  setLastRefresh(`hud open sync: ${reason}`);
}

function handleWebStateResponse(body) {
  if (!body.startsWith("WEB_STATE|")) return false;

  state.webState.liveLoaded = true;
  const payload = body.substring(10);
  if (!payload || payload === "{}") {
    saveNotificationsLocal(false);
    renderWalletReceipts();
    return true;
  }

  try {
    applyWebState(JSON.parse(payload));
    saveNotificationsLocal(false);
  } catch {
    logBridge("bad state payload");
  }
  return true;
}

function loadNotificationsLocal() {
  if (liveBridge) {
    state.notifications.items = [];
    state.notifications.dismissedStats = [];
    return;
  }
  try {
    const saved = JSON.parse(window.localStorage.getItem("neuroNotifications") || "[]");
    if (Array.isArray(saved)) {
      state.notifications.items = saved.slice(0, 8);
      state.notifications.dismissedStats = [];
      return;
    }
    state.notifications.items = Array.isArray(saved.items) ? saved.items.slice(0, 8) : [];
    state.notifications.dismissedStats = Array.isArray(saved.dismissedStats) ? saved.dismissedStats : [];
  } catch {
    window.localStorage.removeItem("neuroNotifications");
    state.notifications.items = [];
  }
}

function saveNotificationsLocal(syncHud = true) {
  try {
    window.localStorage.setItem("neuroNotifications", JSON.stringify({
      items: state.notifications.items.slice(0, 8),
      dismissedStats: state.notifications.dismissedStats
    }));
  } catch {
    logBridge("local notification cache blocked");
  }
  if (syncHud) saveWebStateNow("notification", true);
}

function addLocalNotification(title, message, category = "System") {
  state.notifications.items.unshift({
    id: `note-${Date.now()}`,
    kind: "local",
    avatar: "neura",
    assistant: true,
    category,
    title,
    message,
    timestamp: Date.now(),
    read: false,
    unread: true
  });
  state.notifications.items = state.notifications.items.slice(0, 8);
  saveNotificationsLocal();
  renderNotificationCount();
  showNeura(message || title, category.toLowerCase());
}

function setNotificationMenu(open) {
  const menu = document.querySelector("[data-notification-menu]");
  const button = document.querySelector("[data-notification-button]");
  if (!menu) return;
  menu.hidden = !open;
  if (button) button.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) setSettingsMenu(false);
  if (open) renderNotificationMenu();
}

function setSettingsMenu(open) {
  const menu = document.querySelector("[data-settings-menu]");
  const button = document.querySelector("[data-settings-button]");
  if (!menu) return;
  menu.hidden = !open;
  if (button) {
    button.classList.toggle("is-active", open);
    button.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (open) setNotificationMenu(false);
}

function toggleSettingsMenu() {
  const menu = document.querySelector("[data-settings-menu]");
  if (state.perf.activeTab === "settings") showScreen("home");
  setSettingsMenu(Boolean(menu?.hidden));
}

function toggleNotificationMenu() {
  const menu = document.querySelector("[data-notification-menu]");
  loadMessagesLocal();
  requestDmInbox(false);
  renderNotificationCount();
  setNotificationMenu(Boolean(menu?.hidden));
  if (liveBridge) sendBridge("notify");
}

function renderMessageThread() {
  const thread = activeDmThread();
  const inbox = document.querySelector("[data-message-inbox]");
  const threadView = document.querySelector("[data-dm-thread]");
  const compose = document.querySelector("[data-dm-form]");
  const back = document.querySelector("[data-message-back]");
  const search = document.querySelector(".message-search");
  if (!thread || !threadView) return;

  setMessagesTitle(thread.participantName);
  if (inbox) inbox.hidden = true;
  threadView.hidden = false;
  if (compose) compose.hidden = thread.participantUuid === "system";
  if (back) back.hidden = false;
  if (search) search.hidden = true;
  threadView.replaceChildren();

  thread.messages.forEach((message) => {
    const row = document.createElement("article");
    const mine = message.sender_uuid === currentOwnerUuid();
    row.className = mine ? "dm-message self" : "dm-message";
    row.innerHTML = "<header><strong></strong><time></time></header><p></p>";
    row.querySelector("strong").textContent = mine ? "You" : message.sender_name;
    row.querySelector("time").textContent = timeAgo(message.timestamp);
    row.querySelector("p").textContent = message.message_text;
    threadView.append(row);
  });
  threadView.scrollTop = threadView.scrollHeight;
}

function openMessageThread(threadId) {
  const thread = state.messages.threads.find((item) => item.threadId === threadId);
  if (!thread) return;
  state.messages.activeThreadId = thread.threadId;
  thread.unread = 0;
  thread.messages.forEach((message) => {
    if (message.sender_uuid !== currentOwnerUuid()) message.read = true;
  });
  saveMessagesLocal();
  renderMessageThread();
  renderNotificationCount();
  if (liveBridge) sendBridge("dm-read", JSON.stringify({ participant_uuid: thread.participantUuid }));
}

function closeMessageThread() {
  state.messages.activeThreadId = "";
  renderMessageInbox();
}

function sendPrivateMessage(text) {
  const thread = activeDmThread();
  if (!thread || thread.participantUuid === "system") return;
  const message = normalizeDmMessage({
    message_id: `msg-${Date.now()}-${Math.round(Math.random() * 10000)}`,
    sender_uuid: currentOwnerUuid(),
    receiver_uuid: thread.participantUuid,
    sender_name: state.profile.name || "Neuro Resident",
    receiver_name: thread.participantName,
    message_text: text,
    timestamp: Date.now(),
    read: true
  }, thread);
  thread.messages.push(message);
  saveMessagesLocal();
  renderMessageThread();
  renderNotificationCount();
  if (liveBridge) {
    sendBridge("dm-send", JSON.stringify({ thread_id: thread.threadId, ...message }));
    window.setTimeout(() => requestDmInbox(true), 900);
    setLastRefresh("message sent");
  }
}

function openNotifications() {
  loadMessagesLocal();
  toggleNotificationMenu();
}

function clearNotificationThread(threadId) {
  const thread = state.messages.threads.find((item) => item.threadId === threadId);
  if (!thread) return;
  thread.unread = 0;
  thread.messages.forEach((message) => {
    if (message.sender_uuid !== currentOwnerUuid()) message.read = true;
  });
  saveMessagesLocal();
  renderNotificationCount();
  if (liveBridge) sendBridge("dm-read", JSON.stringify({ participant_uuid: thread.participantUuid }));
}

function clearAllNotifications() {
  state.messages.threads.forEach((thread) => {
    thread.unread = 0;
    thread.messages.forEach((message) => {
      if (message.sender_uuid !== currentOwnerUuid()) message.read = true;
    });
  });
  state.notifications.items = [];
  state.notifications.dismissedStats = ["hunger", "thirst", "sleep", "hygiene", "energy", "fun", "care"]
    .filter((key) => asNumber(state.stats[key], 100) < 50)
    .map((key) => `stat-${key}`);
  saveNotificationsLocal();
  saveMessagesLocal();
  renderNotificationCount();
  renderNotificationMenu();
  if (liveBridge) {
    state.messages.threads.forEach((thread) => {
      sendBridge("dm-read", JSON.stringify({ participant_uuid: thread.participantUuid }));
    });
  }
}

function loadHome() {
  if (state.perf.loaded.home) return;
  state.perf.loaded.home = true;
  renderStats(state.stats);
  renderBodyStatus(state.stats);
}

function loadProfile() {
  state.perf.loaded.profile = true;
  state.perf.loaded.messages = true;
  renderProfile();
  loadMessagesLocal();
  requestDmInbox(true);
  startMessageRefresh();
  if (state.messages.activeThreadId) renderMessageThread();
  else renderMessageInbox();
  renderNotificationCount();
  if (liveBridge) {
    sendBridge("stats");
    setLastRefresh("profile xp requested");
  }
  requestStoredProfile();
}

function loadWallet() {
  state.perf.loaded.wallet = true;
  renderWallet();
  requestWalletBalance();
  startWalletRefresh();
}

function loadHealth() {
  state.perf.loaded.health = true;
  renderHealth();
  requestStoredProfile(true);
  if (liveBridge) {
    state.health.bridgeWaiting = !hasKnownAvatarSex();
    state.health.bridgeOffline = false;
    sendBridge("health-sync");
    sendBridge("stats");
    setLastRefresh("health requested");
  }
}

function loadSettings() {
  state.perf.loaded.settings = true;
  renderPerfDebug();
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("is-active", screen.id === `screen-${name}`);
  });

  document.querySelectorAll("[data-screen-target]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screenTarget === name);
  });

  document.querySelector(".hud-shell")?.setAttribute("data-screen", name);
  state.perf.activeTab = name;
  if (name === "home") loadHome();
  if (name === "profile") loadProfile();
  if (name === "wallet") loadWallet();
  if (name !== "wallet") stopWalletRefresh();
  if (name === "health") loadHealth();
  if (name === "settings") loadSettings();
  if (name !== "profile") stopMessageRefresh();
  renderPerfDebug();
}

function toggleBalance(name) {
  state.hiddenBalances[name] = !state.hiddenBalances[name];
  const balance = document.querySelector(`[data-balance="${name}"]`);
  if (!balance) return;
  balance.textContent = state.hiddenBalances[name] ? "GC ----" : balance.dataset.original || balance.textContent;
  if (!balance.dataset.original && balance.textContent !== "GC ----") {
    balance.dataset.original = balance.textContent;
  }
  renderWallet();
}

function walletTransferPayload() {
  const type = document.querySelector("[data-wallet-transfer-type]")?.value || "checking-savings";
  const amount = Number.parseInt(document.querySelector("[data-wallet-amount]")?.value || "0", 10);
  const label = {
    "checking-savings": "Checking to Savings",
    "savings-checking": "Savings to Checking",
    "checking-user": "Checking to User"
  }[type] || "Transfer";
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a GC amount greater than 0." };
  }

  if (type === "checking-user") {
    if (!state.wallet.selectedUser?.id) return { error: "Choose a G-Coin user first." };
    return {
      type,
      label,
      from: "checking",
      to: "user",
      target: state.wallet.selectedUser.id,
      targetName: walletUserLabel(state.wallet.selectedUser),
      amount
    };
  }

  if (type === "savings-checking") {
    return { type, label, from: "savings", to: "checking", amount };
  }

  return { type, label, from: "checking", to: "savings", amount };
}

function walletAccountLabel(account, fallback = "") {
  if (account === "checking") return "Checking";
  if (account === "savings") return "Savings";
  if (account === "user") return fallback || "G-Coin User";
  return fallback || account || "G-Coin";
}

function clearWalletTransferFields() {
  const amount = document.querySelector("[data-wallet-amount]");
  const search = document.querySelector("[data-wallet-user-search]");
  if (amount) amount.value = "";
  if (search) search.value = "";
  state.wallet.selectedUser = null;
  state.wallet.userPickerOpen = false;
  renderWalletUsers();
}

function submitWalletTransfer() {
  const payload = walletTransferPayload();
  if (payload.error) {
    state.wallet.transferStatus = payload.error;
    renderWalletTransferStatus();
    return;
  }

  state.wallet.transferStatus = "Transfer sent to G-Coin server. Waiting for receipt.";
  state.wallet.pendingTransfer = payload;
  renderWalletTransferStatus();
  sendBridge("wallet-transfer", JSON.stringify(payload));
  setLastRefresh("wallet transfer");
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
    care: "#icon-stat-care"
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
  });
}

function asNumber(value, fallback = 0) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampStat(value) {
  return Math.max(0, Math.min(100, Math.round(asNumber(value))));
}

function asBoolean(value, fallback = false) {
  if (value === true || value === false) return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(text)) return true;
  if (["0", "false", "no", "n", "off"].includes(text)) return false;
  return fallback;
}

function snapshotValue(snapshot, key, fallback = "") {
  if (!snapshot || !(key in snapshot)) return fallback;
  const value = snapshot[key];
  return value === undefined || value === null || value === "" ? fallback : value;
}

function firstSnapshotValue(snapshot, keys, fallback = "") {
  for (const key of keys) {
    const value = snapshotValue(snapshot, key, undefined);
    if (value !== undefined) return value;
  }
  return fallback;
}

function profileXpFromSnapshot(snapshot) {
  const rawXp = firstSnapshotValue(snapshot, [
    "xp",
    "totalXp",
    "totalXP",
    "xp.total",
    "profile.xp",
    "xpCurrent",
    "currentXp",
    "currentXP",
    "NEURON_XP"
  ], state.profile.xpCurrent);
  const perLevel = Math.max(1, Math.round(asNumber(firstSnapshotValue(snapshot, [
    "xpPerLevel",
    "xp.perLevel",
    "xpLevelSize",
    "levelXp",
    "levelXP"
  ], state.profile.xpPerLevel || 2500), 2500)));
  const totalXp = Math.max(0, Math.round(asNumber(rawXp, state.profile.xpCurrent)));
  const rawLevel = firstSnapshotValue(snapshot, [
    "level",
    "xpLevel",
    "profile.level",
    "stat.level"
  ], Math.floor(totalXp / perLevel));
  const level = Math.max(0, Math.round(asNumber(rawLevel, Math.floor(totalXp / perLevel))));
  const fallbackNext = (level + 1) * perLevel;
  const goal = Math.max(1, Math.round(asNumber(firstSnapshotValue(snapshot, [
    "xpNext",
    "nextXp",
    "nextXP",
    "xp.next",
    "xpGoal",
    "xp.goal",
    "profile.xpNext"
  ], fallbackNext), fallbackNext)));
  const verifiedRaw = firstSnapshotValue(snapshot, [
    "verified",
    "isVerified",
    "profile.verified",
    "memberVerified",
    "verifiedMember"
  ], level >= 10 ? "1" : "0");

  return {
    level,
    xpCurrent: totalXp,
    xpGoal: goal,
    xpPerLevel: perLevel,
    verified: asBoolean(verifiedRaw, level >= 10)
  };
}

function statsFromSnapshot(snapshot) {
  const hygiene = clampStat(snapshotValue(snapshot, "stat.hygiene", state.stats.hygiene));
  const sleep = clampStat(snapshotValue(snapshot, "stat.sleep", state.stats.sleep));
  const energy = clampStat(snapshotValue(snapshot, "stat.energy", state.stats.energy));
  const careFallback = Math.round((hygiene + sleep + energy) / 3);
  const careValue = firstSnapshotValue(snapshot, [
    "stat.care",
    "care",
    "careScore",
    "neuroCare",
    "stat.neuroCare",
    "health.care",
    "healthCare",
    "stat.health",
    "health",
    "wellness",
    "stat.wellness",
    "medical",
    "stat.medical"
  ], careFallback);
  return {
    hunger: clampStat(snapshotValue(snapshot, "stat.hunger", state.stats.hunger)),
    thirst: clampStat(snapshotValue(snapshot, "stat.thirst", state.stats.thirst)),
    sleep,
    hygiene,
    energy,
    fun: clampStat(snapshotValue(snapshot, "stat.fun", state.stats.fun)),
    care: clampStat(careValue)
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

function notifyNeuraForStats(previousStats, nextStats) {
  const watched = [
    ["hunger", "Hunger"],
    ["thirst", "Thirst"],
    ["sleep", "Sleep"],
    ["hygiene", "Hygiene"],
    ["energy", "Energy"],
    ["fun", "Fun"],
    ["care", "Care"]
  ];
  const lows = watched
    .map(([key, label]) => [key, label, clampStat(nextStats[key])])
    .filter(([, , value]) => value < 50)
    .sort((a, b) => a[2] - b[2]);
  if (!lows.length) {
    state.neura.lastStatSignature = "";
    return;
  }

  const [key, label, value] = lows[0];
  const previous = clampStat(previousStats?.[key] ?? 100);
  const signature = `${key}:${Math.floor(value / 10)}`;
  if (signature === state.neura.lastStatSignature && previous < 50) return;
  state.neura.lastStatSignature = signature;
  showNeura(`${label} is at ${value}%. I need you to handle that.`, value <= 25 ? "critical" : "stats");
}

function renderStats(stats) {
  const previousStats = { ...state.stats };
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
  notifyNeuraForStats(previousStats, state.stats);
  if (state.perf.loaded.health) renderHealth();
}

function applyProfileSnapshot(snapshot) {
  if (state.profile.savedInHud) return;

  const updates = {
    role: snapshotValue(snapshot, "role", snapshotValue(snapshot, "title", state.profile.role)) || state.profile.role,
    name: snapshotValue(snapshot, "displayName", state.profile.name) || state.profile.name,
    age: snapshotValue(snapshot, "age", state.profile.age) || state.profile.age,
    sex: snapshotValue(snapshot, "sex", state.profile.sex) || state.profile.sex,
    location: snapshotValue(snapshot, "location", state.profile.location) || state.profile.location
  };

  state.profile = { ...state.profile, ...updates };
  renderProfile();
  if (state.perf.loaded.health) renderHealth();
}

function applyXpSnapshot(snapshot) {
  state.profile = { ...state.profile, ...profileXpFromSnapshot(snapshot) };
  renderProfile();
  if (state.perf.loaded.health) renderHealth();
}

function applySnapshot(snapshot) {
  if (!snapshot || snapshot.token !== "CDF_WORLD_V1") return;
  const mergedSnapshot = { ...(state.lastSnapshot || {}), ...snapshot };
  state.lastSnapshot = mergedSnapshot;
  renderStats(statsFromSnapshot(mergedSnapshot));
  resetRecoveredStatDismissals();
  applyProfileSnapshot(mergedSnapshot);
  applyXpSnapshot(mergedSnapshot);
}

function handleStatsResponse(body) {
  let payload = body;
  if (payload.startsWith("STATS|")) payload = payload.substring(6);
  if (payload.startsWith("HEALTH|")) payload = payload.substring(7);
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
    renderPerfDebug();
    return;
  }

  const detail = document.querySelector("[data-body-status-detail]");
  if (detail) detail.textContent = "SYNCING";
  sendBridge("stats");
  state.perf.statsTimer = perfInterval("live stats", () => {
    sendBridge("stats");
    setLastRefresh("stats requested");
  }, 12000);
  setLastRefresh("stats requested");
  renderPerfDebug();
}

function setupClock() {
  const clock = document.querySelector("#slt-clock");
  if (!clock) return;
  const hourNode = clock.querySelector("[data-clock-hour]");
  const minuteNode = clock.querySelector("[data-clock-minute]");

  function tick() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).formatToParts(now);
    const hour = parts.find((part) => part.type === "hour")?.value || "12";
    const minute = parts.find((part) => part.type === "minute")?.value || "00";
    const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value || "";
    const minuteKey = `${hour}:${minute}`;
    const hourNoticeKey = `${hour}-${dayPeriod}-${now.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })}`;

    if (hourNode) hourNode.textContent = hour;
    if (minuteNode) {
      if (state.clock.lastMinuteKey && state.clock.lastMinuteKey !== minuteKey) {
        state.clock.minuteToneIndex = (state.clock.minuteToneIndex + 1) % 6;
        minuteNode.classList.add("is-ticking");
        window.setTimeout(() => minuteNode.classList.remove("is-ticking"), 220);
      }
      minuteNode.textContent = minute;
      minuteNode.classList.remove("minute-tone-0", "minute-tone-1", "minute-tone-2", "minute-tone-3", "minute-tone-4", "minute-tone-5");
      minuteNode.classList.add(`minute-tone-${state.clock.minuteToneIndex}`);
    }
    state.clock.lastMinuteKey = minuteKey;
    if (minute === "00" && state.clock.lastHourNoticeKey !== hourNoticeKey) {
      state.clock.lastHourNoticeKey = hourNoticeKey;
      showNeura(`CDF time is ${hour}:00 ${dayPeriod}.`, "time");
    }

    const delay = Math.max(800, 61000 - (now.getSeconds() * 1000) - now.getMilliseconds());
    state.perf.clockTimer = perfTimeout("clock", tick, delay);
  }

  tick();
}

document.addEventListener("pointerdown", (event) => {
  const field = event.target.closest("[data-profile-form] input, [data-profile-form] select, [data-profile-form] textarea");
  if (field) event.stopPropagation();
}, true);

document.addEventListener("keydown", (event) => {
  const field = event.target.closest("[data-profile-form] input, [data-profile-form] select, [data-profile-form] textarea");
  if (field) event.stopPropagation();
}, true);

document.addEventListener("click", (event) => {
  const editOpen = event.target.closest("[data-profile-edit-open]");
  if (editOpen) {
    openProfileEditor();
    return;
  }

  const editClose = event.target.closest("[data-profile-edit-close]");
  if (editClose) {
    closeProfileEditor();
    return;
  }

  const avatarChoice = event.target.closest("[data-avatar-choice]");
  if (avatarChoice) {
    state.profile.avatar = avatarChoice.dataset.avatarChoice;
    renderProfile();
    return;
  }

  const screenButton = event.target.closest("[data-screen-target]");
  if (screenButton) {
    showScreen(screenButton.dataset.screenTarget);
    return;
  }

  const masterRefreshButton = event.target.closest("[data-master-refresh]");
  if (masterRefreshButton) {
    masterRefresh(masterRefreshButton);
    return;
  }

  const settingsButton = event.target.closest("[data-settings-button]");
  if (settingsButton) {
    toggleSettingsMenu();
    return;
  }

  const healthSectionButton = event.target.closest("[data-health-section]");
  if (healthSectionButton) {
    const section = healthSectionButton.dataset.healthSection || "cycle";
    state.health.activeSection = healthSectionLabels[section] ? section : "cycle";
    state.health.detailOpen = true;
    document.querySelectorAll("[data-health-section]").forEach((button) => {
      button.classList.toggle("is-active", button === healthSectionButton);
    });
    renderHealthDetail(state.health.activeSection);
    return;
  }

  const healthDetailClose = event.target.closest("[data-health-detail-close]");
  if (healthDetailClose) {
    state.health.detailOpen = false;
    state.health.cycleLengthPickerOpen = false;
    renderHealthDetail(state.health.activeSection || "cycle");
    return;
  }

  const maleHealthButton = event.target.closest("[data-male-health-section]");
  if (maleHealthButton) {
    state.health.activeMaleSection = maleHealthButton.dataset.maleHealthSection || "care";
    renderMaleHealth();
    return;
  }

  const healthSubsectionButton = event.target.closest("[data-health-subsection]");
  if (healthSubsectionButton) {
    const section = healthSubsectionButton.dataset.healthSectionKey || document.querySelector("[data-health-section].is-active")?.dataset.healthSection || "cycle";
    renderHealthDetail(section, Number(healthSubsectionButton.dataset.healthSubsection));
    return;
  }

  const cycleActionButton = event.target.closest("[data-cycle-action]");
  if (cycleActionButton) {
    handleCycleAction(cycleActionButton.dataset.cycleAction);
    return;
  }

  const cycleLengthButton = event.target.closest("[data-cycle-length]");
  if (cycleLengthButton) {
    handleCycleLengthAction(cycleLengthButton.dataset.cycleLength);
    return;
  }

  const cycleLengthClose = event.target.closest("[data-cycle-length-close]");
  if (cycleLengthClose) {
    state.health.cycleLengthPickerOpen = false;
    renderHealthDetail("cycle", state.health.activeGroups.cycle || 0);
    return;
  }

  const notifyButton = event.target.closest("[data-command='notify']");
  if (notifyButton) {
    openNotifications();
    return;
  }

  const notificationClose = event.target.closest("[data-notification-close]");
  if (notificationClose) {
    setNotificationMenu(false);
    return;
  }

  const notificationClear = event.target.closest("[data-notification-clear]");
  if (notificationClear) {
    clearAllNotifications();
    return;
  }

  const notificationThread = event.target.closest("[data-notification-thread]");
  if (notificationThread) {
    clearNotificationThread(notificationThread.dataset.notificationThread);
    renderNotificationMenu();
    return;
  }

  const notificationItem = event.target.closest("[data-notification-id]");
  if (notificationItem) {
    const item = state.notifications.items.find((entry) => entry.id === notificationItem.dataset.notificationId);
    if (item) {
      item.read = true;
      item.unread = false;
      saveNotificationsLocal();
      renderNotificationCount();
      renderNotificationMenu();
    }
    return;
  }

  if (!event.target.closest("[data-notification-menu]")) {
    setNotificationMenu(false);
  }

  const settingsClose = event.target.closest("[data-settings-close]");
  if (settingsClose) {
    setSettingsMenu(false);
    return;
  }

  const settingsItem = event.target.closest("[data-settings-item]");
  if (settingsItem) {
    const section = settingsItem.dataset.settingsItem || "";
    state.settings.activePanel = section;
    state.settings.lastCommand = `settings:${section}`;
    state.settings.updatedAt = Date.now();
    sendBridge("settings", section);
    saveWebStateNow("settings", true);
    setLastRefresh(settingsItem.textContent.trim());
    setSettingsMenu(false);
    return;
  }

  const breadcrumbCommand = event.target.closest("[data-breadcrumb-command]");
  if (breadcrumbCommand) {
    const command = breadcrumbCommand.dataset.breadcrumbCommand;
    if (command === "live on") state.settings.breadcrumbNotify = true;
    if (command === "live off") state.settings.breadcrumbNotify = false;
    if (command === "silent on") state.settings.breadcrumbSilent = true;
    if (command === "silent off") state.settings.breadcrumbSilent = false;
    state.settings.activePanel = "notifications";
    state.settings.lastCommand = `breadcrumb:${command}`;
    state.settings.updatedAt = Date.now();
    sendBridge("breadcrumb", command);
    addLocalNotification("Breadcrumb Settings", breadcrumbCommand.textContent.trim(), "Settings");
    saveWebStateNow("breadcrumb settings", true);
    setLastRefresh(`breadcrumb ${command}`);
    setSettingsMenu(false);
    return;
  }

  if (!event.target.closest("[data-settings-menu]")) {
    setSettingsMenu(false);
  }

  const walletUserOpen = event.target.closest("[data-wallet-user-open]");
  if (walletUserOpen) {
    openWalletUserPicker();
    return;
  }

  const walletUserClose = event.target.closest("[data-wallet-user-close]");
  if (walletUserClose) {
    closeWalletUserPicker();
    return;
  }

  const walletUserModal = event.target.closest("[data-wallet-user-modal]");
  if (walletUserModal && event.target === walletUserModal) {
    closeWalletUserPicker();
    return;
  }

  const walletUserButton = event.target.closest("[data-wallet-user]");
  if (walletUserButton) {
    const id = walletUserButton.dataset.walletUser;
    state.wallet.selectedUser = state.wallet.users.find((user) => user.id === id) || null;
    state.wallet.transferStatus = state.wallet.selectedUser ? `Sending to ${walletUserLabel(state.wallet.selectedUser)}.` : "Choose a G-Coin user first.";
    state.wallet.userPickerOpen = false;
    renderWallet();
    return;
  }

  const commandButton = event.target.closest("[data-command]");
  if (commandButton) {
    sendBridge(commandButton.dataset.command);
    return;
  }

  const messageRow = event.target.closest("[data-message-thread]");
  if (messageRow) {
    openMessageThread(messageRow.dataset.messageThread);
    return;
  }

  const messageBack = event.target.closest("[data-message-back]");
  if (messageBack) {
    closeMessageThread();
    return;
  }

  const walletRefresh = event.target.closest("[data-wallet-refresh]");
  if (walletRefresh) {
    requestWalletBalance();
    return;
  }

  const eyeButton = event.target.closest("[data-wallet-eye]");
  if (eyeButton) {
    toggleBalance(eyeButton.dataset.walletEye);
    return;
  }
});

document.addEventListener("submit", (event) => {
  const walletForm = event.target.closest("[data-wallet-transfer-form]");
  if (walletForm) {
    event.preventDefault();
    submitWalletTransfer();
    return;
  }

  const profileForm = event.target.closest("[data-profile-form]");
  if (profileForm) {
    event.preventDefault();
    saveProfileFromForm(profileForm);
    return;
  }

  const dmForm = event.target.closest("[data-dm-form]");
  if (dmForm) {
    event.preventDefault();
    const input = dmForm.elements.message;
    const text = String(input?.value || "").trim();
    if (text) sendPrivateMessage(text);
    if (input) input.value = "";
  }
});

document.addEventListener("input", (event) => {
  const walletType = event.target.closest("[data-wallet-transfer-type]");
  if (walletType) {
    state.wallet.selectedUser = null;
    state.wallet.userPickerOpen = false;
    if (walletType.value === "checking-user") sendBridge("wallet-users");
    renderWalletUsers();
    return;
  }

  const walletUserSearch = event.target.closest("[data-wallet-user-search]");
  if (walletUserSearch) {
    if (!state.wallet.users.length) sendBridge("wallet-users");
    renderWalletUsers();
    return;
  }

  const search = event.target.closest("[data-message-search]");
  if (!search) return;
  state.messages.query = String(search.value || "");
  renderMessageInbox();
});

document.addEventListener("change", (event) => {
  const walletType = event.target.closest("[data-wallet-transfer-type]");
  if (!walletType) return;
  state.wallet.selectedUser = null;
  state.wallet.userPickerOpen = false;
  if (walletType.value === "checking-user") sendBridge("wallet-users");
  renderWalletUsers();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveWebStateNow("visibility hidden", true);
  else syncHudOpen("visible");
});

window.addEventListener("pagehide", () => {
  saveWebStateNow("pagehide", true);
});

window.addEventListener("beforeunload", () => {
  saveWebStateNow("beforeunload", true);
});

window.addEventListener("message", (event) => {
  const data = String(event.data || "");
  if (!data.startsWith("NEURO_GATEWAY_ACK|")) return;
  renderConnectionStatus("Online");
  const parts = data.split("|");
  const tick = parts[1] || "ack";
  const status = parts[2] || "?";
  const body = parts.slice(3).join("|");
  const op = pendingBridge.get(tick) || tick;
  pendingBridge.delete(tick);
  if (op === "health-sync") {
    state.health.bridgeWaiting = false;
    state.health.bridgeOffline = false;
  }
  if (op !== "stats") logBridge(`${op}: LSL ${status} ${body}`);
  if (handleWebStateResponse(body)) return;
  if (handleProfileResponse(body)) return;
  if (handleWalletResponse(body)) return;
  if (handleDmResponse(body)) return;
  if (body.startsWith("STATS|") || body.startsWith("HEALTH|") || body.startsWith("{") || body.startsWith("NO_STATS")) {
    handleStatsResponse(body);
  }
});

setupStats();
applyBridgeIdentityDefaults();
loadSavedProfile();
loadMessagesLocal();
loadNotificationsLocal();
renderNotificationCount();
setupClock();
loadHome();
startLiveStats();
startMemoryHeartbeat();
syncHudOpen("startup");
renderPerfDebug();
