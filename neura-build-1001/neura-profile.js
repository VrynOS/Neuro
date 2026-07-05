// =====================================================//
// Name of script: neura-profile
// Build: 1010
// Update: Avatar Save Lock
// Date and time: 2026-07-02 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

const PROFILE_FEATURE = "NEURA_PROFILE";
const PROFILE_NEURON_FEATURE = "NEURA_PROFILE_NEURON";
const PROFILE_SCHEMA = "1";

const profileState = {
  selectedAvatarSrc: "",
  pendingAvatarSrc: "",
  profileReady: false,
  serverReady: false,
  identityReady: false,
  editingProfile: false,
  bridgeOnline: false,
  pendingSaveAvatarSrc: "",
  lastCommand: null,
  lastServerPayload: {},
  lastIdentityPayload: {}
};

const zodiacProfiles = {
  aries: ["Aries", "Fire", "Bold / Direct / Driven", "Fast spark. First move."],
  taurus: ["Taurus", "Earth", "Grounded / Loyal / Steady", "Built slow. Built to last."],
  gemini: ["Gemini", "Air", "Curious / Social / Sharp", "Two signals. One mind."],
  cancer: ["Cancer", "Water", "Protective / Intuitive / Deep", "Soft shell. Strong current."],
  leo: ["Leo", "Fire", "Radiant / Proud / Warm", "Presence enters before words."],
  virgo: ["Virgo", "Earth", "Precise / Helpful / Focused", "Every detail has a place."],
  libra: ["Libra", "Air", "Balanced / Charming / Fair", "Harmony with a backbone."],
  scorpio: ["Scorpio", "Water", "Intense / Private / Loyal", "Quiet surface. Deep power."],
  sagittarius: ["Sagittarius", "Fire", "Free / Honest / Restless", "Truth moves forward."],
  capricorn: ["Capricorn", "Earth", "Strategic / Patient / Resilient", "Long climb. Clear crown."],
  aquarius: ["Aquarius", "Air", "Original / Future / Detached", "Different frequency. Clean signal."],
  pisces: ["Pisces", "Water", "Dreaming / Kind / Fluid", "Feeling finds the path."]
};

function profileValue(value, fallback) {
  const cleaned = String(value || "").trim();
  return cleaned || fallback;
}

function profileSelectValue(value, fallback) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return fallback;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function setSwatch(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.style.background = value;
}

function setProfileBridgeStatus(message) {
  setText("[data-profile-bridge-status]", message);
}

function setProfileSaveEnabled(enabled) {
  const saveButton = document.querySelector("[data-profile-save]");
  if (saveButton) saveButton.disabled = !enabled;
}

function setProfileRefreshEnabled(enabled) {
  const refreshButton = document.querySelector("[data-profile-refresh]");
  if (refreshButton) refreshButton.disabled = !enabled;
}

function profileIsTrue(value) {
  const text = String(value || "").trim().toLowerCase();
  return text === "1" || text === "true" || text === "ready" || text === "yes";
}

function profileGatewayCanPost() {
  const params = new URLSearchParams(window.location.search);
  return params.get("bridge") === "sl" && window.parent && window.parent !== window;
}

function profileUpdatedLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "--";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function normalizeProfileAvatarSrc(src) {
  let value = String(src || "").trim();
  if (!value) return "";

  try {
    value = decodeURIComponent(value);
  } catch {
    value = value.replace(/%20/g, " ");
  }

  const marker = "Images/";
  const markerAt = value.toLowerCase().indexOf(marker.toLowerCase());
  if (markerAt !== -1) value = `${marker}${value.slice(markerAt + marker.length)}`;

  const pngAt = value.toLowerCase().indexOf(".png");
  if (pngAt !== -1) value = value.slice(0, pngAt + 4);

  return value.replace(/\\/g, "/").trim();
}

function syncProfileAvatarValue(src = profileState.selectedAvatarSrc) {
  const field = document.querySelector("[data-profile-avatar-value]");
  if (field) field.value = normalizeProfileAvatarSrc(src);
}

