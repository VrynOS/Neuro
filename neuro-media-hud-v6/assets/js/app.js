const BRIDGE_PREFIX = "NEURO_GATEWAY|";

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
    location: "Chi-Core",
    avatar: "01"
  },
  notifications: []
};

const avatarPath = (id) => `assets/img/avatars/avatar-${id}.png`;

const notificationIcons = {
  avatar: "#icon-profile",
  profile: "#icon-id",
  location: "#icon-location",
  bridge: "#icon-bell"
};

function logBridge(line) {
  const log = document.querySelector("#bridge-log");
  if (!log) return;
  log.textContent = `${line}\n${log.textContent}`.trim();
}

function sendBridge(op, text = "", notify = true) {
  const tick = Date.now().toString();
  const query = new URLSearchParams({
    op,
    text,
    tick
  }).toString();

  window.parent.postMessage(`${BRIDGE_PREFIX}${query}`, "*");
  logBridge(`sent: ${op}`);
  if (notify) addNotification("bridge", "Command Sent", op);
}

function loadSavedProfile() {
  try {
    const saved = JSON.parse(window.localStorage.getItem("neuroProfile") || "{}");
    state.profile = { ...state.profile, ...saved };
  } catch {
    window.localStorage.removeItem("neuroProfile");
  }
}

function saveProfile() {
  try {
    window.localStorage.setItem("neuroProfile", JSON.stringify(state.profile));
  } catch {
    logBridge("profile: local save skipped");
  }
}

function addNotification(type, title, detail) {
  const stamp = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  state.notifications.unshift({
    type,
    title,
    detail,
    stamp
  });
  state.notifications = state.notifications.slice(0, 1);
  renderNotifications();
}

function renderNotifications() {
  const list = document.querySelector("[data-notification-list]");
  if (!list) return;
  list.innerHTML = state.notifications.map((item) => `
    <article class="notification-item">
      <span><svg><use href="${notificationIcons[item.type] || notificationIcons.bridge}"></use></svg></span>
      <div>
        <strong>${item.title}</strong>
        <small>${item.detail} - ${item.stamp}</small>
      </div>
    </article>
  `).join("");
}

function renderProfile() {
  document.querySelectorAll("[data-profile-field]").forEach((node) => {
    const key = node.dataset.profileField;
    if (key in state.profile) node.textContent = state.profile[key];
  });

  document.querySelectorAll("[data-avatar-display]").forEach((image) => {
    image.src = avatarPath(state.profile.avatar);
  });

  document.querySelectorAll("[data-avatar-id]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.avatarId === state.profile.avatar);
  });

  document.querySelectorAll("[data-profile-location]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.profileLocation === state.profile.location);
  });
}

function selectAvatar(id) {
  state.profile.avatar = id;
  saveProfile();
  renderProfile();
  addNotification("avatar", "Avatar Updated", `Profile avatar ${Number(id)} active`);
}

function setProfileLocation(location) {
  state.profile.location = location;
  saveProfile();
  renderProfile();
  addNotification("location", "Location Updated", location);
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

function statIcon(stateName) {
  if (stateName === "low") return "#icon-stat-low";
  if (stateName === "mid") return "#icon-stat-mid";
  return "#icon-stat-good";
}

function updateStatRow(row) {
  const valueText = row.dataset.value || row.querySelector("strong")?.textContent || "0";
  const value = Number.parseInt(valueText, 10);
  const stateName = statState(Number.isFinite(value) ? value : 0);
  const use = row.querySelector(".stat-icon use");

  row.classList.toggle("is-good", stateName === "good");
  row.classList.toggle("is-mid", stateName === "mid");
  row.classList.toggle("is-low", stateName === "low");
  row.dataset.state = stateName;
  if (use) use.setAttribute("href", statIcon(stateName));
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
  const avatarButton = event.target.closest("[data-avatar-id]");
  if (avatarButton) {
    selectAvatar(avatarButton.dataset.avatarId);
    return;
  }

  const locationButton = event.target.closest("[data-profile-location]");
  if (locationButton) {
    setProfileLocation(locationButton.dataset.profileLocation);
    sendBridge("edit-profile", locationButton.dataset.profileLocation, false);
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

  const eyeButton = event.target.closest("[data-wallet-eye]");
  if (eyeButton) {
    toggleBalance(eyeButton.dataset.walletEye);
  }
});

window.addEventListener("message", (event) => {
  const data = String(event.data || "");
  if (!data.startsWith("NEURO_GATEWAY_ACK|")) return;
  const parts = data.split("|");
  logBridge(`${parts[1] || "ack"}: LSL ${parts[2] || "?"} ${parts.slice(3).join("|")}`);
  addNotification("bridge", "LSL Ack", parts[2] || "Gateway ready");
});

document.querySelectorAll("[data-balance]").forEach((balance) => {
  balance.dataset.original = balance.textContent;
});

setupStats();
loadSavedProfile();
renderProfile();
addNotification("profile", "Profile Loaded", `${state.profile.name} - ${state.profile.location}`);
setupClock();
