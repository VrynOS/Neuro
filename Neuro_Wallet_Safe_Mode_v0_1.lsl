// =====================================================
// Neuro Wallet Safe Mode v0.1
//
// Reliable LSL fallback for G-Coin wallet basics.
// Media can fail; this script keeps core wallet actions
// available through touch/dialog and /77 chat commands.
//
// Commands:
//   /77 wallet
//   /77 balance
//   /77 send
//   /77 request
//   /77 transfer
//   /77 refresh
//   /77 reset
//
// Drop into the Neuro-Link HUD/linkset with the G-Coin
// server channel scripts. Resident picking is built in.
// =====================================================

string DISPLAY_TITLE = "Neuro Wallet Safe Mode";
integer BUILD_NUMBER = 1;

integer COMMAND_CH = 77;
integer LM_WALLET_COMMAND = 7401;
integer BANK_CH = -777777;
integer DIALOG_TIMEOUT = 60;
integer USER_PAGE_SIZE = 6;
integer MAX_USERS = 24;
integer MAX_BUTTON_CHARS = 24;

string BACK_BTN = "Back";
string CLOSE_BTN = "Close";
string HELP_BTN = "Help";

integer bankListen = 0;
integer commandListen = 0;
integer menuListen = 0;
integer menuCh = 0;

key activeUser = NULL_KEY;
key queuedTarget = NULL_KEY;

float checking = 0.0;
float savings = 0.0;
float queuedAmount = 0.0;

integer isAdmin = FALSE;
integer receiptPending = FALSE;

string screen = "HOME";
string queuedCommand = "";
string queuedExtra = "";
string queuedAction = "";
string pickMode = "";
string pickTitle = "";
integer userPage = 0;

list userUUIDs = [];
list userNames = [];
list pageUUIDs = [];
list pageNames = [];

string shortAccount(key id)
{
    return llToUpper(llGetSubString((string)id, -6, -1));
}

string gcMoney(float amount)
{
    return "GC " + (string)llRound(amount);
}

string niceName(key id)
{
    string name = llGetDisplayName(id);
    if (name == "") name = llKey2Name(id);
    if (name == "") name = "User-" + shortAccount(id);
    return name;
}

integer startsWith(string value, string prefix)
{
    return llGetSubString(value, 0, llStringLength(prefix) - 1) == prefix;
}

integer validName(string name)
{
    if (name == "") return FALSE;
    if (name == "Resident") return FALSE;
    if (startsWith(name, "User-")) return FALSE;
    return TRUE;
}

string fallbackName(key id)
{
    string name = llGetDisplayName(id);
    if (validName(name)) return name;

    name = llKey2Name(id);
    if (validName(name)) return name;

    return "User-" + shortAccount(id);
}

string dialogUserName(string name, integer slot)
{
    if (llStringLength(name) > 4) name = llGetSubString(name, 0, 3);

    return name;
}

integer makeMenuChannel(key user)
{
    integer a = (integer)("0x" + llGetSubString((string)llGetKey(), 0, 7));
    integer b = (integer)("0x" + llGetSubString((string)user, 0, 7));
    integer c = (a ^ b ^ 7701) & 0x3FFFFFFF;
    if (c == 0) c = 7701;
    return -c;
}

setMenuListen(key user)
{
    menuCh = makeMenuChannel(user);
    if (menuListen) llListenRemove(menuListen);
    menuListen = llListen(menuCh, "", user, "");
}

ensureListens()
{
    if (!bankListen) bankListen = llListen(BANK_CH, "", NULL_KEY, "");
    if (!commandListen) commandListen = llListen(COMMAND_CH, "", NULL_KEY, "");
}

string header()
{
    string adminTag = "";
    if (isAdmin) adminTag = " (Admin)";

    return DISPLAY_TITLE + "\n"
        + "User: " + niceName(activeUser) + adminTag + "\n"
        + "Checking: " + gcMoney(checking) + "\n"
        + "Savings: " + gcMoney(savings) + "\n"
        + "-------------------\n";
}

sendBank(string cmd, float amount, key target, string extra)
{
    string msg;

    if (activeUser == NULL_KEY) activeUser = llGetOwner();
    ensureListens();

    msg = "REQ|" + cmd
        + "|" + (string)activeUser
        + "|" + (string)llGetKey()
        + "|" + (string)llRound(amount)
        + "|" + (string)target;

    if (extra != "") msg += "|" + extra;

    llRegionSay(BANK_CH, msg);
}

requestBalance()
{
    sendBank("BALANCE", 0.0, NULL_KEY, "");
}