function profilePreviewAvatarSrc() {
  const preview = document.querySelector("[data-profile-avatar-preview]");
  const current = document.querySelector("[data-avatar-current-preview]");
  return normalizeProfileAvatarSrc(
    profileState.selectedAvatarSrc
      || preview?.getAttribute("src")
      || current?.getAttribute("src")
      || ""
  );
}

function renderProfileMode() {
  const shell = document.querySelector("[data-profile-shell]");
  if (!shell) return;
  const savedProfileReady = profileState.serverReady && profileState.identityReady;
  const mode = savedProfileReady && !profileState.editingProfile ? "view" : "setup";
  shell.dataset.profileMode = mode;
  shell.dataset.profileServerReady = savedProfileReady ? "1" : "0";
}

function updateProfileLock() {
  const lock = document.querySelector("[data-profile-lock]");
  if (!lock) return;

  const synced = profileState.serverReady && profileState.identityReady && !profileState.editingProfile;
  lock.textContent = synced ? "Synced" : profileState.profileReady ? "Ready" : "Locked";
  lock.classList.toggle("is-offline", !synced && !profileState.profileReady);
  lock.classList.toggle("is-synced", synced);
}

function syncProfileReady() {
  const form = document.querySelector("[data-profile-form]");
  if (!form) return false;
  const data = new FormData(form);
  const required = ["displayName", "age", "sex", "location"];
  const hasRequired = required.every((name) => String(data.get(name) || "").trim());
  profileState.profileReady = hasRequired;
  updateProfileLock();
  setProfileSaveEnabled(profileState.profileReady);
  renderProfileMode();
  return profileState.profileReady;
}

function syncStaminaPreview(staminaValue = "0", staminaGoalValue = "100") {
  const staminaNumber = Number.parseInt(staminaValue, 10);
  const goalNumber = Number.parseInt(staminaGoalValue, 10);
  const stamina = Number.isFinite(staminaNumber) ? String(staminaNumber) : "0";
  const goal = Number.isFinite(goalNumber) && goalNumber > 0 ? String(goalNumber) : "100";
  const percent = Math.max(0, Math.min(100, (Number(stamina) / Number(goal)) * 100));
  const bar = document.querySelector("[data-profile-stamina-bar]");
  setText("[data-profile-stamina]", stamina);
  setText("[data-profile-stamina-goal]", goal);
  if (bar) bar.style.setProperty("--stamina", `${percent}%`);
}

