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
    xpPerLevel: 2500,
    verified: true,
    savedInHud: false
  },
  messages: {
    activeThreadId: "",
    threads: [
      {
        threadId: "dm-jade-rain",
        avatar: "03",
        participantUuid: "7e0c6dd7-681b-4a28-9d60-293f7623b201",
        participantName: "Jade Rain",
        participantHandle: "@jaderain.sl",
        unread: 1,
        messages: [
          {
            message_id: "msg-jade-001",
            sender_uuid: "7e0c6dd7-681b-4a28-9d60-293f7623b201",
            receiver_uuid: "local-web-profile",
            sender_name: "Jade Rain",
            receiver_name: "Neuro Resident",
            message_text: "Meet me near Eden Palms when you get a chance.",
            timestamp: Date.now() - 2 * 60 * 1000,
            read: false
          }
        ]
      },
      {
        threadId: "dm-kam",
        avatar: "07",
        participantUuid: "6c7a2b84-4106-438d-ae74-c1ef2fb7ab56",
        participantName: "Kam",
        participantHandle: "@kam.sl",
        unread: 0,
        messages: [
          {
            message_id: "msg-kam-001",
            sender_uuid: "6c7a2b84-4106-438d-ae74-c1ef2fb7ab56",
            receiver_uuid: "local-web-profile",
            sender_name: "Kam",
            receiver_name: "Neuro Resident",
            message_text: "I sent the new Chi-Core route.",
            timestamp: Date.now() - 12 * 60 * 1000,
            read: true
          }
        ]
      },
      {
        threadId: "dm-system",
        avatar: "01",
        participantUuid: "system",
        participantName: "System",
        participantHandle: "@system",
        unread: 1,
        messages: [
          {
            message_id: "msg-system-001",
            sender_uuid: "system",
            receiver_uuid: "local-web-profile",
            sender_name: "System",
            receiver_name: "Neuro Resident",
            message_text: "HUD update ready.",
            timestamp: Date.now(),
            read: false
          }
        ]
      }
    ]
  },
  notifications: {
    items: [],
    dismissedStats: []
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
    activeMaleSection: "care"
  },
  clock: {
    lastMinuteKey: "",
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
  planB: "Shows emergency use status, last taken, effects, and side effects."
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
    command: "cycle-start",
    status: "Active",
    nextStep: "Track Care"
  },
  pause: {
    label: "Pause Cycle",
    command: "cycle-pause",
    status: "Paused",
    nextStep: "Resume Cycle"
  },
  stop: {
    label: "Stop Cycle",
    command: "cycle-stop",
    status: "Inactive",
    nextStep: "Start Cycle"
  }
};

const avatarPath = (id) => `assets/img/perf/avatars/avatar-${id}.png`;
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
  const tick = Date.now().toString();
  const query = new URLSearchParams({
    op,
    text,
    tick
  }).toString();

  pendingBridge.set(tick, op);
  window.setTimeout(() => pendingBridge.delete(tick), 20000);
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
    sendBridge("refresh");
    return;
  }
  window.location.reload();
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
  if (!state.perf.loaded.wallet) return;
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
  state.perf.loaded.wallet = true;
  if (!liveBridge) {
    renderWalletStatus("Open in Second Life to sync live G-Coin balances", false);
    return;
  }
  renderWalletStatus("Requesting live G-Coin balance...", false);
  sendBridge("wallet-balance");
  setLastRefresh("wallet requested");
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

function isFemaleAvatar() {
  return String(state.profile.sex || "").trim().toLowerCase() === "female";
}

function isMaleAvatar() {
  return String(state.profile.sex || "").trim().toLowerCase() === "male";
}

function hasKnownAvatarSex() {
  const sex = String(state.profile.sex || "").trim().toLowerCase();
  return sex !== "" && sex !== "not set" && sex !== "unknown";
}

function healthValue(keys, fallback = "") {
  const value = firstSnapshotValue(state.lastSnapshot || {}, Array.isArray(keys) ? keys : [keys], fallback);
  if (value === undefined || value === null || value === "" || value === "JSON_INVALID") return fallback;
  return value;
}

function healthRows(groups) {
  return groups.map((group) => ({
    title: group.title,
    rows: group.rows.map(([label, keys, fallback]) => [label, healthValue(keys, fallback)])
  }));
}

function setSnapshotValue(key, value) {
  if (!state.lastSnapshot || typeof state.lastSnapshot !== "object") state.lastSnapshot = {};
  state.lastSnapshot[key] = value;
}

