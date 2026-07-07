// =====================================================//
// Name of script: neura-heart
// Build: 1007
// Update: Lifecycle Announcements
// Date and time: 2026-07-02 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

const heartState = {
  lastMinuteKey: "",
  lastNotifyCount: 0,
  lastStats: new Map(),
  lastActivityAt: Date.now(),
  idleIndex: 0,
  idleAnnounced: false,
  speakTimer: 0,
  lastLifecycleKey: ""
};

const heartIdleMessages = [
  ["HUD Guide", "I can watch your stats, surface notifications, and call out changes as they happen."],
  ["Care Loop", "When server features connect, I can tell you what changed and where to check next."],
  ["Time Sense", "I can call the hour and half-hour while keeping the HUD calm."],
  ["Notify Path", "When something needs you, I will send it through Notify and speak it here."]
];

function heartNowLabel() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

function heartSetText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function clearHeartSpeech() {
  heartSetText("[data-heart-kicker]", "");
  heartSetText("[data-heart-title]", "");
  heartSetText("[data-heart-body]", "");
}

function heartMarkActivity() {
  heartState.lastActivityAt = Date.now();
  heartState.idleAnnounced = false;
}

function heartSpeak(title, body, tone = "calm", kicker = "Neura Heart") {
  const box = document.querySelector("[data-heart-message]");
  const heart = document.querySelector("[data-neura-heart]");
  if (!box) return;

  box.dataset.heartTone = tone;
  box.classList.remove("is-speaking");
  heart?.classList.remove("is-speaking");
  void box.offsetWidth;
  box.classList.add("is-speaking");
  heart?.classList.add("is-speaking");

  heartSetText("[data-heart-kicker]", kicker);
  heartSetText("[data-heart-title]", title);
  heartSetText("[data-heart-body]", body);

  if (heart) {
    heart.classList.toggle("has-heart-alert", tone === "alert" || tone === "urgent");
    window.clearTimeout(heartState.speakTimer);
    heartState.speakTimer = window.setTimeout(() => {
      heart.classList.remove("is-speaking");
      box.classList.remove("is-speaking");
      clearHeartSpeech();
    }, 5200);
    window.setTimeout(() => heart.classList.remove("has-heart-alert"), 3600);
  }
}

function navigationKind() {
  const navigation = performance.getEntriesByType?.("navigation")?.[0];
  return navigation?.type || "navigate";
}

function heartLifecycle(eventName, detail = "") {
  const eventMap = {
    HUD_OPENED: ["HUD Opened", detail || "Neura HUD is open.", "good"],
    HUD_CLOSED: ["HUD Closed", detail || "Neura HUD is closing.", "calm"],
    HUD_ATTACHED: ["HUD Attached", detail || "Neura HUD attached.", "good"],
    HUD_DETACHED: ["HUD Detached", detail || "Neura HUD detached.", "alert"],
    HUD_RELOADED: ["HUD Reloaded", detail || "Neura HUD reloaded.", "time"],
    HUD_RESYNCED: ["HUD Resynced", detail || "Neura HUD sync is complete.", "good"],
    HUD_VISIBLE: ["HUD Opened", detail || "Neura HUD is back on screen.", "good"],
    HUD_HIDDEN: ["HUD Closed", detail || "Neura HUD is no longer visible.", "calm"]
  };

  const lifecycle = eventMap[eventName];
  if (!lifecycle) return;

  const key = `${eventName}:${detail}`;
  if (key === heartState.lastLifecycleKey) return;
  heartState.lastLifecycleKey = key;
  heartSpeak(lifecycle[0], lifecycle[1], lifecycle[2], "Neura Heart");
}

function statName(node) {
  const row = node.closest(".stat-row");
  return row?.querySelector("em")?.textContent?.trim() || "A stat";
}

