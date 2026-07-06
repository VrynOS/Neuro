// =====================================================//
// Name of script: neura-wallet
// Build: 1007
// Update: Recipients And Receipts
// Date and time: 2026-07-02 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

const walletState = {
  permission: "pending",
  checking: "",
  savings: "",
  admin: "0",
  updated: "",
  selectedUser: null,
  users: [],
  receipts: []
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

function walletDecode(value) {
  try {
    return decodeURIComponent(String(value || "").replace(/\+/g, " "));
  } catch {
    return String(value || "");
  }
}

function walletEscape(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function parseWalletUsers(raw = "") {
  return String(raw || "").split(";").filter(Boolean).map((row) => {
    const index = row.indexOf(",");
    const id = index === -1 ? row : row.slice(0, index);
    const name = index === -1 ? row : walletDecode(row.slice(index + 1));
    return { id, name };
  }).filter((user) => user.id && user.name);
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

function renderWalletUsers() {
  const list = document.querySelector("[data-wallet-user-list]");
  if (!list) return;

  if (!walletState.users.length) {
    list.innerHTML = `<article class="wallet-user-empty"><strong>No registered users loaded</strong><small>Neura will ask the G-Coin wallet server for registered HUD users.</small></article>`;
    return;
  }

  list.innerHTML = walletState.users.map((user, index) => `
    <button type="button" class="wallet-user-option" data-wallet-user-index="${index}">
      <strong>${walletEscape(user.name)}</strong>
      <small>${walletEscape(user.id.slice(-8).toUpperCase())}</small>
    </button>
  `).join("");
}

function renderWalletReceipts() {
  const list = document.querySelector("[data-wallet-receipts]");
  if (!list) return;

  if (!walletState.receipts.length) {
    list.innerHTML = `<article class="wallet-receipt-empty"><strong>No receipts yet</strong><small>Transfers and incoming G-Coin activity will appear here.</small></article>`;
    return;
  }

  list.innerHTML = walletState.receipts.slice(0, 12).map((receipt) => `
    <article>
      <strong>${receipt.status}</strong>
      <small>${walletEscape(receipt.detail || "Wallet transaction")}</small>
      <em>${walletEscape(receipt.updated || "--")}</em>
    </article>
  `).join("");
}

function receiveWallet(message) {
  const payload = typeof message === "string" ? parseWalletPayload(message) : message;
  if (!payload || payload.feature !== "NEURA_WALLET_HOST") return;

  const command = String(message || "").split("|", 1)[0];
  if (command === "NEURA_WALLET_USERS") {
    walletState.users = parseWalletUsers(payload.users);
    renderWalletUsers();
    return;
  }

  if (command === "NEURA_WALLET_RECEIPT") {
    walletState.receipts.unshift({
      status: payload.status || "ok",
      detail: payload.detail || "",
      updated: payload.updated || ""
    });
    walletState.receipts = walletState.receipts.slice(0, 24);
    renderWalletReceipts();
    return;
  }

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

function walletTransferCommand() {
  const route = document.querySelector("[data-wallet-transfer-type]")?.value || "";
  const amount = document.querySelector("[data-wallet-amount]")?.value || "";
  const target = walletState.selectedUser?.id || "";
  const parts = ["transfer", `route=${route}`, `amount=${amount}`];
  if (target) parts.push(`target=${target}`);
  return parts.join("|");
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

function chooseWalletUser(index) {
  const user = walletState.users[index];
  if (!user) return;
  walletState.selectedUser = user;
  walletText("[data-wallet-selected-user]", user.name);
  walletText("[data-wallet-user-status]", user.name);
  const choose = document.querySelector("[data-wallet-user-choose]");
  if (choose) choose.disabled = false;
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

  const userOption = event.target.closest("[data-wallet-user-index]");
  if (userOption) {
    chooseWalletUser(Number.parseInt(userOption.dataset.walletUserIndex || "-1", 10));
    return;
  }

  if (event.target.closest("[data-wallet-user-choose]")) {
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
  walletCommand(walletTransferCommand());
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const windowNode = document.querySelector("[data-wallet-user-window]");
  if (windowNode && !windowNode.hidden) closeWalletUserWindow();
});

renderWallet();
renderWalletUsers();
renderWalletReceipts();

window.neuraWallet = Object.freeze({
  build: 1007,
  feature: "NEURA_WALLET_HOST",
  receive: receiveWallet,
  render: renderWallet,
  command: walletCommand,
  payload: () => ({ ...walletState })
});