function handleCycleAction(actionKey) {
  const action = cycleActions[actionKey];
  if (!action) return;
  setSnapshotValue("cycle.status", action.status);
  setSnapshotValue("cycle.nextStep", action.nextStep);
  setSnapshotValue("cycle.lastAction", action.label);
  renderHealthDetail("cycle", state.health.activeGroups.cycle || 0);
  sendBridge(action.command);
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
        ["Cycle Day", ["cycle.dayLabel", "cycle.day"], healthValue(["cycle.day"], "6") + " / " + healthValue(["cycle.length"], "28")],
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
        ["Care Stat", ["cycle.care", "care.self"], "0"],
        ["Hygiene Stat", ["stat.hygiene"], state.stats.hygiene],
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
      { title: "Pregnancy Rule", rows: [
        ["If Pregnant", ["pregnancy.rule"], "Cycle inactive, period inactive, fertile window closed, ovulation stopped."]
      ] }
    ],
    selfCare: [
      { title: "Self Care Tab", rows: [
        ["Self Care", ["selfCare.score"], "0/100"],
        ["Status", ["selfCare.status"], "Needs Care"],
        ["Last Care", ["selfCare.lastCare"], "None"],
        ["Next Care Due", ["selfCare.nextDue"], "Now"]
      ] },
      { title: "Salon Services", rows: [
        ["Hair", ["selfCare.hair"], "Not Done"],
        ["Nails", ["selfCare.nails"], "Not Done"],
        ["Feet", ["selfCare.feet"], "Not Done"],
        ["Facial", ["selfCare.facial"], "Not Done"]
      ] },
      { title: "Body Care", rows: [
        ["Skin Care", ["selfCare.skinCare"], "Not Done"],
        ["Lotion", ["selfCare.lotion"], "Not Used"],
        ["Shower", ["selfCare.shower"], "Not Done"],
        ["Rest", ["selfCare.rest"], "Not Done"]
      ] },
      { title: "Self Care Items", rows: [
        ["Lotion", ["selfCare.lotionItem"], "Not Used"],
        ["Self Care Multivitamin", ["selfCare.multivitamin"], "Not Taken"],
        ["Last Multivitamin", ["selfCare.lastMultivitamin", "last.multivitamin"], "None"],
        ["Care Item XP", ["selfCare.careItemXP"], "0"],
        ["Lotion Effect", ["selfCare.lotionEffect"], "Self Care +10 / Hygiene +5"]
      ] }
    ],
    birthControl: [
      { title: "Birth Control Tab", rows: [
        ["Status", ["birthControl.status", "bc.status"], "Not Active"],
        ["Last Taken", ["birthControl.lastTaken", "last.bcTaken"], "None"],
        ["BC Time Left", ["birthControl.timeLeft", "bc.timeLeft"], "0"],
        ["Protected", ["birthControl.protected", "bc.protected"], "No"]
      ] },
      { title: "Effect", rows: [
        ["Purpose", ["birthControl.effect"], "Helps prevent pregnancy while active."],
        ["Duration", ["birthControl.duration"], "8 RL hours"],
        ["Side Effects", ["birthControl.sideEffects"], "Care -5 / Energy -5 / Pain: None or Mild"],
        ["Rule", ["birthControl.rule"], "Taken from item, not toggled from menu."]
      ] }
    ],
    planB: [
      { title: "Plan B Tab", rows: [
        ["Plan B Zero", ["planB.name"], "Plan B Zero"],
        ["Pregnancy Status", ["pregnancy.status"], "Not Pregnant"],
        ["Times Taken", ["planB.timesTaken"], "0"],
        ["Last Taken", ["planB.lastTaken", "last.planBTaken"], "None"],
        ["Last Use Status", ["planB.lastUseStatus"], "None"]
      ] },
      { title: "Effect", rows: [
        ["Purpose", ["planB.effect"], "Lowers pregnancy risk after intimacy."],
        ["Best Used", ["planB.bestUsed"], "Soon after."],
        ["Side Effects", ["planB.sideEffects"], "Care -50 / Energy -10 / Pain: Mild"],
        ["Rule", ["planB.rule"], "Use once. Taken from item, not toggled from menu."]
      ] }
    ]
  };
  return healthRows(groups[section] || groups.cycle);
}

