// =====================================================
// G Coin System - AtlasVault Core Part 1
// Build 20405
//
// Listener/router, balances, signup, user list, payroll,
// display-name storage, admin add funds, server status.
//
// Storage changed for stability:
//   BBS_ACCT:<uuid> = checking|savings
//   BBS_ACCT_INDEX = uuid|uuid|uuid
//
// Pair with GC_AtlasVault_Core_20405_part2.
// Run GC_AtlasVault_Account_Migrator_20405 once before using live.
// =====================================================

string DISPLAY_TITLE = "G Coin AtlasVault Node";
integer BUILD_NUMBER = 20405;
string PROJECT_ID = "9869872-0412110914";

key BANK_ADMIN = "0f6de87a-d007-46bb-85e5-fceccf6974ae";
float SIGNUP_BONUS = 1000.00;

integer LM_REQ = 1000;
integer LM_RSP = 2000;
integer LM_TXN_REQ = 2101;

integer BANK_CH = -777777;
integer UPDATE_CH = -9869870;

string LSD_SIGNUP = "BBS_SIGNUP_CLAIMED";
string LSD_SETTINGS = "BBS_SETTINGS";
string LSD_NAMES = "BBS_NAMES";
string LSD_STATUS = "GC_SERVER_STATUS";
string LSD_INDEX = "BBS_ACCT_INDEX";

integer ONLINE_FACE = 1;
integer MAINTENANCE_FACE = 2;

string lastReqMsg = "";
integer lastReqTs = 0;

float round2(float v)
{
    return (float)llRound(v);
}

integer isAdmin(key user)
{
    return (user == BANK_ADMIN);
}

integer isLandGroup(key user)
{
    return llSameGroup(user);
}

integer isTrustedPayrollSender(key sender)
{
    if (sender == llGetKey()) return TRUE;
    return (llGetOwnerKey(sender) == BANK_ADMIN);
}

integer isServerOnline()
{
    return (llLinksetDataRead(LSD_STATUS) != "MAINTENANCE");
}

setServerOnline(integer online)
{
    if (online)
    {
        llLinksetDataWrite(LSD_STATUS, "ONLINE");
        llOwnerSay(DISPLAY_TITLE + " ONLINE | Build " + (string)BUILD_NUMBER);
    }
    else
    {
        llLinksetDataWrite(LSD_STATUS, "MAINTENANCE");
        llOwnerSay(DISPLAY_TITLE + " MAINTENANCE MODE | banking requests paused");
    }
}

string defaultSettings()
{
    return "DEP=0|WDR=0|TRN=0|SND=0";
}

string accountKey(key id)
{
    return "BBS_ACCT:" + (string)id;
}

list loadAccount(key id)
{
    string raw;
    list p;

    if (id == NULL_KEY) return [0.0, 0.0];
    raw = llLinksetDataRead(accountKey(id));
    if (raw == "") return [0.0, 0.0];

    p = llParseString2List(raw, ["|"], []);
    if (llGetListLength(p) < 2) return [0.0, 0.0];
    return [round2((float)llList2String(p, 0)), round2((float)llList2String(p, 1))];
}

saveAccount(key id, float checking, float savings)
{
    if (id == NULL_KEY) return;
    llLinksetDataWrite(accountKey(id), (string)round2(checking) + "|" + (string)round2(savings));
}

list loadIndex()
{
    string raw = llLinksetDataRead(LSD_INDEX);
    if (raw == "") return [];
    return llParseString2List(raw, ["|"], []);
}

saveIndex(list rows)
{
    llLinksetDataWrite(LSD_INDEX, llDumpList2String(rows, "|"));
}

ensureIndex(key id)
{
    string raw;
    if (id == NULL_KEY) return;
    raw = llLinksetDataRead(LSD_INDEX);
    if (llSubStringIndex("|" + raw + "|", "|" + (string)id + "|") == -1)
    {
        if (raw == "") raw = (string)id;
        else raw += "|" + (string)id;
        llLinksetDataWrite(LSD_INDEX, raw);
    }
}