function syncProfilePreview() {
  const shell = document.querySelector("[data-profile-shell]");
  const form = document.querySelector("[data-profile-form]");
  if (!shell || !form) return;

  const data = new FormData(form);
  const displayName = profileValue(data.get("displayName"), "Profile Setup Required");
  const age = profileValue(data.get("age"), "Age Not Set");
  const sex = profileSelectValue(data.get("sex"), "Sex Not Set");
  const role = profileValue(data.get("role"), "Not Set");
  const location = profileValue(data.get("location"), "Not Set");
  const accent = profileValue(data.get("accentColor"), "#2fc7ff");
  const background = profileValue(data.get("backgroundColor"), "#061725");
  const bio = profileValue(data.get("bio"), "No bio set.");
  const stamina = profileValue(data.get("stamina"), "0");
  const staminaGoal = profileValue(data.get("staminaGoal"), "100");
  const avatar = normalizeProfileAvatarSrc(data.get("avatar") || profilePreviewAvatarSrc());
  const updated = profileState.lastServerPayload.updated || profileState.lastIdentityPayload.updated || "";

  shell.style.setProperty("--profile-accent", accent);
  shell.style.setProperty("--profile-bg", background);
  document.documentElement.style.setProperty("--profile-accent", accent);

  setText("[data-profile-display]", displayName);
  setText("[data-profile-age]", age);
  setText("[data-profile-sex]", sex);
  setText("[data-profile-role]", role);
  setText("[data-profile-location]", location);
  setText("[data-profile-bio]", bio);
  setText("[data-profile-view-status]", profileState.serverReady ? "Saved" : "Setup");
  setText("[data-profile-view-gate]", profileState.profileReady ? "Complete" : "Missing");
  setText("[data-profile-view-accent]", accent);
  setText("[data-profile-view-background]", background);
  setText("[data-profile-view-avatar]", avatar ? "Saved" : "Not Set");
  setText("[data-profile-view-updated]", profileUpdatedLabel(updated));
  setText("[data-profile-view-server]", profileState.bridgeOnline ? "Online" : "Offline");
  setText("[data-profile-view-note]", profileState.serverReady ? "Profile data saved." : "Waiting for profile save.");
  setSwatch("[data-profile-view-accent-swatch]", accent);
  setSwatch("[data-profile-view-bg-swatch]", background);

  const zodiac = String(data.get("zodiac") || "");
  const profile = zodiacProfiles[zodiac];
  const zodiacMark = document.querySelector("[data-zodiac-mark]");
  const zodiacEmpty = document.querySelector("[data-zodiac-empty]");

  if (profile && zodiacMark && zodiacEmpty) {
    zodiacMark.src = `Images/zodiac/${zodiac}.png`;
    zodiacMark.hidden = false;
    zodiacEmpty.hidden = true;
    setText("[data-zodiac-name]", profile[0]);
    setText("[data-zodiac-element]", profile[1]);
    setText("[data-zodiac-traits]", profile[2]);
    setText("[data-zodiac-line]", profile[3]);
  } else {
    zodiacMark?.removeAttribute("src");
    if (zodiacMark) zodiacMark.hidden = true;
    if (zodiacEmpty) zodiacEmpty.hidden = false;
    setText("[data-zodiac-name]", "Not Set");
    setText("[data-zodiac-element]", "--");
    setText("[data-zodiac-traits]", "--");
    setText("[data-zodiac-line]", "Waiting for server profile.");
  }

  syncProfileReady();
  syncStaminaPreview(stamina, staminaGoal);
}

function syncAvatarWindow() {
  const hasPending = Boolean(profileState.pendingAvatarSrc);
  document.querySelectorAll("[data-avatar-option]").forEach((node) => {
    const src = node.dataset.avatarOption || "";
    node.classList.toggle("is-pending", src === profileState.pendingAvatarSrc);
    node.classList.toggle("is-active", Boolean(profileState.selectedAvatarSrc) && src === profileState.selectedAvatarSrc);
  });
  const chooseButton = document.querySelector("[data-avatar-choose]");
  if (chooseButton) chooseButton.disabled = !hasPending;
  setText("[data-avatar-selection]", hasPending ? "Image ready" : "No image selected");
}

function openAvatarWindow() {
  const windowNode = document.querySelector("[data-avatar-window]");
  if (!windowNode) return;
  profileState.pendingAvatarSrc = profileState.selectedAvatarSrc;
  syncAvatarWindow();
  windowNode.hidden = false;
  windowNode.classList.remove("is-opening");
  void windowNode.offsetWidth;
  windowNode.classList.add("is-opening");
}

function closeAvatarWindow() {
  const windowNode = document.querySelector("[data-avatar-window]");
  if (!windowNode) return;
  profileState.pendingAvatarSrc = profileState.selectedAvatarSrc;
  windowNode.classList.remove("is-opening");
  windowNode.hidden = true;
  syncAvatarWindow();
}

function setPendingAvatar(src) {
  const cleanSrc = normalizeProfileAvatarSrc(src);
  if (!cleanSrc) return;
  profileState.pendingAvatarSrc = cleanSrc;
  syncAvatarWindow();
}

