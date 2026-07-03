// =====================================================//
// Name of script: neura-health
// Build: 1001
// Update: Sex Gated Health Display
// Date and time: 2026-07-02 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

const healthSections = Object.freeze({
  female: ["overview", "self-care", "cycle", "pregnancy", "birth-control", "plan-b"],
  male: ["overview", "care", "fitness", "records"],
  unknown: ["overview"]
});

const healthLabels = Object.freeze({
  female: {
    audience: "Women's Health",
    title: "Women's Health is ready for server data.",
    summary: "Cycle, pregnancy, birth control, Plan B, and self care stay visible only for female profiles.",
    mode: "Women"
  },
  male: {
    audience: "Men's Health",
    title: "Men's Health is ready for server data.",
    summary: "Care, fitness, and records stay visible only for male profiles.",
    mode: "Men"
  },
  unknown: {
    audience: "Profile setup required",
    title: "Set profile sex to unlock Health.",
    summary: "Female profiles open women-specific health tools. Male profiles open men-specific health tools.",
    mode: "Locked"
  }
});

const healthState = {
  activeMode: "overview",
  sex: "unknown",
  bridgeOnline: false,
  data: {}
};

function healthSetText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function healthText(value, fallback = "--") {
  if (value === null || value === undefined) return fallback;
  const clean = String(value).trim();
  if (!clean || clean === "JSON_INVALID") return fallback;
  if (clean === "not_connected") return "Server Pending";
  return clean;
}

function normalizeHealthSex(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (clean === "female") return "female";
  if (clean === "male") return "male";
  return "unknown";
}

function healthSectionsFor(sex) {
  return healthSections[sex] || healthSections.unknown;
}

function parseHealthPayload(message) {
  const data = {};
  String(message || "").split("|").slice(1).forEach((part) => {
    const index = part.indexOf("=");
    if (index <= 0) return;
    data[part.slice(0, index)] = part.slice(index + 1);
  });
  return data;
}

function localProfileSex() {
  try {
    return normalizeHealthSex(window.neuraProfile?.payload?.().sex);
  } catch (_error) {
    return "unknown";
  }
}

function setHealthMode(mode) {
  const allowed = healthSectionsFor(healthState.sex);
  healthState.activeMode = allowed.includes(mode) ? mode : allowed[0];

  document.querySelectorAll("[data-health-mode]").forEach((button) => {
    const isActive = button.dataset.healthMode === healthState.activeMode;
    button.classList.toggle("is-active", isActive);
  });

  document.querySelectorAll("[data-health-panel]").forEach((panel) => {
    const isActive = panel.dataset.healthPanel === healthState.activeMode;
    panel.classList.toggle("is-active", isActive);
  });
}

function renderHealthAudience() {
  const shell = document.querySelector("[data-health-shell]");
  const labels = healthLabels[healthState.sex] || healthLabels.unknown;
  const allowed = healthSectionsFor(healthState.sex);

  if (shell) {
    shell.dataset.healthSex = healthState.sex;
    shell.dataset.healthBridge = healthState.bridgeOnline ? "online" : "offline";
  }

  document.querySelectorAll("[data-health-audience]").forEach((node) => {
    const audience = node.dataset.healthAudience;
    node.hidden = audience !== healthState.sex;
  });

  document.querySelectorAll("[data-health-mode]").forEach((button) => {
    button.hidden = !allowed.includes(button.dataset.healthMode || "");
  });

  healthSetText("[data-health-audience-label]", labels.audience);
  healthSetText("[data-health-kicker]", healthState.bridgeOnline ? "Server linked" : "Server gated");
  healthSetText("[data-health-title]", labels.title);
  healthSetText("[data-health-summary]", labels.summary);
  healthSetText("[data-health-overview-label]", labels.audience);
  healthSetText("[data-health-overview-title]", labels.title);
  healthSetText('[data-health-value="mode"]', labels.mode);
  healthSetText('[data-health-value="bridge"]', healthState.bridgeOnline ? "Online" : "Offline");

  setHealthMode(healthState.activeMode);
}