function statValue(node) {
  const value = Number.parseFloat((node.textContent || "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(value)) return null;
  return value;
}

function readableHudLabel(node) {
  return node?.querySelector("em")?.textContent?.trim()
    || node?.getAttribute("aria-label")
    || (node?.textContent || "").replace(/\d+$/g, "").trim()
    || "HUD";
}

function syncHeartMood() {
  const shell = document.querySelector("[data-neura-shell]");
  if (!shell) return;

  const values = Array.from(document.querySelectorAll("[data-stat]"))
    .map(statValue)
    .filter((value) => value !== null);

  if (!values.length) {
    shell.removeAttribute("data-mood");
    return;
  }

  const lowest = Math.min(...values);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  let mood = "steady";
  if (lowest <= 20) mood = "urgent";
  else if (lowest <= 45) mood = "low";
  else if (average >= 82) mood = "bright";
  shell.dataset.mood = mood;
}

function handleStatChange(node) {
  const value = statValue(node);
  const key = node.dataset.stat || statName(node).toLowerCase();
  if (value === null) return;

  const previous = heartState.lastStats.get(key);
  heartState.lastStats.set(key, value);
  syncHeartMood();

  if (!Number.isFinite(previous)) return;
  if (value === previous) return;

  const name = statName(node);
  const delta = Math.round(value - previous);
  if (value <= 20) {
    heartSpeak(`${name} needs care`, `${name} is at ${Math.round(value)}%. I am flagging it now.`, "urgent");
  } else if (delta < 0) {
    heartSpeak(`${name} dropped`, `${name} moved down ${Math.abs(delta)} points to ${Math.round(value)}%.`, value <= 45 ? "alert" : "calm");
  } else if (delta > 0) {
    heartSpeak(`${name} improved`, `${name} gained ${delta} points and is now ${Math.round(value)}%.`, "good");
  }
}

function syncHeartNotify() {
  const badge = document.querySelector('[data-action="notify"] sup');
  const count = Number.parseInt(badge?.textContent || "0", 10);
  const safeCount = Number.isFinite(count) ? count : 0;
  const hasUpdate = safeCount > 0;
  document.querySelector("[data-neura-heart]")?.classList.toggle("has-heart-alert", hasUpdate);
  document.querySelector('[data-action="notify"]')?.classList.toggle("has-core-alert", hasUpdate);

  if (safeCount > heartState.lastNotifyCount) {
    heartSpeak("New Notify", `You have ${safeCount} notification${safeCount === 1 ? "" : "s"} waiting.`, "alert");
  }
  heartState.lastNotifyCount = safeCount;
}

function checkHeartTime() {
  const now = new Date();
  const minute = now.getMinutes();
  if (minute !== 0 && minute !== 30) return;

  const key = `${now.getHours()}:${minute}`;
  if (key === heartState.lastMinuteKey) return;
  heartState.lastMinuteKey = key;

  if (minute === 0) {
    heartSpeak("Hour Mark", `It is ${heartNowLabel()}. I am still watching the HUD.`, "time");
  } else {
    heartSpeak("Half-Hour Mark", `It is ${heartNowLabel()}. Half-hour check-in is clear.`, "time");
  }
}

function checkHeartIdle() {
  if (heartState.idleAnnounced) return;
  if (Date.now() - heartState.lastActivityAt < 90000) return;

  const message = heartIdleMessages[heartState.idleIndex % heartIdleMessages.length];
  heartState.idleIndex += 1;
  heartState.idleAnnounced = true;
  heartSpeak(message[0], message[1], "calm");
}

function setupHeartObservers() {
  document.querySelectorAll("[data-stat]").forEach((node) => {
    const value = statValue(node);
    if (value !== null) heartState.lastStats.set(node.dataset.stat || statName(node).toLowerCase(), value);
    new MutationObserver(() => handleStatChange(node)).observe(node, {
      childList: true,
      characterData: true,
      subtree: true
    });
  });

  const notifyBadge = document.querySelector('[data-action="notify"] sup');
  if (notifyBadge) {
    heartState.lastNotifyCount = Number.parseInt(notifyBadge.textContent || "0", 10) || 0;
    new MutationObserver(syncHeartNotify).observe(notifyBadge, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }
}

document.addEventListener("click", (event) => {
  heartMarkActivity();

  const tab = event.target.closest("[data-tab]");
  if (tab) {
    heartSpeak("Section Opened", `${readableHudLabel(tab)} is on screen.`, "calm");
    return;
  }

  const action = event.target.closest("[data-action]");
  if (action) {
    const label = readableHudLabel(action);
    heartSpeak("HUD Action", `${label} is open.`, action.dataset.action === "notify" ? "alert" : "calm");
    return;
  }

  if (event.target.closest("[data-avatar-choose]")) {
    heartSpeak("Image Chosen", "Profile image preview updated. Server save is still required.", "good");
  }
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-sync-hud]")) {
    heartLifecycle("HUD_RESYNCED", "Resync requested.");
  }
}, true);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    heartLifecycle("HUD_VISIBLE");
  } else {
    heartLifecycle("HUD_HIDDEN");
  }
});

document.addEventListener("input", heartMarkActivity);
document.addEventListener("keydown", heartMarkActivity);

window.neuraHeart = Object.freeze({
  speak: heartSpeak,
  lifecycle: heartLifecycle,
  markActivity: heartMarkActivity,
  build: 1007,
  feature: "NEURA_HEART"
});

syncHeartMood();
syncHeartNotify();
setupHeartObservers();
clearHeartSpeech();
window.setTimeout(() => {
  if (navigationKind() === "reload") heartLifecycle("HUD_RELOADED", "Reload complete. Systems are resynced.");
  else heartLifecycle("HUD_OPENED", "Neura HUD is open.");
}, 450);
window.setInterval(checkHeartTime, 15000);
window.setInterval(checkHeartIdle, 15000);