function setProfileAvatar(src) {
  const cleanSrc = normalizeProfileAvatarSrc(src);
  const preview = document.querySelector("[data-profile-avatar-preview]");
  const empty = document.querySelector("[data-profile-avatar-empty]");
  if (!preview) return;

  if (!cleanSrc) {
    profileState.selectedAvatarSrc = "";
    preview.removeAttribute("src");
    preview.hidden = true;
    if (empty) empty.hidden = false;

    const currentPreview = document.querySelector("[data-avatar-current-preview]");
    const currentEmpty = document.querySelector("[data-avatar-current-empty]");
    if (currentPreview) {
      currentPreview.removeAttribute("src");
      currentPreview.hidden = true;
    }
    if (currentEmpty) currentEmpty.hidden = false;
    setText("[data-avatar-current-label]", "No image selected");
    syncProfileAvatarValue("");
    syncAvatarWindow();
    syncProfileReady();
    return;
  }

  profileState.selectedAvatarSrc = cleanSrc;
  syncProfileAvatarValue(cleanSrc);
  preview.src = cleanSrc;
  preview.hidden = false;
  if (empty) empty.hidden = true;

  const currentPreview = document.querySelector("[data-avatar-current-preview]");
  const currentEmpty = document.querySelector("[data-avatar-current-empty]");
  if (currentPreview) {
    currentPreview.src = cleanSrc;
    currentPreview.hidden = false;
  }
  if (currentEmpty) currentEmpty.hidden = true;
  setText("[data-avatar-current-label]", "Image selected");
  syncAvatarWindow();
  syncProfileReady();
}

function choosePendingAvatar() {
  if (!profileState.pendingAvatarSrc) return;
  setProfileAvatar(profileState.pendingAvatarSrc);
  closeAvatarWindow();
}

function profilePayload() {
  const form = document.querySelector("[data-profile-form]");
  if (!form) return {};
  const data = new FormData(form);
  return {
    displayName: String(data.get("displayName") || "").trim(),
    age: String(data.get("age") || "").trim(),
    sex: String(data.get("sex") || "").trim(),
    role: String(data.get("role") || "").trim(),
    district: String(data.get("location") || "").trim(),
    zodiac: String(data.get("zodiac") || "").trim(),
    accent: String(data.get("accentColor") || "").trim(),
    background: String(data.get("backgroundColor") || "").trim(),
    bio: String(data.get("bio") || "").trim(),
    stamina: String(data.get("stamina") || "0").trim(),
    staminaGoal: String(data.get("staminaGoal") || "100").trim(),
    avatar: normalizeProfileAvatarSrc(data.get("avatar") || profilePreviewAvatarSrc()),
    ready: syncProfileReady() ? "1" : "0"
  };
}

function profileCommandValue(value) {
  return String(value ?? "").replace(/[|=\r\n]/g, " ").trim();
}

function profileMessage(command, fields) {
  const parts = [command];
  Object.entries(fields).forEach(([key, value]) => {
    parts.push(`${key}=${profileCommandValue(value)}`);
  });
  return parts.join("|");
}

function profileSaveMessage(payload = profilePayload()) {
  return profileMessage("NEURA_PROFILE_SAVE", {
    feature: PROFILE_FEATURE,
    schema: PROFILE_SCHEMA,
    displayName: payload.displayName,
    age: payload.age,
    sex: payload.sex,
    role: payload.role,
    district: payload.district,
    zodiac: payload.zodiac,
    bio: payload.bio,
    avatar: payload.avatar,
    avatarPath: payload.avatar,
    image: payload.avatar,
    accent: payload.accent,
    background: payload.background,
    stamina: payload.stamina,
    staminaGoal: payload.staminaGoal
  });
}

function profileReadMessages() {
  return [
    profileMessage("NEURA_PROFILE_READ", {
      feature: PROFILE_FEATURE,
      schema: PROFILE_SCHEMA
    }),
    profileMessage("NEURA_PROFILE_NEURON_READ", {
      feature: PROFILE_NEURON_FEATURE,
      schema: PROFILE_SCHEMA
    })
  ];
}

function dispatchProfileCommand(action, messages, payload = profilePayload()) {
  const detail = {
    feature: PROFILE_FEATURE,
    action,
    message: messages[0] || "",
    messages,
    payload,
    updated: new Date().toISOString()
  };
  profileState.lastCommand = detail;
  document.dispatchEvent(new CustomEvent("neura:profile-command", { detail }));
  return detail;
}

