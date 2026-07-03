// =====================================================//
// Name of script: neura-wallet
// Build: 1005
// Update: Media Gateway Commands
// Date and time: 2026-07-02 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

const walletState = {
  permission: "pending",
  checking: "",
  savings: "",
  admin: "0",
  updated: "",
  selectedUser: null
};

function walletText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function walletMoney(value) {
  if (value === "" || value === null || value === undefined) return "--";
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return "--";
  return parsed.toLocaleString("en-US");
}

function parseWalletPayload(message) {
  const data = {};
  String(message || "").split("|").slice(1).forEach((part) => {
    const index = part.indexOf("=");
    if (index <= 0) return;
    data[part.slice(0, index)] = part.slice(index + 1);
  });
  return data;
}

function renderWallet(payload = walletState) {
  const hasBalances = payload.checking !== "" && payload.savings !== "";
  const total = hasBalances
    ? walletMoney((Number.parseInt(payload.checking || "0", 10) || 0) + (Number.parseInt(payload.savings || "0", 10) || 0))
    : "--";

  walletText("[data-wallet-permission]", payload.permission || "pending");
  walletText("[data-wallet-checking]", walletMoney(payload.checking));
  walletText("[data-wallet-savings]", walletMoney(payload.savings));
  walletText("[data-wallet-total]", total);
  walletText("[data-wallet-admin]", payload.admin === "1" ? "Yes" : "No");
  walletText("[data-wallet-updated]", payload.updated || "--");
}

function receiveWallet(message) {
  const payload = typeof message === "string" ? parseWalletPayload(message) : message;
  if (!payload || payload.feature !== "NEURA_WALLET_HOST") return;
  Object.assign(walletState, payload);
  renderWallet(walletState);
}

function walletCommand(command) {
  document.dispatchEvent(new CustomEvent("neura:wallet-command", {
    detail: {
      feature: "NEURA_WALLET_HOST",
      command
    }
  }));
  window.neuraHeart?.speak?.("Wallet", `Wallet ${command} command queued for the G-Coin host bridge.`, "calm");
}

function openWalletUserWindow() {
  const windowNode = document.querySelector("[data-wallet-user-window]");
  if (!windowNode) return;
  windowNode.hidden = false;
  walletCommand("users");
}

function closeWalletUserWindow() {
  const windowNode = document.querySelector("[data-wallet-user-window]");
  if (!windowNode) return;
  windowNode.hidden = true;
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-wallet-user-open]")) {
    openWalletUserWindow();
    return;
  }

  if (event.target.closest("[data-wallet-user-close]")) {
    closeWalletUserWindow();
    return;
  }

  const button = event.target.closest("[data-wallet-command]");
  if (!button) return;
  walletCommand(button.dataset.walletCommand || "refresh");
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-wallet-transfer-form]");
  if (!form) return;
  event.preventDefault();
  walletCommand("transfer");
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const windowNode = document.querySelector("[data-wallet-user-window]");
  if (windowNode && !windowNode.hidden) closeWalletUserWindow();
});

renderWallet();

window.neuraWallet = Object.freeze({
  build: 1005,
  feature: "NEURA_WALLET_HOST",
  receive: receiveWallet,
  render: renderWallet,
  command: walletCommand,
  payload: () => ({ ...walletState })
});
