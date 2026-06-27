const BRIDGE_PREFIX = "NEURO_GATEWAY|";
const query = new URLSearchParams(window.location.search);
const liveBridge = query.get("bridge") === "sl";
const pendingBridge = new Map();

const state = {
  hiddenBalances: {
    checking: false,
    savings: false
  },
  wallet: {
    checking: null,
    savings: null,
    live: false,
    retryTimer: 0
  },
  profile: {
    title: "Resident",
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
    savedInHud: false
  },
  feed: {
    posts: [
      {
        id: "neuro-post-eden-palms-001",
        ownerUuid: "7e0c6dd7-681b-4a28-9d60-293f7623b201",
        name: "Jade Rain",
        handle: "@jaderain.sl",
        avatar: "03",
        message: "Sunset over Eden Palms never gets old. Grateful for this view.",
        imageUrl: "",
        createdAt: Date.now() - 12 * 60 * 1000,
        likes: 24,
        comments: 6,
        reposts: 3,
        liked: false,
        reposted: false
      },
      {
        id: "neuro-post-update-002",
        ownerUuid: "0d6b4a61-393b-43c9-9f96-8e6bc7858d12",
        name: "Kai Mercer",
        handle: "@kaimercer.sl",
        avatar: "07",
        message: "Neuro Tec HUD v2.3 is live. Smooth performance and new wallet tools.",
        imageUrl: "",
        createdAt: Date.now() - 45 * 60 * 1000,
        likes: 37,
        comments: 12,
        reposts: 8,
        liked: false,
        reposted: false
      },
      {
        id: "neuro-post-chicore-003",
        ownerUuid: "6f830df5-1300-4a7c-b7e3-606929aa0a52",
        name: "Lena Voss",
        handle: "@lenavoss.sl",
        avatar: "10",
        message: "Chi-Core night market is open. Good music, good light, good people.",
        imageUrl: "",
        createdAt: Date.now() - 60 * 60 * 1000,
        likes: 18,
        comments: 4,
        reposts: 2,
        liked: false,
        reposted: false
      }
    ]
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
const zodiacPath = (sign) => `assets/img/zodiac/${sign}.png`;
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

function gcMoney(value) {
  const amount = Number.parseInt(value, 10);
  if (!Number.isFinite(amount)) return "Syncing";
  return `GC ${amount.toLocaleString("en-US")}`;
}

function renderWalletStatus(text, live = false) {
  const status = document.querySelector("[data-wallet-status]");
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("is-live", live);
  status.classList.toggle("is-waiting", !live);
}

function renderWallet() {
  Object.entries({
    checking: state.wallet.checking,
    savings: state.wallet.savings
  }).forEach(([name, value]) => {
    const balance = document.querySelector(`[data-balance="${name}"]`);
    if (!balance) return;
    const text = gcMoney(value);
    balance.dataset.original = text;
    balance.textContent = state.hiddenBalances[name] ? "Hidden" : text;
  });

  renderWalletStatus(state.wallet.live ? "Live wallet synced from Second Life" : "Waiting for Second Life wallet bridge", state.wallet.live);
}

function requestWalletBalance() {
  if (!liveBridge) {
    renderWalletStatus("Open in Second Life to sync live G-Coin balances", false);
    return;
  }
  renderWalletStatus("Requesting live G-Coin balance...", false);
  sendBridge("wallet-balance");
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

  if (body.startsWith("WALLET_SYNC_REQUESTED")) {
    renderWalletStatus("Wallet sync requested. Waiting for G-Coin reply...", false);
    window.clearTimeout(state.wallet.retryTimer);
    state.wallet.retryTimer = window.setTimeout(() => {
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
  try {
    const saved = JSON.parse(window.localStorage.getItem("neuroProfile") || "{}");
    applySavedProfile(saved, false);
  } catch {
    window.localStorage.removeItem("neuroProfile");
  }
}

function persistProfileLocal() {
  try {
    window.localStorage.setItem("neuroProfile", JSON.stringify(profileSavePayload()));
  } catch {
    // Second Life media can deny browser storage; the LSL gateway is the durable save path.
  }
}

function profileSavePayload() {
  const { title, name, age, sex, location, avatar, favoriteColor, zodiac } = state.profile;
  return { title, name, age, sex, location, avatar, favoriteColor, zodiac };
}

function applySavedProfile(profile, fromHud = false) {
  if (!profile || typeof profile !== "object") return;
  const allowed = ["title", "name", "age", "sex", "location", "avatar", "favoriteColor", "zodiac"];
  allowed.forEach((key) => {
    if (profile[key] !== undefined && profile[key] !== null && profile[key] !== "") {
      state.profile[key] = profile[key];
    }
  });
  if (fromHud) state.profile.savedInHud = true;
}

function profileXp() {
  const level = Math.max(1, Math.round(asNumber(state.profile.level, 1)));
  const current = Math.max(0, Math.round(asNumber(state.profile.xpCurrent, 0)));
  const goal = Math.max(1, Math.round(asNumber(state.profile.xpGoal, 1)));
  const needed = Math.max(0, goal - current);
  const percent = Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
  return { level, current, goal, needed, percent, verified: level >= 10 };
}

function renderProfile() {
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
    const title = state.profile.title || "Resident";
    const location = state.profile.location && state.profile.location !== "Not Set" ? state.profile.location : "Location unset";
    node.textContent = `${title} / ${location}`;
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

function renderConnectionStatus(status) {
  document.querySelectorAll("[data-profile-status], [data-bridge-status]").forEach((node) => {
    node.textContent = status;
    node.classList.toggle("is-online", status === "Online");
    node.classList.toggle("is-offline", status !== "Online");
  });
}

function openProfileEditor() {
  const editor = document.querySelector("[data-profile-editor]");
  const form = document.querySelector("[data-profile-form]");
  if (!editor || !form) return;

  ["title", "name", "age", "sex", "location", "favoriteColor", "zodiac"].forEach((name) => {
    if (form.elements[name]) form.elements[name].value = state.profile[name] || "";
  });

  editor.hidden = false;
  renderProfile();
}

function closeProfileEditor() {
  const editor = document.querySelector("[data-profile-editor]");
  if (editor) editor.hidden = true;
}

function saveProfileFromForm(form) {
  const next = { ...state.profile };
  ["title", "name", "age", "sex", "location", "favoriteColor", "zodiac"].forEach((name) => {
    if (!form.elements[name]) return;
    const value = String(form.elements[name].value || "").trim();
    next[name] = value || state.profile[name];
  });

  state.profile = next;
  persistProfileLocal();
  renderProfile();
  if (liveBridge) sendBridge("profile-save", JSON.stringify(profileSavePayload()));
  closeProfileEditor();
}

function requestStoredProfile() {
  if (liveBridge) sendBridge("profile-load");
}

function handleProfileResponse(body) {
  if (!body.startsWith("PROFILE|")) return false;

  const payload = body.substring(8);
  if (!payload || payload === "{}") return true;

  try {
    applySavedProfile(JSON.parse(payload), true);
    persistProfileLocal();
    renderProfile();
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

function currentOwnerUuid() {
  return String(snapshotValue(state.lastSnapshot, "ownerUuid", snapshotValue(state.lastSnapshot, "avatarUuid", "local-web-profile")));
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

function normalizePost(post) {
  const now = Date.now();
  const rawCreatedAt = Number(post.createdAt || now);
  const createdAt = rawCreatedAt > 0 && rawCreatedAt < 100000000000 ? rawCreatedAt * 1000 : rawCreatedAt;
  return {
    id: String(post.id || `neuro-post-${now}-${Math.round(Math.random() * 10000)}`),
    ownerUuid: String(post.ownerUuid || currentOwnerUuid()),
    name: String(post.name || state.profile.name || "Neuro Resident"),
    handle: String(post.handle || currentHandle()),
    avatar: String(post.avatar || state.profile.avatar || "01"),
    message: String(post.message || ""),
    imageUrl: String(post.imageUrl || post.image || ""),
    createdAt,
    likes: Math.max(0, Math.round(asNumber(post.likes, 0))),
    comments: Math.max(0, Math.round(asNumber(post.comments, 0))),
    reposts: Math.max(0, Math.round(asNumber(post.reposts, 0))),
    liked: Boolean(post.liked),
    reposted: Boolean(post.reposted)
  };
}

function renderFeed() {
  const thread = document.querySelector("[data-message-thread]");
  if (!thread) return;

  thread.replaceChildren();
  state.feed.posts.slice(0, 12).forEach((rawPost) => {
    const post = normalizePost(rawPost);
    const card = document.createElement("article");
    card.className = "feed-post";
    card.dataset.postId = post.id;
    card.dataset.ownerUuid = post.ownerUuid;
    card.innerHTML = `
      <img alt="">
      <div>
        <header><strong></strong><span></span><time></time></header>
        <p></p>
        <img class="feed-image" alt="" hidden>
        <footer>
          <button type="button" data-feed-action="like"><svg><use href="#icon-like"></use></svg><span></span></button>
          <button type="button" data-feed-action="comment"><svg><use href="#icon-comment"></use></svg><span></span></button>
          <button type="button" data-feed-action="repost"><svg><use href="#icon-repost"></use></svg><span></span></button>
        </footer>
      </div>`;
    card.querySelector("img").src = avatarPath(post.avatar);
    card.querySelector("img").alt = post.name;
    card.querySelector("header strong").textContent = post.name;
    card.querySelector("header span").textContent = post.handle;
    card.querySelector("header time").textContent = timeAgo(post.createdAt);
    card.querySelector("p").textContent = post.message;
    const image = card.querySelector(".feed-image");
    const src = postImageSrc(post.imageUrl);
    if (image && src) {
      image.src = src;
      image.alt = `${post.name} post image`;
      image.hidden = false;
    }
    const buttons = card.querySelectorAll("footer button span");
    buttons[0].textContent = post.likes;
    buttons[1].textContent = post.comments;
    buttons[2].textContent = post.reposts;
    card.querySelector('[data-feed-action="like"]').classList.toggle("is-active", post.liked);
    card.querySelector('[data-feed-action="repost"]').classList.toggle("is-active", post.reposted);
    thread.append(card);
  });
}

function sendFeedBridge(op, payload = {}) {
  if (!liveBridge) return;
  sendBridge(`feed-${op}`, JSON.stringify(payload));
}

function createFeedPost(text, imageUrl = "") {
  const post = normalizePost({
    message: text,
    imageUrl,
    ownerUuid: currentOwnerUuid(),
    name: state.profile.name || "Neuro Resident",
    handle: currentHandle(),
    avatar: state.profile.avatar,
    createdAt: Date.now()
  });

  state.feed.posts.unshift(post);
  sendFeedBridge("post", post);
  renderFeed();
}

function handleFeedAction(postId, action) {
  const post = state.feed.posts.find((item) => item.id === postId);
  if (!post) return;
  let active = true;

  if (action === "like") {
    post.liked = !post.liked;
    active = post.liked;
    post.likes = Math.max(0, post.likes + (post.liked ? 1 : -1));
  } else if (action === "comment") {
    post.comments += 1;
  } else if (action === "repost") {
    post.reposted = !post.reposted;
    active = post.reposted;
    post.reposts = Math.max(0, post.reposts + (post.reposted ? 1 : -1));
  }

  sendFeedBridge(action, { postId, ownerUuid: post.ownerUuid, active });
  renderFeed();
}

function refreshFeed() {
  sendFeedBridge("refresh");
  renderFeed();
}

function handleFeedResponse(body) {
  if (body.startsWith("FEED_OK|")) return true;
  if (body.startsWith("FEED_OFFLINE|")) {
    logBridge("feed server offline");
    return true;
  }
  if (!body.startsWith("FEED|")) return false;
  const payload = body.substring(5);
  if (!payload) return true;

  try {
    const posts = JSON.parse(payload);
    if (Array.isArray(posts)) {
      state.feed.posts = posts.map(normalizePost);
      renderFeed();
    }
  } catch {
    logBridge("bad feed payload");
  }
  return true;
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("is-active", screen.id === `screen-${name}`);
  });

  document.querySelectorAll("[data-screen-target]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.screenTarget === name);
  });

  document.querySelector(".hud-shell")?.setAttribute("data-screen", name);
  if (name === "wallet") requestWalletBalance();
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

function profileXpFromSnapshot(snapshot) {
  const rawLevel = snapshotValue(snapshot, "level", snapshotValue(snapshot, "xpLevel", state.profile.level));
  const rawXp = snapshotValue(snapshot, "xpCurrent", snapshotValue(snapshot, "currentXp", snapshotValue(snapshot, "xp", state.profile.xpCurrent)));
  const perLevel = Math.max(1, Math.round(asNumber(snapshotValue(snapshot, "xpPerLevel", 2500), 2500)));
  const level = Math.max(1, Math.round(asNumber(rawLevel, state.profile.level)));
  const totalXp = Math.max(0, Math.round(asNumber(rawXp, state.profile.xpCurrent)));
  const current = Math.max(0, Math.round(asNumber(snapshotValue(snapshot, "xpIntoLevel", totalXp % perLevel), totalXp % perLevel)));
  const goal = Math.max(1, Math.round(asNumber(snapshotValue(snapshot, "xpGoal", snapshotValue(snapshot, "xpNext", perLevel)), perLevel)));

  return { level, xpCurrent: current, xpGoal: goal };
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
  if (state.profile.savedInHud) return;

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

function applyXpSnapshot(snapshot) {
  state.profile = { ...state.profile, ...profileXpFromSnapshot(snapshot) };
  renderProfile();
}

function applySnapshot(snapshot) {
  if (!snapshot || snapshot.token !== "CDF_WORLD_V1") return;
  state.lastSnapshot = snapshot;
  renderStats(statsFromSnapshot(snapshot));
  applyProfileSnapshot(snapshot);
  applyXpSnapshot(snapshot);
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
  refreshFeed();
  window.setInterval(() => sendBridge("stats"), 5000);
  window.setInterval(refreshFeed, 15000);
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

  const commandButton = event.target.closest("[data-command]");
  if (commandButton) {
    sendBridge(commandButton.dataset.command);
    return;
  }

  const feedAction = event.target.closest("[data-feed-action]");
  if (feedAction) {
    const post = feedAction.closest("[data-post-id]");
    if (post) handleFeedAction(post.dataset.postId, feedAction.dataset.feedAction);
    return;
  }

  const feedRefresh = event.target.closest("[data-feed-refresh]");
  if (feedRefresh) {
    refreshFeed();
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
  }
});

document.addEventListener("submit", (event) => {
  const profileForm = event.target.closest("[data-profile-form]");
  if (profileForm) {
    event.preventDefault();
    saveProfileFromForm(profileForm);
    return;
  }

  const messageForm = event.target.closest("[data-message-form]");
  if (messageForm) {
    event.preventDefault();
    const input = messageForm.elements.message;
    const imageInput = messageForm.elements.image;
    const text = String(input?.value || "").trim();
    const image = String(imageInput?.value || "").trim();
    if (!text && !image) return;
    createFeedPost(text || "Shared an image.", image);
    input.value = "";
    if (imageInput) imageInput.value = "";
  }
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
  if (op !== "stats") logBridge(`${op}: LSL ${status} ${body}`);
  if (handleProfileResponse(body)) return;
  if (handleFeedResponse(body)) return;
  if (handleWalletResponse(body)) return;
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
renderFeed();
renderWallet();
setupClock();
renderStats(state.stats);
requestStoredProfile();
startLiveStats();
