// =====================================================//
// Name of script: neura-media-gateway
// Build: 1003
// Update: UI Command Bridge
// Date and time: 2026-07-03 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

const NEURA_GATEWAY_PREFIX = "NEURA_GATEWAY|";
const NEURA_GATEWAY_ACK_PREFIX = "NEURA_GATEWAY_ACK|";

const gatewayState = {
  build: 1003,
  pending: new Map(),
  online: false,
  lastStatus: "",
  lastReplyAt: 0,
  pollTimer: 0
};

function gatewayParams() {
  return new URLSearchParams(window.location.search);
}

function gatewayInSecondLife() {
  return gatewayParams().get("bridge") === "sl" && window.parent && window.parent !== window;
}

function gatewayPost(fields) {
  if (!gatewayInSecondLife()) return "";

  const tick = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const params = new URLSearchParams({
    tick,
    build: String(gatewayState.build),
    ...fields
  });

  gatewayState.pending.set(tick, fields.op || "");
  window.parent.postMessage(`${NEURA_GATEWAY_PREFIX}${params.toString()}`, "*");
  return tick;
}

function gatewayMessage(command) {
  if (!command) return "";
  return gatewayPost({
    op: "message",
    message: command
  });
}

function parseGatewayAck(raw) {
  const text = String(raw || "");
  if (!text.startsWith(NEURA_GATEWAY_ACK_PREFIX)) return null;

  const first = text.indexOf("|", NEURA_GATEWAY_ACK_PREFIX.length);
  if (first === -1) return null;
  const second = text.indexOf("|", first + 1);
  if (second === -1) return null;

  return {
    tick: text.slice(NEURA_GATEWAY_ACK_PREFIX.length, first),
    status: text.slice(first + 1, second),
    body: text.slice(second + 1)
  };
}

function parseGatewayPayload(message) {
  const payload = {};
  String(message || "").split("|").slice(1).forEach((part) => {
    const index = part.indexOf("=");
    if (index <= 0) return;
    payload[part.slice(0, index)] = part.slice(index + 1);
  });
  return payload;
}

function gatewayDeliver(message) {
  const line = String(message || "").trim();
  if (!line || line === "NEURA_GATEWAY_POLL" || line === "NEURA_GATEWAY_IDLE") return;

  if (line.startsWith("NEURA_PROFILE_")) {
    window.neuraProfile?.receive?.(line);
    return;
  }

  if (line.startsWith("NEURA_STATS_")) {
    window.neuraStats?.receive?.(line);
    return;
  }

  if (line.startsWith("NEURA_WALLET_")) {
    window.neuraWallet?.receive?.(line);
    return;
  }

  if (line.startsWith("NEURA_HEALTH_")) {
    window.neuraHealth?.receive?.(line);
    return;
  }

  if (line.startsWith("NEURA_WORK_")) {
    window.neuraWork?.receive?.(line);
    return;
  }

  if (line.startsWith("NEURA_HEART_EVENT")) {
    const payload = parseGatewayPayload(line);
    window.neuraHeart?.lifecycle?.(payload.event, payload.detail);
  }
}

function gatewayHandleBody(body) {
  const lines = String(body || "").split(/\r?\n/);
  lines.forEach(gatewayDeliver);
}

function gatewayPoll() {
  gatewayPost({ op: "poll" });
}

function gatewaySync(reload = false) {
  gatewayPost({ op: reload ? "reload" : "sync" });
  window.setTimeout(gatewayPoll, 450);
  window.setTimeout(gatewayPoll, 1200);
}

function gatewaySendProfile(detail = {}) {
  const messages = Array.isArray(detail.messages)
    ? detail.messages
    : [detail.message].filter(Boolean);

  messages.forEach((message) => gatewayMessage(message));
  window.setTimeout(gatewayPoll, 450);
  window.setTimeout(gatewayPoll, 1200);
}

function gatewaySendHealth(detail = {}) {
  const section = String(detail.section || "overview").trim() || "overview";
  gatewayMessage(`NEURA_HEALTH_COMMAND|feature=NEURA_HEALTH|schema=1|section=${section}`);
  window.setTimeout(gatewayPoll, 450);
  window.setTimeout(gatewayPoll, 1200);
}

function gatewaySendWork(detail = {}) {
  const command = String(detail.command || "refresh").trim() || "refresh";
  gatewayMessage(`NEURA_WORK_COMMAND|feature=NEURA_WORK|schema=1|command=${command}`);
  window.setTimeout(gatewayPoll, 450);
  window.setTimeout(gatewayPoll, 1200);
}

function gatewaySendWallet(detail = {}) {
  const command = String(detail.command || "refresh").trim() || "refresh";
  gatewayPost({
    op: "wallet-command",
    command
  });
  window.setTimeout(gatewayPoll, 450);
  window.setTimeout(gatewayPoll, 1200);
}

function gatewaySendUi(detail = {}) {
  const command = String(detail.command || "").trim();
  if (!command) return;
  gatewayPost({
    op: "ui-command",
    command
  });
  window.setTimeout(gatewayPoll, 450);
  window.setTimeout(gatewayPoll, 1200);
}

window.addEventListener("message", (event) => {
  const ack = parseGatewayAck(event.data);
  if (!ack) return;

  gatewayState.online = true;
  gatewayState.lastStatus = ack.status;
  gatewayState.lastReplyAt = Date.now();
  gatewayState.pending.delete(ack.tick);
  gatewayHandleBody(ack.body);
});

document.addEventListener("neura:profile-command", (event) => gatewaySendProfile(event.detail));
document.addEventListener("neura:health-command", (event) => gatewaySendHealth(event.detail));
document.addEventListener("neura:work-command", (event) => gatewaySendWork(event.detail));
document.addEventListener("neura:wallet-command", (event) => gatewaySendWallet(event.detail));
document.addEventListener("neura:ui-command", (event) => gatewaySendUi(event.detail));

document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-sync-hud]")) return;
  gatewaySync(true);
}, true);

if (gatewayInSecondLife()) {
  window.setTimeout(() => gatewayPost({ op: "ping" }), 250);
  window.setTimeout(() => gatewaySync(false), 700);
  gatewayState.pollTimer = window.setInterval(gatewayPoll, 3000);
}

window.neuraMediaGateway = Object.freeze({
  build: gatewayState.build,
  feature: "NEURA_MEDIA_GATEWAY",
  command: gatewayMessage,
  ui: gatewaySendUi,
  poll: gatewayPoll,
  sync: gatewaySync,
  state: () => ({
    online: gatewayState.online,
    lastStatus: gatewayState.lastStatus,
    lastReplyAt: gatewayState.lastReplyAt,
    pending: gatewayState.pending.size
  })
});