requestUserPick(string mode, string title)
{
    screen = "PICK";
    pickMode = mode;
    pickTitle = title;
    userPage = 0;
    userUUIDs = [];
    userNames = [];
    pageUUIDs = [];
    pageNames = [];

    sendBank("USERLIST", 0.0, NULL_KEY, "");
    llDialog(activeUser, header() + "Loading residents from G-Coin Server...", [BACK_BTN, CLOSE_BTN], menuCh);
}

list amountButtons()
{
    return ["GC 10", "GC 50", "GC 100", "GC 500", "GC 1K", "More", BACK_BTN, CLOSE_BTN];
}

float amountFromButton(string msg)
{
    if (msg == "GC 10") return 10.0;
    if (msg == "GC 50") return 50.0;
    if (msg == "GC 100") return 100.0;
    if (msg == "GC 500") return 500.0;
    if (msg == "GC 1K") return 1000.0;
    return 0.0;
}

showHome()
{
    screen = "HOME";
    queuedCommand = "";
    queuedExtra = "";
    queuedAction = "";
    queuedTarget = NULL_KEY;
    queuedAmount = 0.0;

    list buttons = ["Balance", "Transfer", "Send", "Request", "Refresh"];
    if (isAdmin) buttons += ["Admin Add"];
    buttons += [HELP_BTN, CLOSE_BTN];

    llDialog(activeUser, header() + "Safe Mode is active. Choose an action.", buttons, menuCh);
}

showHelp()
{
    llRegionSayTo(activeUser, 0,
        DISPLAY_TITLE + "\n"
        + "Media is optional. These commands still work:\n"
        + "/77 wallet, /77 balance, /77 send, /77 request, /77 transfer, /77 refresh, /77 reset"
    );
    llDialog(activeUser, header() + "Help sent to local chat.", [BACK_BTN, CLOSE_BTN], menuCh);
}

showTransfer()
{
    screen = "TRANSFER";
    llDialog(activeUser, header() + "Transfer options:", ["S>C", "C>S", "C>User", BACK_BTN, CLOSE_BTN], menuCh);
}

showAmount(string action, string cmd, string extra, key target)
{
        screen = "AMOUNT";
    queuedAction = action;
    queuedCommand = cmd;
    queuedExtra = extra;
    queuedTarget = target;
    queuedAmount = 0.0;

    string targetLine = "";
    if (target != NULL_KEY) targetLine = "\nTarget: " + niceName(target);

    llDialog(activeUser, header() + action + targetLine + "\nChoose amount.", amountButtons(), menuCh);
}

showConfirm()
{
    string targetLine = "";
    if (queuedTarget != NULL_KEY) targetLine = "\nTarget: " + niceName(queuedTarget);

    llDialog(activeUser,
        header() + queuedAction + targetLine
        + "\nAmount: " + gcMoney(queuedAmount)
        + "\nConfirm?",
        ["Confirm", BACK_BTN, CLOSE_BTN],
        menuCh);
}

showUserList()
{
    integer total = llGetListLength(userNames);
    integer start = userPage * USER_PAGE_SIZE;
    integer end = start + USER_PAGE_SIZE - 1;
    integer i;
    integer pages;
    string label;
    integer slot;
    string body = "";
    list buttons = [];

    pageUUIDs = [];
    pageNames = [];

    if (total == 0)
    {
        llDialog(activeUser, header() + "No residents found yet. Have them use G-Coin once, then refresh.", [BACK_BTN, CLOSE_BTN], menuCh);
        return;
    }

    if (start >= total && userPage > 0)
    {
        userPage = 0;
        start = 0;
        end = USER_PAGE_SIZE - 1;
    }

    for (i = start; i <= end && i < total; ++i)
    {
        slot = i - start + 1;
        label = dialogUserName(llList2String(userNames, i), slot);
        body += (string)slot + ". " + llList2String(userNames, i) + "\n";
        buttons += [label];
        pageNames += [label];
        pageUUIDs += [llList2Key(userUUIDs, i)];
    }

    if (end + 1 < total) buttons += ["Next"];
    buttons += [BACK_BTN, CLOSE_BTN];

    pages = (total + USER_PAGE_SIZE - 1) / USER_PAGE_SIZE;
    llDialog(activeUser, header() + pickTitle + "\nChoose resident:\n" + body + "Page " + (string)(userPage + 1) + " of " + (string)pages, buttons, menuCh);
}

