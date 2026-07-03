// =====================================================//
// Name of script: neura-hud-ui
// Build: 1050
// Update: Profile Split
// Pattern: Hud/Neura Hud UI.lsl -> Web/neura-build-1001.html -> Web/neura-hud-ui.css -> Web/neura-hud-ui.js
// Date and time: 2026-07-02 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

const uiLinkPattern = Object.freeze({
  pattern: "UI_LSL_TO_HTML_CSS_JS",
  build: 1048,
  lsl: "Hud/Neura Hud UI.lsl",
  html: "Web/neura-build-1001.html",
  css: "Web/neura-hud-ui.css",
  js: "Web/neura-hud-ui.js",
  bridge: "Web Bridge/neura-hud-ui.js"
});

window.neuraHudUiPattern = uiLinkPattern;

const state = {
  activeTab: "home",
  activeAction: "",
  profileReady: false,
  serverOnline: false
};

const actionTitles = {
  notify: "Notifications",
  settings: "Settings"
};

function setActiveTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tab);
  });
  document.querySelectorAll("[data-view]").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === tab);
  });
}

function renderGate() {
  const gate = document.querySelector("[data-setup-gate]");
  if (gate) gate.hidden = state.profileReady;
  const lock = document.querySelector("[data-profile-lock]");
  if (lock) lock.textContent = state.profileReady ? "Unlocked" : "Locked";
}

function openActionWindow(action) {
  if (!actionTitles[action]) return;
  const windowNode = document.querySelector("[data-action-window]");
  if (windowNode && state.activeAction === action && !windowNode.hidden) {
    closeActionWindow();
    return;
  }
  state.activeAction = action;
  const titleNode = document.querySelector("[data-action-window-title]");
  if (titleNode) titleNode.textContent = actionTitles[action];
  document.querySelectorAll("[data-action-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.actionPanel === action);
  });
  if (windowNode) {
    windowNode.hidden = false;
    windowNode.classList.remove("is-opening");
    void windowNode.offsetWidth;
    windowNode.classList.add("is-opening");
  }
  syncActionButtons();
}

function closeActionWindow() {
  state.activeAction = "";
  const windowNode = document.querySelector("[data-action-window]");
  if (windowNode) {
    windowNode.classList.remove("is-opening");
    windowNode.hidden = true;
  }
  document.querySelectorAll("[data-action-panel]").forEach((panel) => {
    panel.classList.remove("is-active");
  });
  syncActionButtons();
}

function syncActionButtons() {
  const windowNode = document.querySelector("[data-action-window]");
  const hasOpenWindow = Boolean(windowNode && !windowNode.hidden && state.activeAction);
  document.querySelectorAll("[data-action]").forEach((button) => {
    const isActive = hasOpenWindow && button.dataset.action === state.activeAction;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-expanded", String(isActive));
  });
}

function tickClock() {
  const node = document.querySelector("[data-neura-time]");
  if (!node) return;
  const now = new Date();
  node.textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-sync-hud]")) {
    window.location.reload();
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    openActionWindow(actionButton.dataset.action || "");
    return;
  }
  if (event.target.closest("[data-action-close]")) {
    closeActionWindow();
    return;
  }
  const tabButton = event.target.closest("[data-tab]");
  if (!tabButton) return;
  setActiveTab(tabButton.dataset.tab || "home");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (state.activeAction) {
    closeActionWindow();
  }
});

renderGate();
tickClock();
window.setInterval(tickClock, 30000);