ensureAccount(key id)
{
    if (id == NULL_KEY) return;
    if (llLinksetDataRead(accountKey(id)) == "") saveAccount(id, 0.0, 0.0);
    ensureIndex(id);
}

list loadSignup()
{
    string raw = llLinksetDataRead(LSD_SIGNUP);
    if (raw == "") return [];
    return llParseString2List(raw, ["|"], []);
}

saveSignup(list s)
{
    llLinksetDataWrite(LSD_SIGNUP, llDumpList2String(s, "|"));
}

integer hasClaimed(list signup, key id)
{
    return (llListFindList(signup, [(string)id]) != -1);
}

list markClaimed(list signup, key id)
{
    if (!hasClaimed(signup, id)) signup += [(string)id];
    return signup;
}

integer validDisplayName(string name)
{
    if (name == "") return FALSE;
    if (name == "Resident") return FALSE;
    if (llGetSubString(name, 0, 4) == "User-") return FALSE;
    return TRUE;
}

list loadNames()
{
    string raw = llLinksetDataRead(LSD_NAMES);
    if (raw == "") return [];
    return llParseString2List(raw, ["|"], []);
}

saveNames(list rows)
{
    llLinksetDataWrite(LSD_NAMES, llDumpList2String(rows, "|"));
}

integer nameRowIndex(list rows, key id)
{
    string sid = (string)id;
    integer i;
    string row;
    list p;

    for (i = 0; i < llGetListLength(rows); i++)
    {
        row = llList2String(rows, i);
        p = llParseString2List(row, [","], []);
        if (llGetListLength(p) >= 1)
        {
            if (llList2String(p, 0) == sid) return i;
        }
    }
    return -1;
}

rememberDisplayName(key id)
{
    string name;
    string agentName;
    list rows;
    integer idx;
    string row;

    if (id == NULL_KEY) return;

    name = llGetDisplayName(id);
    if (!validDisplayName(name)) return;
    agentName = llGetUsername(id);

    rows = loadNames();
    idx = nameRowIndex(rows, id);
    row = (string)id + "," + llStringToBase64(name) + "," + llStringToBase64(agentName) + "," + (string)llGetUnixTime();

    if (idx == -1) rows += [row];
    else rows = llListReplaceList(rows, [row], idx, idx);

    saveNames(rows);
}

string storedDisplayName64(key id)
{
    list rows;
    integer idx;
    string row;
    list p;

    rows = loadNames();
    idx = nameRowIndex(rows, id);
    if (idx == -1) return "";

    row = llList2String(rows, idx);
    p = llParseString2List(row, [","], []);
    if (llGetListLength(p) < 2) return "";
    return llList2String(p, 1);
}

sendRSP(key user, key uiKey, string msg)
{
    llMessageLinked(LINK_SET, LM_RSP, msg, user);
    if (uiKey != NULL_KEY) llRegionSayTo(uiKey, BANK_CH, msg);
}

replyToUI(string type, key user, key uiKey, string payload)
{
    sendRSP(user, uiKey, "RSP|" + type + "|" + (string)user + "|" + (string)uiKey + "|" + payload);
}

replyBAL(key user, key uiKey, float check, float save)
{
    sendRSP(user, uiKey,
        "RSP|BAL|" + (string)user + "|" + (string)uiKey + "|"
        + (string)round2(check) + "|" + (string)round2(save)
        + "|ADMIN=" + (string)isAdmin(user)
    );
}

replyOK(key user, key uiKey, string extra)
{
    replyToUI("OK", user, uiKey, extra + "|ADMIN=" + (string)isAdmin(user));
}

replyFAIL(key user, key uiKey, string reason)
{
    replyToUI("FAIL", user, uiKey, reason + "|ADMIN=" + (string)isAdmin(user));
}