closeMenu()
{
    if (menuListen) llListenRemove(menuListen);
    menuListen = 0;
    activeUser = NULL_KEY;
    queuedTarget = NULL_KEY;
    queuedAmount = 0.0;
    queuedCommand = "";
    queuedExtra = "";
    queuedAction = "";
    receiptPending = FALSE;
    screen = "HOME";
    pickMode = "";
    pickTitle = "";
    userPage = 0;
    userUUIDs = [];
    userNames = [];
    pageUUIDs = [];
    pageNames = [];
    llSetTimerEvent(0.0);
}

openSafeMode(key user)
{
    activeUser = user;
    setMenuListen(user);
    llSetTimerEvent((float)DIALOG_TIMEOUT);
    requestBalance();
}

printReceipt()
{
    llRegionSayTo(activeUser, 0,
        DISPLAY_TITLE + "\n"
        + queuedAction + " complete.\n"
        + "Checking: " + gcMoney(checking) + "\n"
        + "Savings: " + gcMoney(savings)
    );
}

handleBankReply(string msg)
{
    list p = llParseStringKeepNulls(msg, ["|"], []);
    string type;
    string token;
    list row;
    key resident;
    string residentName;
    integer i;

    if (llGetListLength(p) < 5) return;
    if (llList2String(p, 0) != "RSP") return;
    if ((key)llList2String(p, 2) != activeUser) return;
    if ((key)llList2String(p, 3) != llGetKey()) return;

    type = llList2String(p, 1);

    if (type == "USERLIST")
    {
        userUUIDs = [];
        userNames = [];
        pageUUIDs = [];
        pageNames = [];
        userPage = 0;

        for (i = 4; i < llGetListLength(p); ++i)
        {
            if (llGetListLength(userUUIDs) >= MAX_USERS) jump user_done;

            token = llList2String(p, i);
            if (startsWith(token, "ADMIN=")) jump user_continue;

            row = llParseStringKeepNulls(token, [","], []);
            resident = (key)llList2String(row, 0);
            if (resident == NULL_KEY || resident == activeUser) jump user_continue;

            residentName = "";
            if (llGetListLength(row) > 1) residentName = llBase64ToString(llList2String(row, 1));
            if (!validName(residentName)) residentName = fallbackName(resident);

            userUUIDs += [resident];
            userNames += [residentName];

@user_continue;
        }

@user_done;
        showUserList();
        return;
    }

    if (type == "BAL")
    {
        checking = (float)llList2String(p, 4);
        savings = (float)llList2String(p, 5);
        isAdmin = FALSE;

        for (i = 6; i < llGetListLength(p); ++i)
        {
            if (llList2String(p, i) == "ADMIN=1") isAdmin = TRUE;
        }

        if (receiptPending)
        {
            receiptPending = FALSE;
            printReceipt();
        }

        showHome();
        return;
    }

    if (type == "OK")
    {
        receiptPending = TRUE;
        requestBalance();
        return;
    }

    if (type == "FAIL")
    {
        llDialog(activeUser, header() + "Server refused action:\n" + llList2String(p, 4), [BACK_BTN, CLOSE_BTN], menuCh);
    }
}

handlePick(key target)
{
    if (target == NULL_KEY) return;

    if (pickMode == "NEURO_SEND")
    {
        showAmount("Send", "SEND", "", target);
        return;
    }

    if (pickMode == "NEURO_REQUEST")
    {
        showAmount("Request", "REQUEST_ONLY", "", target);
        return;
    }

    if (pickMode == "NEURO_CUSER")
    {
        showAmount("Transfer C>User", "XFER", "C>U", target);
        return;
    }

    if (pickMode == "NEURO_ADMIN_ADD")
    {
        showAmount("Admin Add", "ADDFUNDS", "", target);
    }
}