function renderHealthDetail(section = "cycle", groupIndex = state.health.activeGroups[section] || 0) {
  const title = document.querySelector("[data-health-detail-title]");
  const purpose = document.querySelector("[data-health-detail-purpose]");
  const subnav = document.querySelector("[data-health-subsections]");
  const cycleActionBar = document.querySelector("[data-health-cycle-actions]");
  const target = document.querySelector("[data-health-detail]");
  const groups = healthDetailGroups(section);
  const activeIndex = Math.min(Math.max(Number(groupIndex) || 0, 0), groups.length - 1);
  state.health.activeGroups[section] = activeIndex;
  if (title) title.textContent = healthSectionLabels[section] || healthSectionLabels.cycle;
  if (purpose) purpose.textContent = healthSectionPurposes[section] || healthSectionPurposes.cycle;
  if (subnav) {
    subnav.replaceChildren();
    groups.forEach((group, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.healthSubsection = String(index);
      button.dataset.healthSectionKey = section;
      button.classList.toggle("is-active", index === activeIndex);
      button.textContent = group.title.replace(/^Cycle /, "").replace(/ Tab$/, "");
      subnav.append(button);
    });
  }
  if (cycleActionBar) {
    cycleActionBar.hidden = section !== "cycle";
    cycleActionBar.replaceChildren();
    if (section === "cycle") {
      Object.entries(cycleActions).forEach(([key, action]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.cycleAction = key;
        button.textContent = action.label;
        cycleActionBar.append(button);
      });
    }
  }
  if (!target) return;
  target.replaceChildren();
  const group = groups[activeIndex] || groups[0];
  const article = document.createElement("section");
  article.className = "health-detail-group";
  const heading = document.createElement("h3");
  heading.textContent = group.title;
  article.append(heading);
  group.rows.forEach(([label, value]) => {
    const row = document.createElement("p");
    row.innerHTML = "<span></span><strong></strong>";
    row.querySelector("span").textContent = label;
    row.querySelector("strong").textContent = String(value);
    article.append(row);
  });
  target.append(article);
}

