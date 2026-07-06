// =====================================================//
// Name of script: neura-profile
// Build: 1021
// Update: Profile Sigil Save
// Pattern: Hud/Neura Profile Hud.lsl -> Server/Neura Profile Server.lsl + Neuron/Neura Profile Neuron.lsl -> Web/neura-profile.css -> Web/neura-profile.js
// Date and time: 2026-07-02 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

export const neuraProfileBridge = Object.freeze({
  feature: "NEURA_PROFILE",
  label: "Neura Profile",
  build: 1021,
  schema: 1,
  pattern: "PROFILE_HUD_TO_SERVER_NEURON_TO_HTML_CSS_JS",
  hudBuild: 1006,
  serverBuild: 1017,
  neuronBuild: 1004,
  webBuild: 1018,
  hudLsl: "Hud/Neura Profile Hud.lsl",
  serverLsl: "Server/Neura Profile Server.lsl",
  neuronLsl: "Neuron/Neura Profile Neuron.lsl",
  html: "Web/neura-build-1001.html",
  css: "Web/neura-profile.css",
  js: "Web/neura-profile.js",
  bridge: "Web Bridge/neura-profile.js",
  readyLinkMessage: 1001400,
  serverRequestLinkMessage: 1001401,
  serverReplyLinkMessage: 1001402,
  neuronRequestLinkMessage: 1001403,
  neuronReplyLinkMessage: 1001404,
  browserOwnsPersistentState: false,
  serverOwnsProfileData: true,
  neuronOwnsIdentity: true,
  displayNamesOnlyInUi: true,
  browserOwnsDisplayName: false,
  profileSavePairsServerAndNeuron: true,
  hudUsesRegionBridge: true,
  profileServerChannel: -1001401,
  profileNeuronChannel: -1001403,
  profileHudReplyChannel: -1001405,
  browserCommandEvent: "neura:profile-command",
  commands: Object.freeze({
    ready: "NEURA_PROFILE_HUD_READY",
    profileHandshake: "NEURA_PROFILE_HANDSHAKE",
    profileSave: "NEURA_PROFILE_SAVE",
    profileRead: "NEURA_PROFILE_READ",
    neuronHandshake: "NEURA_PROFILE_NEURON_HANDSHAKE",
    neuronSave: "NEURA_PROFILE_NEURON_SAVE",
    neuronRead: "NEURA_PROFILE_NEURON_READ"
  }),
  profileServerFields: Object.freeze([
    "age",
    "sex",
    "role",
    "district",
    "zodiac",
    "bio",
    "sigil",
    "accent",
    "background",
    "stamina",
    "staminaGoal",
    "ready",
    "updated",
    "schema"
  ]),
  requiredProfileFields: Object.freeze([
    "displayName",
    "age",
    "sex",
    "district"
  ]),
  profileNeuronFields: Object.freeze([
    "uuid",
    "agentName",
    "displayName",
    "updated",
    "schema"
  ]),
  webCommands: Object.freeze([
    {
      action: "save",
      message: "NEURA_PROFILE_SAVE",
      note: "HUD stores displayName only long enough to forward it to the profile neuron. The profile server ignores displayName."
    },
    {
      action: "read",
      messages: ["NEURA_PROFILE_READ", "NEURA_PROFILE_NEURON_READ"],
      note: "HUD reads profile server data and profile neuron identity data, then relays both replies to the UI."
    }
  ])
});