handleDialog(string msg)
{
    float picked;
    float custom;
    integer idx;

    if (msg == CLOSE_BTN)
    {
        closeMenu();
        return;
    }

    if (msg == BACK_BTN)
    {
        showHome();
        return;
    }

    if (msg == HELP_BTN)
    {
        showHelp();
        return;
    }

    if (screen == "PICK")
    {
        if (msg == "Next")
        {
            userPage++;
            showUserList();
            return;
        }

        idx = llListFindList(pageNames, [msg]);
        if (idx != -1)
        {
            handlePick(llList2Key(pageUUIDs, idx));
            return;
        }
    }

    if (msg == "Balance" || msg == "Refresh")
    {
        requestBalance();
        return;
    }

    if (msg == "Transfer")
    {
        showTransfer();
        return;
    }

    if (msg == "Send")
    {
        requestUserPick("NEURO_SEND", "Send G-Coin");
        return;
    }

    if (msg == "Request")
    {
        requestUserPick("NEURO_REQUEST", "Request G-Coin");
        return;
    }

    if (msg == "Admin Add")
    {
        requestUserPick("NEURO_ADMIN_ADD", "Admin Add Funds");
        return;
    }

    if (msg == "S>C")
    {
        showAmount("Transfer S>C", "XFER", "S>C", NULL_KEY);
        return;
    }

    if (msg == "C>S")
    {
        showAmount("Transfer C>S", "XFER", "C>S", NULL_KEY);
        return;
    }

    if (msg == "C>User")
    {
        requestUserPick("NEURO_CUSER", "Transfer C>User");
        return;
    }

    if (msg == "More")
    {
        llTextBox(activeUser, "Enter a GC amount:", menuCh);
        return;
    }

    if (msg == "Confirm")
    {
        if (queuedCommand == "" || queuedAmount <= 0.0)
        {
            llDialog(activeUser, header() + "Choose an amount first.", [BACK_BTN, CLOSE_BTN], menuCh);
            return;
        }

        if (queuedCommand == "REQUEST_ONLY")
        {
            llInstantMessage(queuedTarget, niceName(activeUser) + " requested " + gcMoney(queuedAmount) + " through Neuro Wallet Safe Mode.");
            llRegionSayTo(activeUser, 0, DISPLAY_TITLE + ": request sent to " + niceName(queuedTarget) + ".");
            showHome();
            return;
        }

        sendBank(queuedCommand, queuedAmount, queuedTarget, queuedExtra);
        llDialog(activeUser, header() + "Sent to G-Coin Server. Waiting for confirmation.", [CLOSE_BTN], menuCh);
        return;
    }

    picked = amountFromButton(msg);
    if (picked > 0.0)
    {
        queuedAmount = picked;
        showConfirm();
        return;
    }

    custom = (float)msg;
    if (custom > 0.0)
    {
        queuedAmount = custom;
        showConfirm();
    }
}

handleCommand(key user, string raw)
{
    string msg = llToLower(llStringTrim(raw, STRING_TRIM));

    if (msg == "wallet" || msg == "gcoin" || msg == "safe")
    {
        openSafeMode(user);
        return;
    }

    if (msg == "balance" || msg == "refresh")
    {
        activeUser = user;
        setMenuListen(user);
        llSetTimerEvent((float)DIALOG_TIMEOUT);
        requestBalance();
        return;
    }

    if (msg == "send")
    {
        activeUser = user;
        setMenuListen(user);
        requestUserPick("NEURO_SEND", "Send G-Coin");
        llSetTimerEvent((float)DIALOG_TIMEOUT);
        return;
    }

    if (msg == "request")
    {
        activeUser = user;
        setMenuListen(user);
        requestUserPick("NEURO_REQUEST", "Request G-Coin");
        llSetTimerEvent((float)DIALOG_TIMEOUT);
        return;
    }

    if (msg == "transfer")
    {
        activeUser = user;
        setMenuListen(user);
        llSetTimerEvent((float)DIALOG_TIMEOUT);
        requestBalance();
        showTransfer();
        return;
    }

    if (msg == "reset")
    {
        if (user == llGetOwner()) llResetScript();
    }
}

default
{
    state_entry()
    {
        ensureListens();
        llOwnerSay(DISPLAY_TITLE + " online. Type /77 wallet for fallback wallet controls.");
    }

    on_rez(integer startParam)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }

    timer()
    {
        if (activeUser != NULL_KEY) llRegionSayTo(activeUser, 0, DISPLAY_TITLE + " menu timed out.");
        closeMenu();
    }

    touch_start(integer total)
    {
        key toucher = llDetectedKey(0);
        if (toucher == llGetOwner() || llSameGroup(toucher)) openSafeMode(toucher);
    }

    listen(integer ch, string name, key id, string msg)
    {
        if (ch == BANK_CH)
        {
            handleBankReply(msg);
            return;
        }

        if (ch == COMMAND_CH)
        {
            handleCommand(id, msg);
            return;
        }

        if (ch == menuCh && id == activeUser)
        {
            llSetTimerEvent((float)DIALOG_TIMEOUT);
            handleDialog(msg);
        }
    }

    link_message(integer sender, integer num, string str, key id)
    {
        if (num == LM_WALLET_COMMAND)
        {
            if (id != llGetOwner()) return;
            handleCommand(llGetOwner(), str);
        }
    }
}