function sendProfileSave() {
  syncProfilePreview();
  if (!profileState.profileReady) {
    setProfileBridgeStatus("Name, age, sex, and district required");
    window.neuraHeart?.speak?.("Profile", "Profile setup needs name, age, sex, and district.", "alert");
    return;
  }

  if (!profileGatewayCanPost()) {
    setProfileBridgeStatus("Profile bridge offline");
    window.neuraHeart?.speak?.("Profile Bridge", "Open the HUD through the media bridge before saving to the server.", "alert");
    return;
  }

  const payload = profilePayload();
  profileState.pendingSaveAvatarSrc = payload.avatar;
  dispatchProfileCommand("save", [profileSaveMessage(payload)], payload);
  setProfileBridgeStatus("Profile save sent to HUD");
  window.neuraHeart?.speak?.("Profile Save", "Profile data was sent to the Profile HUD bridge.", "good");
}

function sendProfileRead() {
  const payload = profilePayload();
  dispatchProfileCommand("read", profileReadMessages(), payload);
  setProfileBridgeStatus("Profile read requested");
  window.neuraHeart?.speak?.("Profile Sync", "Profile read request sent to the HUD.", "calm");
}

function parseProfilePayload(message) {
  const data = {};
  String(message || "").split("|").slice(1).forEach((part) => {
    const index = part.indexOf("=");
    if (index <= 0) return;
    data[part.slice(0, index)] = part.slice(index + 1);
  });
  return data;
}

function profileCommandName(message, payload = {}) {
  if (typeof message === "string") return String(message).split("|")[0] || "";
  return payload.command || payload.type || "";
}

function setProfileFormValue(name, value) {
  const form = document.querySelector("[data-profile-form]");
  const field = form?.elements?.[name];
  if (!field || value === undefined || value === null) return;
  field.value = String(value);
}

function applyProfileData(payload = {}) {
  profileState.lastServerPayload = { ...payload };
  profileState.serverReady = profileIsTrue(payload.ready);
  if (profileState.serverReady) profileState.editingProfile = false;

  if (payload.age !== undefined) setProfileFormValue("age", payload.age);
  if (payload.sex !== undefined) setProfileFormValue("sex", String(payload.sex).toLowerCase());
  if (payload.role !== undefined) setProfileFormValue("role", payload.role);
  if (payload.district !== undefined) setProfileFormValue("location", payload.district);
  if (payload.zodiac !== undefined) setProfileFormValue("zodiac", String(payload.zodiac).toLowerCase());
  if (payload.accent !== undefined) setProfileFormValue("accentColor", payload.accent);
  if (payload.background !== undefined) setProfileFormValue("backgroundColor", payload.background);
  if (payload.bio !== undefined) setProfileFormValue("bio", payload.bio);
  if (payload.stamina !== undefined) setProfileFormValue("stamina", payload.stamina);
  if (payload.staminaGoal !== undefined) setProfileFormValue("staminaGoal", payload.staminaGoal);
  if (payload.avatar) {
    setProfileAvatar(payload.avatar);
    profileState.pendingSaveAvatarSrc = "";
  } else if (profileState.pendingSaveAvatarSrc) {
    setProfileAvatar(profileState.pendingSaveAvatarSrc);
  }
  profileState.bridgeOnline = true;
  setProfileRefreshEnabled(true);
  setProfileBridgeStatus(profileState.serverReady ? "Profile synced" : "Profile setup required");
  syncProfilePreview();
  document.querySelector("[data-profile-form]")?.dispatchEvent(new Event("change", { bubbles: true }));
}

function applyProfileIdentity(payload = {}) {
  profileState.lastIdentityPayload = { ...payload };
  if (payload.displayName !== undefined) setProfileFormValue("displayName", payload.displayName);
  profileState.identityReady = Boolean(String(payload.displayName || "").trim());
  profileState.bridgeOnline = true;
  setProfileRefreshEnabled(true);
  if (payload.displayName) setProfileBridgeStatus("Identity synced");
  syncProfilePreview();
  document.querySelector("[data-profile-form]")?.dispatchEvent(new Event("change", { bubbles: true }));
}

