// =====================================================//
// Name of script: neura-profile
// Build: 1030
// Update: Stable Profile Picker Close
// Date and time: 2026-07-02 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

const PROFILE_FEATURE = "NEURA_PROFILE";
const PROFILE_NEURON_FEATURE = "NEURA_PROFILE_NEURON";
const XP_FEATURE = "NEURA_XP";
const PROFILE_SCHEMA = "1";

const profileState = {
  selectedAvatar: "pro",
  pendingAvatar: "pro",
  selectedSigil: "core",
  pendingSigil: "core",
  profileReady: false,
  serverReady: false,
  identityReady: false,
  editingProfile: false,
  bridgeOnline: false,
  pendingSaveAvatar: "",
  pendingSaveSigil: "",
  lastCommand: null,
  lastServerPayload: {},
  lastIdentityPayload: {},
  lastXpPayload: {}
};

const zodiacProfiles = {
  aries: ["Aries", "Fire", "Bold / Direct / Driven", "Fast spark. First move.", "Aries carries first-move fire, pushing toward action, courage, and a life that rarely waits for permission."],
  taurus: ["Taurus", "Earth", "Grounded / Loyal / Steady", "Built slow. Built to last.", "Taurus is rooted earth energy, known for loyalty, comfort, patience, and a steady will that becomes hard to move."],
  gemini: ["Gemini", "Air", "Curious / Social / Sharp", "Two signals. One mind.", "Gemini moves through ideas quickly, carrying air energy that makes conversation, curiosity, and change feel natural."],
  cancer: ["Cancer", "Water", "Protective / Intuitive / Deep", "Soft shell. Strong current.", "Cancer is protective water energy, deeply tied to memory, home, intuition, and the people it chooses to guard."],
  leo: ["Leo", "Fire", "Radiant / Proud / Warm", "Presence enters before words.", "Leo carries warm fire, bringing confidence, creative pride, and a natural pull toward being seen and remembered."],
  virgo: ["Virgo", "Earth", "Precise / Helpful / Focused", "Every detail has a place.", "Virgo is careful earth energy, shaped by detail, service, improvement, and the quiet power of getting things right."],
  libra: ["Libra", "Air", "Balanced / Charming / Fair", "Harmony with a backbone.", "Libra carries air through balance, beauty, and social instinct, always reading the room for harmony and fairness."],
  scorpio: ["Scorpio", "Water", "Intense / Private / Loyal", "Quiet surface. Deep power.", "Scorpio is deep water energy, known for privacy, intensity, loyalty, and transformation beneath a calm surface."],
  sagittarius: ["Sagittarius", "Fire", "Free / Honest / Restless", "Truth moves forward.", "Sagittarius is known as the seeker, always moving toward truth, freedom, and the next horizon with bold fire energy."],
  capricorn: ["Capricorn", "Earth", "Strategic / Patient / Resilient", "Long climb. Clear crown.", "Capricorn is mountain earth energy, built around patience, ambition, discipline, and the long climb toward mastery."],
  aquarius: ["Aquarius", "Air", "Original / Future / Detached", "Different frequency. Clean signal.", "Aquarius carries future-minded air, often drawn to original ideas, community shifts, and a perspective slightly outside the crowd."],
  pisces: ["Pisces", "Water", "Dreaming / Kind / Fluid", "Feeling finds the path.", "Pisces is dreamlike water energy, blending empathy, imagination, and emotional depth into a soft but powerful current."]
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
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value;
  });
}

function setSwatch(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.style.background = value;
  });
}

function setSigilPreview(selector, sigil) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = sigilMark(sigil);
    node.dataset.sigil = sigil;
  });
}

const avatarProfiles = {
  pro: ["Image 1", "Images/Pro.png?v=3"],
  "pro-1": ["Image 2", "Images/Pro (1).png?v=3"],
  "pro-2": ["Image 3", "Images/Pro (2).png?v=3"],
  "pro-3": ["Image 4", "Images/Pro (3).png?v=3"],
  "pro-4": ["Image 5", "Images/Pro (4).png?v=3"],
  "pro-5": ["Image 6", "Images/Pro (5).png?v=3"],
  "pro-6": ["Image 7", "Images/Pro (6).png?v=3"],
  "pro-7": ["Image 8", "Images/Pro (7).png?v=3"],
  "pro-8": ["Image 9", "Images/Pro (8).png?v=3"]
};