function renderHealthValues() {
  const data = healthState.data;
  const pairs = {
    care: healthText(data.care),
    hygiene: healthText(data.hygiene),
    stamina: healthText(data.stamina),
    lastActivity: healthText(data.lastActivity),
    selfCareStatus: healthText(data.selfCareStatus),
    skinCare: healthText(data.skinCare),
    skinProduct: healthText(data.skinProduct),
    multivitamin: healthText(data.multivitamin),
    cycleStatus: healthText(data.cycleStatus),
    cycleDay: healthText(data.cycleDay),
    pain: healthText(data.pain),
    cycleNext: healthText(data.cycleNext),
    pregnancyStatus: healthText(data.pregnancyStatus),
    pregnancyPhase: healthText(data.pregnancyPhase),
    pregnancyDay: healthText(data.pregnancyDay),
    pregnancyLeft: healthText(data.pregnancyLeft),
    birthControlStatus: healthText(data.birthControlStatus),
    birthControlProtected: healthText(data.birthControlProtected),
    birthControlLastTaken: healthText(data.birthControlLastTaken),
    birthControlTimeLeft: healthText(data.birthControlTimeLeft),
    planBTimesTaken: healthText(data.planBTimesTaken),
    planBLastTaken: healthText(data.planBLastTaken),
    planBLastUseStatus: healthText(data.planBLastUseStatus),
    maleCareStatus: healthText(data.maleCareStatus),
    maleDailyVitamin: healthText(data.maleDailyVitamin),
    maleHair: healthText(data.maleHair),
    maleNextCare: healthText(data.maleNextCare),
    fitnessStatus: healthText(data.fitnessStatus),
    lastWorkout: healthText(data.lastWorkout),
    workoutType: healthText(data.workoutType),
    fitnessXp: healthText(data.fitnessXp),
    recordVitamin: healthText(data.recordVitamin),
    recordHair: healthText(data.recordHair),
    recordWorkout: healthText(data.recordWorkout),
    recordGymVisit: healthText(data.recordGymVisit)
  };

  Object.entries(pairs).forEach(([key, value]) => {
    healthSetText(`[data-health-value="${key}"]`, value);
  });
}

function renderHealth(payload = {}) {
  healthState.data = { ...healthState.data, ...payload };
  healthState.sex = normalizeHealthSex(payload.sex || healthState.data.sex || localProfileSex());
  healthState.bridgeOnline = Boolean(payload.feature === "NEURA_HEALTH" || healthState.bridgeOnline);
  renderHealthAudience();
  renderHealthValues();
}

function receiveHealth(message) {
  const payload = typeof message === "string" ? parseHealthPayload(message) : message;
  if (!payload || payload.feature !== "NEURA_HEALTH") return;
  renderHealth(payload);
}

function syncHealthFromProfile() {
  if (healthState.bridgeOnline) return;
  const sex = localProfileSex();
  if (sex === healthState.sex) return;
  healthState.sex = sex;
  renderHealthAudience();
}

document.addEventListener("click", (event) => {
  const modeButton = event.target.closest("[data-health-mode]");
  if (modeButton) {
    setHealthMode(modeButton.dataset.healthMode || "overview");
    return;
  }

  const commandButton = event.target.closest("[data-health-command]");
  if (!commandButton) return;

  const section = commandButton.dataset.healthCommand || "overview";
  document.dispatchEvent(new CustomEvent("neura:health-command", {
    detail: {
      feature: "NEURA_HEALTH",
      section,
      sex: healthState.sex
    }
  }));
});

document.addEventListener("input", syncHealthFromProfile);
document.addEventListener("change", syncHealthFromProfile);

window.neuraHealth = Object.freeze({
  build: 1001,
  feature: "NEURA_HEALTH",
  receive: receiveHealth,
  render: renderHealth,
  command: (section) => document.dispatchEvent(new CustomEvent("neura:health-command", {
    detail: {
      feature: "NEURA_HEALTH",
      section,
      sex: healthState.sex
    }
  }))
});

renderHealth();