function receiveProfile(message) {
  const payload = typeof message === "string" ? parseProfilePayload(message) : { ...(message || {}) };
  const command = profileCommandName(message, payload);

  if (command === "NEURA_PROFILE_HANDSHAKE_OK") {
    profileState.bridgeOnline = true;
    setProfileRefreshEnabled(true);
    setProfileBridgeStatus("Profile bridge online");
    return;
  }

  if (command === "NEURA_PROFILE_NEURON_HANDSHAKE_OK") {
    profileState.bridgeOnline = true;
    setProfileRefreshEnabled(true);
    setProfileBridgeStatus("Identity bridge online");
    return;
  }

  if (command === "NEURA_PROFILE_SAVE_OK") {
    profileState.bridgeOnline = true;
    if (payload.avatar) {
      setProfileAvatar(payload.avatar);
      profileState.pendingSaveAvatarSrc = "";
    }
    setProfileBridgeStatus("Profile saved. Waiting for server profile.");
    return;
  }

  if (command === "NEURA_PROFILE_NEURON_SAVE_OK") {
    profileState.bridgeOnline = true;
    setProfileBridgeStatus("Identity saved");
    return;
  }

  if (command === "NEURA_PROFILE_DATA" && payload.feature === PROFILE_FEATURE) {
    applyProfileData(payload);
    return;
  }

  if (command === "NEURA_PROFILE_NEURON_DATA" && payload.feature === PROFILE_NEURON_FEATURE) {
    applyProfileIdentity(payload);
    return;
  }

  if (command === "NEURA_PROFILE_ERROR" || command === "NEURA_PROFILE_NEURON_ERROR") {
    setProfileBridgeStatus(`Profile error: ${payload.reason || "unknown"}`);
  }
}

function setupProfilePreview() {
  const form = document.querySelector("[data-profile-form]");
  if (!form) return;

  form.addEventListener("input", syncProfilePreview);
  form.addEventListener("change", syncProfilePreview);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendProfileSave();
  });

  document.querySelector("[data-profile-refresh]")?.addEventListener("click", sendProfileRead);
  document.querySelector("[data-profile-edit]")?.addEventListener("click", () => {
    profileState.editingProfile = true;
    renderProfileMode();
    updateProfileLock();
    setProfileBridgeStatus("Editing saved profile");
    window.neuraHeart?.speak?.("Profile", "Profile editor is open.", "calm");
  });

  syncProfilePreview();
  syncAvatarWindow();
  syncProfileAvatarValue();
  setProfileBridgeStatus("Profile bridge offline");
  setProfileRefreshEnabled(true);
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-avatar-more]")) {
    openAvatarWindow();
    return;
  }

  const avatarOption = event.target.closest("[data-avatar-option]");
  if (avatarOption) {
    setPendingAvatar(avatarOption.dataset.avatarOption || "");
    return;
  }

  if (event.target.closest("[data-avatar-choose]")) {
    choosePendingAvatar();
    return;
  }

  if (event.target.closest("[data-avatar-close]")) {
    closeAvatarWindow();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const avatarWindow = document.querySelector("[data-avatar-window]");
  if (avatarWindow && !avatarWindow.hidden) closeAvatarWindow();
});

window.neuraProfile = Object.freeze({
  build: 1010,
  feature: PROFILE_FEATURE,
  payload: profilePayload,
  messages: () => ({
    save: profileSaveMessage(),
    read: profileReadMessages()
  }),
  save: sendProfileSave,
  read: sendProfileRead,
  receive: receiveProfile,
  sync: syncProfilePreview,
  setAvatar: setProfileAvatar,
  mode: () => (profileState.serverReady && profileState.identityReady && !profileState.editingProfile ? "view" : "setup"),
  serverReady: () => profileState.serverReady,
  lastCommand: () => profileState.lastCommand
});

setupProfilePreview();