replyUSERLIST(key user, key uiKey)
{
    list indexRows = loadIndex();
    list users = [];
    integer i;
    key id;
    string name64;

    for (i = 0; i < llGetListLength(indexRows); ++i)
    {
        id = (key)llList2String(indexRows, i);
        if (id != NULL_KEY && id != user)
        {
            name64 = storedDisplayName64(id);
            if (name64 == "")
            {
                rememberDisplayName(id);
                name64 = storedDisplayName64(id);
            }
            if (name64 != "") users += [(string)id + "," + name64];
        }
    }

    replyToUI("USERLIST", user, uiKey, llDumpList2String(users, "|") + "|ADMIN=" + (string)isAdmin(user));
}

integer isPart2Command(string cmd)
{
    if (cmd == "DEPO") return TRUE;
    if (cmd == "WD") return TRUE;
    if (cmd == "XFER") return TRUE;
    if (cmd == "SEND") return TRUE;
    if (cmd == "ADMIN_SEND") return TRUE;
    if (cmd == "ADMIN_WD_INV") return TRUE;
    if (cmd == "ADMIN_WD_SAV") return TRUE;
    return FALSE;
}

handleUpdateMessage(string msg, key sender)
{
    list p;
    string pid;
    integer nb;

    if (sender != llGetOwner()) return;

    p = llParseString2List(msg, ["|"], []);
    if (llGetListLength(p) < 3) return;
    if (llList2String(p, 0) != "UPDATE") return;

    pid = llList2String(p, 1);
    nb = (integer)llList2String(p, 2);
    if (pid != PROJECT_ID) return;

    if (nb > BUILD_NUMBER)
        sendRSP(llGetOwner(), NULL_KEY, "RSP|UPDATE|" + (string)llGetOwner() + "|NULL|NEW_BUILD=" + (string)nb);
}

handleReq(string msg, key sender)
{
    list parts;
    integer now;
    string cmd;
    key user;
    key uiKey;
    float amt;
    key target;
    string extra;
    list signup;
    list acct;
    float check;
    float save;
    key who;
    list whoAcct;
    float wC;
    float wS;

    parts = llParseString2List(msg, ["|"], []);
    if (llGetListLength(parts) < 6) return;
    if (llList2String(parts, 0) != "REQ") return;

    now = llGetUnixTime();
    if (msg == lastReqMsg && now - lastReqTs <= 2) return;
    lastReqMsg = msg;
    lastReqTs = now;

    cmd = llList2String(parts, 1);
    user = (key)llList2String(parts, 2);
    uiKey = (key)llList2String(parts, 3);
    amt = round2((float)llList2String(parts, 4));
    target = (key)llList2String(parts, 5);
    extra = "";
    if (llGetListLength(parts) >= 7) extra = llList2String(parts, 6);

    if (cmd == "PAYROLL")
    {
        if (!isTrustedPayrollSender(sender)) { replyFAIL(user, uiKey, "Payroll sender not trusted"); return; }
        if (!isAdmin(user)) { replyFAIL(user, uiKey, "Payroll admin only"); return; }
        if (target == NULL_KEY) { replyFAIL(user, uiKey, "Missing payroll recipient"); return; }
        if (amt <= 0.0) { replyFAIL(user, uiKey, "Invalid payroll amount"); return; }

        ensureAccount(user);
        ensureAccount(target);
        whoAcct = loadAccount(target);
        wC = llList2Float(whoAcct, 0);
        wS = llList2Float(whoAcct, 1);
        saveAccount(target, wC + amt, wS);

        replyOK(user, uiKey, "PAYROLL|" + (string)amt + "|" + (string)target + "|" + extra);
        return;
    }

    if (!isLandGroup(user)) { replyFAIL(user, uiKey, "Land group required"); return; }
    if (!isServerOnline() && !isAdmin(user))
    {
        replyFAIL(user, uiKey, "G Coin System is currently in maintenance. Please try again soon.");
        return;
    }

    rememberDisplayName(user);
    if (target != NULL_KEY) rememberDisplayName(target);
    ensureAccount(user);
    if (target != NULL_KEY) ensureAccount(target);

    if (isPart2Command(cmd))
    {
        llMessageLinked(LINK_SET, LM_TXN_REQ, msg, sender);
        return;
    }

    acct = loadAccount(user);
    check = llList2Float(acct, 0);
    save = llList2Float(acct, 1);

    if (cmd == "BALANCE")
    {
        replyBAL(user, uiKey, check, save);
        return;
    }

    if (cmd == "USERLIST")
    {
        replyUSERLIST(user, uiKey);
        return;
    }

    if (cmd == "SIGNUP")
    {
        signup = loadSignup();
        if (hasClaimed(signup, user)) { replyFAIL(user, uiKey, "Signup bonus already claimed"); return; }

        check += SIGNUP_BONUS;
        saveAccount(user, check, save);
        signup = markClaimed(signup, user);
        saveSignup(signup);

        replyOK(user, uiKey, "SIGNUP|" + (string)SIGNUP_BONUS);
        replyBAL(user, uiKey, check, save);
        return;
    }

    if (cmd == "ADDFUNDS")
    {
        if (!isAdmin(user)) { replyFAIL(user, uiKey, "Admin only"); return; }
        if (amt <= 0.0) { replyFAIL(user, uiKey, "Invalid amount"); return; }

        who = user;
        if (target != NULL_KEY) who = target;
        ensureAccount(who);
        whoAcct = loadAccount(who);
        wC = llList2Float(whoAcct, 0);
        wS = llList2Float(whoAcct, 1);
        saveAccount(who, wC + amt, wS);

        acct = loadAccount(user);
        replyOK(user, uiKey, "ADDFUNDS|" + (string)amt + "|" + (string)who);
        replyBAL(user, uiKey, llList2Float(acct, 0), llList2Float(acct, 1));
        return;
    }

    replyFAIL(user, uiKey, "Unknown command");
}