function maleHealthDetailRows(section) {
  const hygieneStatus = Number(state.stats.hygiene) > 75 ? "Good" : "Needs Care";
  const groups = {
    care: [
      ["Hygiene", [], hygieneStatus],
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
      ["Stamina", ["fitness.stamina", "male.fitness.stamina"], "0"],
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
  return (groups[section] || groups.care).map(([label, keys, fallback]) => [label, healthValue(keys, fallback)]);
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
  renderKeyValueRows(document.querySelector("[data-male-health-summary]"), [
    ["Care", `${state.stats.care}/100`],
    ["Fitness", healthValue(["fitness.status", "male.fitness.status"], "Inactive")],
    ["Last Activity", healthValue(["health.lastActivity", "male.lastActivity", "fitness.lastWorkout"], "None")]
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

  if (statusCard) statusCard.hidden = female || male;
  if (!female && !male) {
    if (statusTitle) statusTitle.textContent = knownSex ? "Health Hidden" : "Loading Health";
    if (statusMessage) {
      statusMessage.textContent = knownSex
        ? "Health sections are hidden until avatar sex is Male or Female."
        : "Checking avatar profile. Health sections will appear when Neuro receives avatar sex.";
    }
  }

  document.querySelectorAll("[data-female-health]").forEach((node) => {
    node.hidden = !female;
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
  buttons?.querySelectorAll("[data-health-section]").forEach((button, index) => {
    button.classList.toggle("is-active", index === 0 && !buttons.querySelector(".is-active"));
  });
  renderHealthDetail(document.querySelector("[data-health-section-buttons] .is-active")?.dataset.healthSection || "cycle");
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
    read: Boolean(message?.read)
  };
}

function normalizeDmThread(thread) {
  const base = {
    threadId: String(thread.threadId || `dm-${Date.now()}-${Math.round(Math.random() * 10000)}`),
    avatar: String(thread.avatar || "01"),
    participantUuid: String(thread.participantUuid || "unknown"),
    participantName: String(thread.participantName || "Resident"),
    participantHandle: String(thread.participantHandle || "@resident.sl")
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
  try {
    const saved = JSON.parse(localStorage.getItem("neuroMessages") || "[]");
    if (Array.isArray(saved) && saved.length) {
      state.messages.threads = saved.map(normalizeDmThread);
    } else {
      state.messages.threads = state.messages.threads.map(normalizeDmThread);
      saveMessagesLocal();
    }
  } catch {
    state.messages.threads = state.messages.threads.map(normalizeDmThread);
  }
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
  if (!inbox) return;

  state.messages.activeThreadId = "";
  setMessagesTitle("Neuro Messages");
  inbox.hidden = false;
  if (threadView) threadView.hidden = true;
  if (compose) compose.hidden = true;
  if (back) back.hidden = true;
  inbox.replaceChildren();

  sortedDmThreads().forEach((thread) => {
    const last = lastDmMessage(thread);
    const row = document.createElement("button");
    row.type = "button";
    row.className = "dm-row";
    row.dataset.messageThread = thread.threadId;
    row.innerHTML = `
      <img alt="">
      <span class="dm-row-copy">
        <header><strong></strong><time></time></header>
        <small></small>
      </span>
      <i hidden></i>`;
    row.querySelector("img").src = avatarPath(thread.avatar);
    row.querySelector("img").alt = thread.participantName;
    row.querySelector("strong").textContent = thread.participantName;
    row.querySelector("time").textContent = last ? timeAgo(last.timestamp) : "now";
    row.querySelector("small").textContent = last?.message_text || "No messages yet.";
    const unread = row.querySelector("i");
    if (thread.unread > 0) {
      unread.hidden = false;
      unread.textContent = thread.unread > 9 ? "9+" : String(thread.unread);
    }
    inbox.append(row);
  });
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
        avatar: thread.avatar,
        category: "Message",
        title: thread.participantName,
        message: last?.message_text || "New private message.",
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
    item.querySelector("img").src = alert.avatar ? avatarPath(alert.avatar) : avatarPath("01");
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
    avatar: "01",
    category: "Stats",
    title: `${label} is low`,
    message: `${label} is at ${Math.round(asNumber(state.stats[key], 0))}%. Take care of it soon.`,
    timestamp: Date.now(),
    unread: true
  }));
}

function resetRecoveredStatDismissals() {
  state.notifications.dismissedStats = state.notifications.dismissedStats.filter((id) => {
    const key = id.replace("stat-", "");
    return asNumber(state.stats[key], 100) < 50;
  });
  saveNotificationsLocal();
}

function loadNotificationsLocal() {
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

function saveNotificationsLocal() {
  window.localStorage.setItem("neuroNotifications", JSON.stringify({
    items: state.notifications.items.slice(0, 8),
    dismissedStats: state.notifications.dismissedStats
  }));
}

function addLocalNotification(title, message, category = "System") {
  state.notifications.items.unshift({
    id: `note-${Date.now()}`,
    kind: "local",
    avatar: "01",
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
  if (!thread || !threadView) return;

  setMessagesTitle(thread.participantName);
  if (inbox) inbox.hidden = true;
  threadView.hidden = false;
  if (compose) compose.hidden = thread.participantUuid === "system";
  if (back) back.hidden = false;
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
  if (liveBridge) sendBridge("dm-send", JSON.stringify({ thread_id: thread.threadId, ...message }));
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
}

function loadHealth() {
  state.perf.loaded.health = true;
  renderHealth();
  requestStoredProfile(true);
  if (liveBridge) {
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
  if (name === "health") loadHealth();
  if (name === "settings") loadSettings();
  renderPerfDebug();
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
  if (state.perf.loaded.health) renderHealth();
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
  if (state.perf.loaded.health) renderHealth();
}

function applyXpSnapshot(snapshot) {
  state.profile = { ...state.profile, ...profileXpFromSnapshot(snapshot) };
  renderProfile();
  if (state.perf.loaded.health) renderHealth();
}

function applySnapshot(snapshot) {
  if (!snapshot || snapshot.token !== "CDF_WORLD_V1") return;
  state.lastSnapshot = snapshot;
  renderStats(statsFromSnapshot(snapshot));
  resetRecoveredStatDismissals();
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
    renderPerfDebug();
    return;
  }

  const detail = document.querySelector("[data-body-status-detail]");
  if (detail) detail.textContent = "SYNCING";
  sendBridge("stats");
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
    const minuteKey = `${hour}:${minute}`;

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

    const delay = Math.max(800, 61000 - (now.getSeconds() * 1000) - now.getMilliseconds());
    state.perf.clockTimer = perfTimeout("clock", tick, delay);
  }

  tick();
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
    document.querySelectorAll("[data-health-section]").forEach((button) => {
      button.classList.toggle("is-active", button === healthSectionButton);
    });
    renderHealthDetail(healthSectionButton.dataset.healthSection);
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
    setLastRefresh(settingsItem.textContent.trim());
    setSettingsMenu(false);
    return;
  }

  if (!event.target.closest("[data-settings-menu]")) {
    setSettingsMenu(false);
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
  }
});

document.addEventListener("submit", (event) => {
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
  if (handleWalletResponse(body)) return;
  if (body.startsWith("STATS|") || body.startsWith("{") || body.startsWith("NO_STATS")) {
    handleStatsResponse(body);
  }
});

setupStats();
loadSavedProfile();
loadMessagesLocal();
loadNotificationsLocal();
renderNotificationCount();
setupClock();
loadHome();
startLiveStats();
renderPerfDebug();
