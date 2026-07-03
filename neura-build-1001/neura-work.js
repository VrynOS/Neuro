// =====================================================//
// Name of script: neura-work
// Build: 1001
// Update: Workforce And Rent Display
// Date and time: 2026-07-02 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

const workState = {
  bridgeOnline: false,
  data: {}
};

function workSetText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function workText(value, fallback = "None") {
  if (value === null || value === undefined) return fallback;
  const clean = String(value).trim();
  if (!clean || clean === "JSON_INVALID") return fallback;
  return clean;
}

function workMoney(value) {
  const clean = workText(value, "0").replace(/^GC\s+/i, "");
  return `GC ${clean}`;
}

function parseWorkPayload(message) {
  const data = {};
  String(message || "").split("|").slice(1).forEach((part) => {
    const index = part.indexOf("=");
    if (index <= 0) return;
    data[part.slice(0, index)] = part.slice(index + 1);
  });
  return data;
}

function renderWork(payload = {}) {
  workState.data = { ...workState.data, ...payload };
  workState.bridgeOnline = Boolean(payload.feature === "NEURA_WORK" || workState.bridgeOnline);

  const data = workState.data;
  const job = workText(data.job);
  const shift = workText(data.shift, "Off");
  const isOnShift = shift.toLowerCase() === "on";
  const shell = document.querySelector("[data-work-shell]");

  if (shell) {
    shell.dataset.workBridge = workState.bridgeOnline ? "online" : "offline";
    shell.dataset.workShift = isOnShift ? "on" : "off";
  }

  workSetText('[data-work-value="bridge"]', workState.bridgeOnline ? "Online" : "Server Pending");
  workSetText('[data-work-value="job"]', job);
  workSetText('[data-work-value="shift"]', shift);
  workSetText('[data-work-value="shiftLine"]', isOnShift ? `Clocked in at ${job}.` : "No active shift.");
  workSetText('[data-work-value="earned"]', workMoney(data.todayEarned));
  workSetText('[data-work-value="xp"]', workText(data.workXp, "0"));
  workSetText('[data-work-value="lastShift"]', workText(data.lastShift));

  workSetText('[data-work-value="jobDetail"]', job);
  workSetText('[data-work-value="shiftDetail"]', shift);
  workSetText('[data-work-value="earnedDetail"]', workMoney(data.todayEarned));
  workSetText('[data-work-value="lastShiftDetail"]', workText(data.lastShift));

  workSetText('[data-work-value="rentProperty"]', workText(data.rentProperty));
  workSetText('[data-work-value="rentStatus"]', workText(data.rentStatus));
  workSetText('[data-work-value="rentDue"]', workMoney(data.rentDue));
  workSetText('[data-work-value="rentTimeLeft"]', workText(data.rentTimeLeft));
  workSetText('[data-work-value="rentLast"]', workText(data.rentLast));
}

function receiveWork(message) {
  const payload = typeof message === "string" ? parseWorkPayload(message) : message;
  if (!payload || payload.feature !== "NEURA_WORK") return;
  renderWork(payload);
}

function sendWorkCommand(command) {
  document.dispatchEvent(new CustomEvent("neura:work-command", {
    detail: {
      feature: "NEURA_WORK",
      command
    }
  }));
}

document.addEventListener("click", (event) => {
  const commandButton = event.target.closest("[data-work-command]");
  if (!commandButton) return;
  sendWorkCommand(commandButton.dataset.workCommand || "refresh");
});

window.neuraWork = Object.freeze({
  build: 1001,
  feature: "NEURA_WORK",
  receive: receiveWork,
  render: renderWork,
  command: sendWorkCommand
});

renderWork();