function defaultProfileAvatar(sex) {
  return String(sex || "").trim().toLowerCase() === "female" ? "pro-1" : "pro";
}

function normalizeProfileAvatar(value, sex = "") {
  const avatar = String(value || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (avatarProfiles[avatar]) return avatar;
  return defaultProfileAvatar(sex);
}

function avatarLabel(value, sex = "") {
  return avatarProfiles[normalizeProfileAvatar(value, sex)][0];
}

function avatarSrc(value, sex = "") {
  return avatarProfiles[normalizeProfileAvatar(value, sex)][1];
}

function syncProfileAvatarValue(value = profileState.selectedAvatar) {
  const avatar = normalizeProfileAvatar(value);
  const field = document.querySelector("[data-profile-avatar-value]");
  if (field) field.value = avatar;
}

function currentProfileAvatar(data, sex = "") {
  return normalizeProfileAvatar(
    data?.get("avatar")
      || profileState.selectedAvatar
      || profileState.pendingAvatar,
    sex
  );
}

function syncProfilePhoto(avatar, sex = "") {
  const src = avatarSrc(avatar, sex);

  document.querySelectorAll("[data-profile-photo], [data-avatar-current-image]").forEach((photo) => {
    if (photo.getAttribute("src") !== src) photo.src = src;
  });
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

const sigilProfiles = {
  core: ["CORE", "Core"],
  spark: ["SPRK", "Spark"],
  fire: ["FIRE", "Fire"],
  wave: ["WAVE", "Wave"],
  star: ["STAR", "Star"],
  moon: ["MOON", "Moon"],
  sun: ["SUN", "Sun"],
  leaf: ["LEAF", "Leaf"],
  bolt: ["BOLT", "Bolt"],
  gem: ["GEM", "Gem"],
  crown: ["CRWN", "Crown"],
  shield: ["SHLD", "Shield"]
};

function normalizeProfileSigil(value) {
  const sigil = String(value || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  return sigilProfiles[sigil] ? sigil : "core";
}

function sigilLabel(value) {
  return sigilProfiles[normalizeProfileSigil(value)][1];
}

function sigilMark(value) {
  return sigilProfiles[normalizeProfileSigil(value)][0];
}

function syncProfileSigilValue(value = profileState.selectedSigil) {
  const sigil = normalizeProfileSigil(value);
  const field = document.querySelector("[data-profile-sigil-value]");
  if (field) field.value = sigil;
}

function currentProfileSigil(data) {
  return normalizeProfileSigil(
    data?.get("sigil")
      || profileState.selectedSigil
      || profileState.pendingSigil
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

function syncStaminaPreview(staminaValue = "0", staminaGoalValue = "100", levelValue = "1", xpValue = "0", xpGoalValue = "100") {
  const staminaNumber = Number.parseInt(staminaValue, 10);
  const goalNumber = Number.parseInt(staminaGoalValue, 10);
  const levelNumber = Number.parseInt(levelValue, 10);
  const xpNumber = Number.parseInt(xpValue, 10);
  const xpGoalNumber = Number.parseInt(xpGoalValue, 10);
  const stamina = Number.isFinite(staminaNumber) ? String(staminaNumber) : "0";
  const goal = Number.isFinite(goalNumber) && goalNumber > 0 ? String(goalNumber) : "100";
  const level = Number.isFinite(levelNumber) && levelNumber > 0 ? levelNumber : 1;
  const xp = Number.isFinite(xpNumber) && xpNumber >= 0 ? xpNumber : 0;
  const xpGoal = Number.isFinite(xpGoalNumber) && xpGoalNumber > 0 ? xpGoalNumber : 100;
  const xpPercent = Math.max(0, Math.min(100, (xp / xpGoal) * 100));
  const xpNeeded = Math.max(0, xpGoal - xp);
  const bar = document.querySelector("[data-profile-stamina-bar]");
  setText("[data-profile-stamina]", stamina);
  setText("[data-profile-stamina-goal]", goal);
  setText("[data-profile-stamina-level]", String(level));
  setText("[data-profile-stamina-xp]", String(xp));
  setText("[data-profile-stamina-xp-goal]", String(xpGoal));
  setText("[data-profile-stamina-xp-needed]", String(xpNeeded));
  setText("[data-profile-stamina-xp-percent]", `${Math.round(xpPercent)}%`);
  if (bar) bar.style.setProperty("--stamina", `${xpPercent}%`);
}

function syncXpPreview(levelValue = "1", xpValue = "0", xpGoalValue = "100") {
  const levelNumber = Number.parseInt(levelValue, 10);
  const xpNumber = Number.parseInt(xpValue, 10);
  const goalNumber = Number.parseInt(xpGoalValue, 10);
  const level = Number.isFinite(levelNumber) && levelNumber > 0 ? levelNumber : 1;
  const xp = Number.isFinite(xpNumber) && xpNumber >= 0 ? xpNumber : 0;
  const goal = Number.isFinite(goalNumber) && goalNumber > 0 ? goalNumber : 100;
  const percent = Math.max(0, Math.min(100, (xp / goal) * 100));
  const needed = Math.max(0, goal - xp);
  const bar = document.querySelector("[data-profile-xp-bar]");

  setText("[data-profile-level]", String(level));
  setText("[data-profile-xp-current]", String(xp));
  setText("[data-profile-xp-goal]", String(goal));
  setText("[data-profile-xp-needed]", String(needed));
  setText("[data-profile-xp-percent]", `${Math.round(percent)}%`);
  setText("[data-profile-verified-note]", profileIsTrue(profileState.lastXpPayload.verified) ? "Verified" : "Verify Required");
  if (bar) bar.style.width = `${percent}%`;
}

function syncProfilePreview() {
  const shell = document.querySelector("[data-profile-shell]");
  const form = document.querySelector("[data-profile-form]");
  if (!shell || !form) return;

  const data = new FormData(form);
  const displayName = profileValue(data.get("displayName"), "Profile Setup Required");
  const age = profileValue(data.get("age"), "Age Not Set");
  const sexRaw = String(data.get("sex") || "").trim().toLowerCase();
  const sex = profileSelectValue(sexRaw, "Sex Not Set");
  const role = profileValue(data.get("role"), "Not Set");
  const location = profileValue(data.get("location"), "Not Set");
  const accent = profileValue(data.get("accentColor"), "#4fd7ff");
  const background = profileValue(data.get("backgroundColor"), "#11172b");
  const stamina = profileValue(data.get("stamina"), "100");
  const staminaGoal = profileValue(data.get("staminaGoal"), "100");
  const staminaLevel = profileValue(profileState.lastServerPayload.staminaLevel || profileState.lastServerPayload.level, "1");
  const staminaXp = profileValue(profileState.lastServerPayload.staminaXp || profileState.lastServerPayload.xp, "0");
  const staminaXpGoal = profileValue(profileState.lastServerPayload.staminaXpGoal || profileState.lastServerPayload.xpGoal, "100");
  const level = profileValue(profileState.lastXpPayload.level || profileState.lastServerPayload.level, "1");
  const xp = profileValue(profileState.lastXpPayload.xp || profileState.lastServerPayload.xp, "0");
  const xpGoal = profileValue(profileState.lastXpPayload.xpNext || profileState.lastServerPayload.xpGoal, "2500");
  const sigil = currentProfileSigil(data);
  const avatar = currentProfileAvatar(data, sexRaw);
  const zodiac = String(data.get("zodiac") || "");
  const profile = zodiacProfiles[zodiac];

  shell.style.setProperty("--profile-accent", accent);
  shell.style.setProperty("--profile-bg", background);
  document.documentElement.style.setProperty("--profile-accent", accent);
  document.documentElement.style.setProperty("--profile-bg", background);

  setText("[data-profile-display]", displayName);
  setText("[data-profile-age]", age);
  setText("[data-profile-sex]", sex);
  setText("[data-profile-role]", role);
  setText("[data-profile-location]", location);
  setText("[data-profile-badge-sigil]", sigilLabel(sigil));
  setText("[data-profile-badge-sigil-symbol]", sigilMark(sigil));
  setText("[data-profile-color-sigil]", sigilLabel(sigil));
  setText("[data-profile-badge-location]", location === "Not Set" ? "District Pending" : location);
  setText("[data-profile-right-location]", location === "Not Set" ? "District Pending" : `${location} Resident`);
  setText("[data-profile-accent-value]", accent.toUpperCase());
  setText("[data-profile-bg-value]", background.toUpperCase());
  setSwatch("[data-profile-accent-swatch]", accent);
  setSwatch("[data-profile-bg-swatch]", background);
  setText("[data-avatar-current-label]", `${avatarLabel(avatar, sexRaw)} / ${sigilLabel(sigil)}`);
  syncProfilePhoto(avatar, sexRaw);

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
    setText("[data-zodiac-story]", profile[4]);
    setText("[data-profile-badge-zodiac]", profile[0]);
    setText("[data-profile-right-zodiac]", `${profile[0]} ${profile[1]}`);
  } else {
    zodiacMark?.removeAttribute("src");
    if (zodiacMark) zodiacMark.hidden = true;
    if (zodiacEmpty) zodiacEmpty.hidden = false;
    setText("[data-zodiac-name]", "Not Set");
    setText("[data-zodiac-element]", "--");
    setText("[data-zodiac-traits]", "--");
    setText("[data-zodiac-line]", "Waiting for server profile.");
    setText("[data-zodiac-story]", "Choose a zodiac sign to shape this resident identity.");
    setText("[data-profile-badge-zodiac]", "Zodiac Pending");
    setText("[data-profile-right-zodiac]", "Zodiac Pending");
  }

  syncProfileReady();
  syncStaminaPreview(stamina, staminaGoal, staminaLevel, staminaXp, staminaXpGoal);
  syncXpPreview(level, xp, xpGoal);
}

function syncAvatarWindow() {
  const hasPending = Boolean(profileState.pendingAvatar && profileState.pendingSigil);
  document.querySelectorAll("[data-avatar-image-option]").forEach((node) => {
    const avatar = normalizeProfileAvatar(node.dataset.avatarImageOption || "");
    node.classList.toggle("is-pending", avatar === profileState.pendingAvatar);
    node.classList.toggle("is-active", avatar === profileState.selectedAvatar);
  });
  document.querySelectorAll("[data-avatar-option]").forEach((node) => {
    const sigil = normalizeProfileSigil(node.dataset.avatarOption || "");
    node.classList.toggle("is-pending", sigil === profileState.pendingSigil);
    node.classList.toggle("is-active", sigil === profileState.selectedSigil);
  });
  const chooseButton = document.querySelector("[data-avatar-choose]");
  if (chooseButton) chooseButton.disabled = !hasPending;
  setText("[data-avatar-selection]", hasPending ? `${avatarLabel(profileState.pendingAvatar)} / ${sigilLabel(profileState.pendingSigil)} ready` : "No look selected");
}

function openAvatarWindow() {
  const windowNode = document.querySelector("[data-avatar-window]");
  if (!windowNode) return;
  profileState.pendingAvatar = profileState.selectedAvatar;
  profileState.pendingSigil = profileState.selectedSigil;
  syncAvatarWindow();
  windowNode.hidden = false;
  windowNode.classList.remove("is-opening");
  void windowNode.offsetWidth;
  windowNode.classList.add("is-opening");
}

function closeAvatarWindow() {
  const windowNode = document.querySelector("[data-avatar-window]");
  if (!windowNode) return;
  profileState.pendingAvatar = profileState.selectedAvatar;
  profileState.pendingSigil = profileState.selectedSigil;
  windowNode.classList.remove("is-opening");
  windowNode.hidden = true;
  syncAvatarWindow();
}

function setPendingAvatar(value) {
  const avatar = normalizeProfileAvatar(value);
  profileState.pendingAvatar = avatar;
  syncAvatarWindow();
}

function setPendingSigil(value) {
  const sigil = normalizeProfileSigil(value);
  profileState.pendingSigil = sigil;
  syncAvatarWindow();
}

function setProfileAvatar(value) {
  const avatar = normalizeProfileAvatar(value);
  profileState.selectedAvatar = avatar;
  profileState.pendingAvatar = avatar;
  syncProfileAvatarValue(avatar);
  syncProfilePhoto(avatar);
  setText("[data-avatar-current-label]", `${avatarLabel(avatar)} / ${sigilLabel(profileState.selectedSigil)}`);
  syncAvatarWindow();
  syncProfileReady();
  syncProfilePreview();
}

function setProfileSigil(value) {
  const sigil = normalizeProfileSigil(value);
  profileState.selectedSigil = sigil;
  profileState.pendingSigil = sigil;
  syncProfileSigilValue(sigil);
  setSigilPreview("[data-profile-sigil-preview]", sigil);
  setSigilPreview("[data-profile-badge-sigil-mark]", sigil);
  setSigilPreview("[data-sigil-current-preview]", sigil);
  setText("[data-avatar-current-label]", `${avatarLabel(profileState.selectedAvatar)} / ${sigilLabel(sigil)}`);
  syncAvatarWindow();
  syncProfileReady();
  syncProfilePreview();
}

function choosePendingAvatar() {
  if (!profileState.pendingAvatar || !profileState.pendingSigil) return;
  setProfileAvatar(profileState.pendingAvatar);
  setProfileSigil(profileState.pendingSigil);
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
    stamina: String(data.get("stamina") || "100").trim(),
    staminaGoal: String(data.get("staminaGoal") || "100").trim(),
    avatar: currentProfileAvatar(data, String(data.get("sex") || "")),
    sigil: currentProfileSigil(data),
    ready: syncProfileReady() ? "1" : "0"
  };
}

function profileCommandValue(key, value) {
  return String(value ?? "").replace(/[|=\r\n]/g, " ").trim();
}

function profileMessage(command, fields) {
  const parts = [command];
  Object.entries(fields).forEach(([key, value]) => {
    parts.push(`${key}=${profileCommandValue(key, value)}`);
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
    sigil: payload.sigil,
    avatar: payload.avatar,
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
    }),
    profileMessage("NEURA_XP_READ", {
      feature: XP_FEATURE,
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
  const avatar = normalizeProfileAvatar(payload.avatar, payload.sex);
  const sigil = normalizeProfileSigil(payload.sigil);
  profileState.pendingSaveAvatar = avatar;
  profileState.pendingSaveSigil = sigil;
  dispatchProfileCommand("save", [profileSaveMessage(payload)], payload);
  setProfileBridgeStatus(`Profile save sent. ${avatarLabel(avatar)} / ${sigilLabel(sigil)}`);
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
  if (payload.avatar !== undefined) {
    const serverAvatar = normalizeProfileAvatar(payload.avatar, payload.sex);
    setProfileAvatar(serverAvatar);
    if (serverAvatar === profileState.pendingSaveAvatar) {
      profileState.pendingSaveAvatar = "";
    }
  }
  if (payload.sigil !== undefined) {
    const serverSigil = normalizeProfileSigil(payload.sigil);
    setProfileSigil(serverSigil);
    if (serverSigil === profileState.pendingSaveSigil) {
      profileState.pendingSaveSigil = "";
    }
  }
  profileState.bridgeOnline = true;
  setProfileRefreshEnabled(true);
  setProfileBridgeStatus(
    profileState.pendingSaveAvatar || profileState.pendingSaveSigil
      ? "Profile synced. Look not confirmed."
      : profileState.serverReady ? "Profile synced" : "Profile setup required"
  );
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

function applyXpData(payload = {}) {
  profileState.lastXpPayload = { ...payload };
  profileState.bridgeOnline = true;
  setProfileRefreshEnabled(true);
  syncProfilePreview();
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
      profileState.pendingSaveAvatar = "";
    }
    if (payload.sigil) {
      setProfileSigil(payload.sigil);
      profileState.pendingSaveSigil = "";
    } else if (profileState.pendingSaveAvatar || profileState.pendingSaveSigil) {
      setProfileBridgeStatus("Profile saved. Look not confirmed.");
      return;
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

  if (command === "NEURA_XP_DATA" && payload.feature === XP_FEATURE) {
    applyXpData(payload);
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
  syncProfileAvatarValue();
  syncAvatarWindow();
  syncProfileSigilValue();
  setProfileBridgeStatus("Profile bridge offline");
  setProfileRefreshEnabled(true);
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-avatar-more]")) {
    openAvatarWindow();
    return;
  }

  const imageOption = event.target.closest("[data-avatar-image-option]");
  if (imageOption) {
    setPendingAvatar(imageOption.dataset.avatarImageOption || "");
    return;
  }

  const avatarOption = event.target.closest("[data-avatar-option]");
  if (avatarOption) {
    setPendingSigil(avatarOption.dataset.avatarOption || "");
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

document.addEventListener("neura:tab-change", closeAvatarWindow);

window.neuraProfile = Object.freeze({
  build: 1030,
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
  closePicker: closeAvatarWindow,
  setImage: setProfileAvatar,
  setAvatar: setProfileAvatar,
  setSigil: setProfileSigil,
  mode: () => (profileState.serverReady && profileState.identityReady && !profileState.editingProfile ? "view" : "setup"),
  serverReady: () => profileState.serverReady,
  lastCommand: () => profileState.lastCommand
});

setupProfilePreview();