default
{
    state_entry()
    {
        if (llLinksetDataRead(LSD_SETTINGS) == "") llLinksetDataWrite(LSD_SETTINGS, defaultSettings());
        if (llLinksetDataRead(LSD_STATUS) == "") llLinksetDataWrite(LSD_STATUS, "ONLINE");

        llListen(UPDATE_CH, "", NULL_KEY, "");
        llListen(BANK_CH, "", NULL_KEY, "");
        llOwnerSay(DISPLAY_TITLE + " part 1 online | " + llLinksetDataRead(LSD_STATUS) + " | Build " + (string)BUILD_NUMBER);
    }

    listen(integer ch, string nm, key id, string msg)
    {
        if (ch == UPDATE_CH) { handleUpdateMessage(msg, id); return; }
        if (ch == BANK_CH) { handleReq(msg, id); return; }
    }

    link_message(integer sender_num, integer num, string str, key id)
    {
        if (num == LM_REQ) handleReq(str, llGetKey());
    }

    touch_start(integer total)
    {
        key toucher;
        integer face;
        integer link;
        string name;

        toucher = llDetectedKey(0);
        if (!isAdmin(toucher) && toucher != llGetOwner()) return;

        face = llDetectedTouchFace(0);
        if (face == ONLINE_FACE) { setServerOnline(TRUE); return; }
        if (face == MAINTENANCE_FACE) { setServerOnline(FALSE); return; }

        link = llDetectedLinkNumber(0);
        name = llToUpper(llGetLinkName(link));

        if (llSubStringIndex(name, "ONLINE") != -1 || llSubStringIndex(name, "GREEN") != -1)
        {
            setServerOnline(TRUE);
            return;
        }

        if (llSubStringIndex(name, "MAINT") != -1 || llSubStringIndex(name, "OFFLINE") != -1 || llSubStringIndex(name, "RED") != -1)
        {
            setServerOnline(FALSE);
            return;
        }

        llOwnerSay(DISPLAY_TITLE + " status: " + llLinksetDataRead(LSD_STATUS) + " | Build " + (string)BUILD_NUMBER);
    }

    changed(integer change)
    {
        if (change & CHANGED_REGION_START)
        {
            llOwnerSay(DISPLAY_TITLE + " detected region start | " + llLinksetDataRead(LSD_STATUS) + " | data loaded from Linkset Data");
        }
    }
}
