// =====================================================//
// Name of script: neura-media-gateway
// Build: 1004
// Update: XP Command Bridge Metadata
// Pattern: Hud/Neura Media Gateway.lsl -> Web/neura-build-1001.html -> Web/neura-media-gateway.js -> feature HUD scripts
// Date and time: 2026-07-03 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

export const neuraMediaGatewayBridge = Object.freeze({
  feature: "NEURA_MEDIA_GATEWAY",
  label: "Neura Media Gateway",
  build: 1004,
  schema: 1,
  pattern: "SL_MEDIA_FACE_TO_LSL_HTTP_WRAPPER_TO_FEATURE_HUDS",
  hudLsl: "Hud/Neura Media Gateway.lsl",
  html: "Web/neura-build-1001.html",
  js: "Web/neura-media-gateway.js",
  bridge: "Web Bridge/neura-media-gateway.js",
  mediaLink: 2,
  mediaFace: 0,
  mediaWidth: 1280,
  mediaHeight: 800,
  publicPageUrl: "https://vrynos.github.io/Neuro/neura-build-1001/",
  browserOwnsPersistentState: false,
  webOwnsPersistentState: false,
  routeCommandsOnly: true,
  replyPollQueue: true,
  postMessagePrefix: "NEURA_GATEWAY|",
  ackPrefix: "NEURA_GATEWAY_ACK|",
  commandEvents: Object.freeze([
    "neura:profile-command",
    "neura:xp-command",
    "neura:health-command",
    "neura:work-command",
    "neura:wallet-command",
    "neura:ui-command"
  ]),
  routes: Object.freeze({
    profile: "LM_NEURA_PROFILE_READY:1001400",
    stats: "LM_NEURA_STATS_READY:1001500",
    wallet: "LM_NEURA_WALLET_READY:1001600",
    xp: "LM_NEURA_XP_READY:1001650",
    health: "LM_NEURA_HEALTH_READY:1001700",
    work: "LM_NEURA_WORK_READY:1001800",
    hudResizer: "LM_NEURA_HUD_RESIZER:1001900"
  })
});
