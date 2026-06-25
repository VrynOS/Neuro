const BRIDGE_PREFIX = "NEURO_GATEWAY|";

const state = {
  hiddenBalances: {
    checking: false,
    savings: false
  }
};

function logBridge(line) {
  const log = document.querySelector("#bridge-log");
  if (!log) return;
  log.textContent = `${line}\n${log.textContent}`.trim();
}

function sendBridge(op, text = "") {
  const tick = Date.now().toString();
  const query = new URLSearchParams({
    op,
    text,
    tick
  }).toString();

  window.parent.postMessage(`${BRIDGE_PREFIX}${query}`, "*");
  logBridge(`sent: ${op}`);
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
});

document.querySelectorAll("[data-balance]").forEach((balance) => {
  balance.dataset.original = balance.textContent;
});

setupClock();
