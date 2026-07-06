// =====================================================//
// Name of script: Neura XP Server
// Build: 1001
// Update: Initial XP Server Migration
// Date and time: 2026-07-06 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

string DISPLAY_TITLE = "Neura XP Server";
integer BUILD_NUMBER = 1001;

string FEATURE_ID = "NEURA_XP";
integer SCHEMA_VERSION = 1;

integer LM_NEURA_XP_SERVER = 1001601;
integer LM_NEURA_XP_REPLY = 1001602;
integer XP_COMMAND_CHANNEL = -73463309;
integer XP_REPLY_CHANNEL = -73463310;
integer CDF_TRACKER_CHANNEL = -73463301;
integer NEURON_SERVER_CHANNEL = -73463305;
string CDF_TOKEN = "CDF_WORLD_V1";

integer XP_PER_LEVEL = 2500;
integer XP_WEAR_TICK_SECONDS = 1800;
integer XP_WEAR_TICK = 25;
integer XP_BREADCRUMB_USE = 0;
integer XP_WALLET_USE = 100;
integer XP_WORK_CLOCK_IN = 150;
integer XP_WORK_CLOCK_OUT = 150;
integer XP_RENTAL_RENTED = 150;
integer XP_RENT_ON_TIME = 200;
integer XP_RENT_LATE = 50;
integer XP_TRANSACTION = 100;

integer gHandshakeReady = FALSE;
string gLastError = "";

string baseKey()
{
    return "NX:" + (string)llGetOwner() + ":";
}

string xpKey(string field)
{
    return baseKey() + field;
}

integer toInt(string value)
{
    if (value == "" || value == JSON_INVALID) return 0;
    return (integer)value;
}

string cleanText(string value)
{
    return llStringTrim(value, STRING_TRIM);
}

string lower(string value)
{
    return llToLower(cleanText(value));
}

string stored(string field)
{
    return llLinksetDataRead(xpKey(field));
}

string getJson(string raw, string field)
{
    string value = llJsonGetValue(raw, [field]);
    if (value == JSON_INVALID) return "";
    return value;
}

string getParam(list parts, string name)
{
    integer count;
    integer i;
    string target;
    string part;
    integer equalsAt;
    string keyName;

    count = llGetListLength(parts);
    i = 1;
    target = lower(name);

    while (i < count)
    {
        part = llList2String(parts, i);
        equalsAt = llSubStringIndex(part, "=");

        if (equalsAt > 0)
        {
            keyName = lower(llGetSubString(part, 0, equalsAt - 1));
            if (keyName == target) return llGetSubString(part, equalsAt + 1, -1);
        }

        i += 1;
    }

    return "";
}

integer levelFromXP(integer xp)
{
    if (xp < 0) xp = 0;
    return xp / XP_PER_LEVEL;
}

integer xpNextForLevel(integer level)
{
    return (level + 1) * XP_PER_LEVEL;
}

reply(string message)
{
    llMessageLinked(LINK_SET, LM_NEURA_XP_REPLY, message, llGetOwner());
    llRegionSay(XP_REPLY_CHANNEL, message + "|owner=" + (string)llGetOwner());
}

deny(string reason)
{
    reply("NEURA_XP_ERROR|reason=" + reason);
}

integer validFeature(list parts)
{
    if (getParam(parts, "feature") == FEATURE_ID) return TRUE;
    gLastError = "unknown_feature";
    return FALSE;
}

integer validSchema(list parts)
{
    if ((integer)getParam(parts, "schema") == SCHEMA_VERSION) return TRUE;
    gLastError = "schema_mismatch";
    return FALSE;
}

integer validateEnvelope(list parts)
{
    if (!validFeature(parts)) return FALSE;
    if (!validSchema(parts)) return FALSE;
    if (!gHandshakeReady) gHandshakeReady = TRUE;
    return TRUE;
}

ensureDefaults()
{
    integer now = llGetUnixTime();
    if (stored("xp") == "") llLinksetDataWrite(xpKey("xp"), "0");
    if (stored("level") == "") llLinksetDataWrite(xpKey("level"), "0");
    if (stored("xpNext") == "") llLinksetDataWrite(xpKey("xpNext"), (string)XP_PER_LEVEL);
    if (stored("xpPerLevel") == "") llLinksetDataWrite(xpKey("xpPerLevel"), (string)XP_PER_LEVEL);
    if (stored("verified") == "") llLinksetDataWrite(xpKey("verified"), "0");
    if (stored("xpPaused") == "") llLinksetDataWrite(xpKey("xpPaused"), "0");
    if (stored("wearActive") == "") llLinksetDataWrite(xpKey("wearActive"), "0");
    if (stored("lastWearXp") == "") llLinksetDataWrite(xpKey("lastWearXp"), (string)now);
    if (stored("updated") == "") llLinksetDataWrite(xpKey("updated"), (string)now);
}

saveXP(integer xp)
{
    integer level;
    if (xp < 0) xp = 0;
    level = levelFromXP(xp);
    llLinksetDataWrite(xpKey("xp"), (string)xp);
    llLinksetDataWrite(xpKey("level"), (string)level);
    llLinksetDataWrite(xpKey("xpNext"), (string)xpNextForLevel(level));
    llLinksetDataWrite(xpKey("xpPerLevel"), (string)XP_PER_LEVEL);
    llLinksetDataWrite(xpKey("verified"), (string)(level >= 10));
    llLinksetDataWrite(xpKey("updated"), (string)llGetUnixTime());
}

addXP(integer amount)
{
    if (amount <= 0) return;
    ensureDefaults();
    if (toInt(stored("xpPaused"))) return;
    saveXP(toInt(stored("xp")) + amount);
}

sendXP()
{
    ensureDefaults();
    reply("NEURA_XP_DATA"
        + "|feature=" + FEATURE_ID
        + "|schema=" + (string)SCHEMA_VERSION
        + "|xp=" + stored("xp")
        + "|level=" + stored("level")
        + "|xpNext=" + stored("xpNext")
        + "|xpPerLevel=" + stored("xpPerLevel")
        + "|verified=" + stored("verified")
        + "|xpPaused=" + stored("xpPaused")
        + "|wearActive=" + stored("wearActive")
        + "|updated=" + stored("updated"));
}

integer xpForPayload(string payload)
{
    string eventName;
    string typeName;
    string detail;
    string custom;

    eventName = lower(getJson(payload, "event"));
    typeName = lower(getJson(payload, "type"));
    detail = lower(getJson(payload, "detail"));
    custom = getJson(payload, "xp");

    if (custom != "") return toInt(custom);
    if (llSubStringIndex(eventName, "heartbeat") != -1) return 0;
    if (llSubStringIndex(eventName, "register") != -1) return 0;
    if (llSubStringIndex(eventName, "online") != -1) return 0;
    if (llSubStringIndex(eventName, "restore") != -1) return 0;
    if (llSubStringIndex(eventName, "clock.in") != -1 || llSubStringIndex(eventName, "clockin") != -1) return XP_WORK_CLOCK_IN;
    if (llSubStringIndex(eventName, "clock.out") != -1 || llSubStringIndex(eventName, "clockout") != -1 || llSubStringIndex(eventName, "auto.clock") != -1) return XP_WORK_CLOCK_OUT;
    if (typeName == "work") return XP_WORK_CLOCK_IN;

    if (typeName == "rent")
    {
        if (llSubStringIndex(eventName, "late") != -1 || llSubStringIndex(detail, "late") != -1) return XP_RENT_LATE;
        if (llSubStringIndex(eventName, "pay") != -1 || llSubStringIndex(detail, "paid") != -1) return XP_RENT_ON_TIME;
        return XP_RENTAL_RENTED;
    }

    if (typeName == "wallet") return XP_WALLET_USE;
    if (typeName == "vendor" || typeName == "tip" || typeName == "payout" || typeName == "kiosk") return XP_TRANSACTION;
    if (typeName == "cycle_hygiene" || typeName == "care_product") return 0;
    if (llSubStringIndex(eventName, "gcoin") != -1 || llSubStringIndex(eventName, "transaction") != -1 || llSubStringIndex(eventName, "purchase") != -1) return XP_TRANSACTION;
    return XP_BREADCRUMB_USE;
}

handleBreadcrumb(string payload)
{
    key avatar;
    integer gain;

    if (llJsonGetValue(payload, ["token"]) != CDF_TOKEN) return;
    avatar = (key)getJson(payload, "avatar");
    if (avatar != llGetOwner()) return;

    gain = xpForPayload(payload);
    addXP(gain);
    if (gain > 0) sendXP();
}

handlePresence(string payload)
{
    key avatar;
    string eventName;
    integer now;

    if (llJsonGetValue(payload, ["token"]) != CDF_TOKEN) return;
    avatar = (key)getJson(payload, "avatar");
    if (avatar != llGetOwner()) return;

    eventName = lower(getJson(payload, "event"));
    if (llSubStringIndex(eventName, "online") == -1
        && llSubStringIndex(eventName, "restore") == -1
        && llSubStringIndex(eventName, "offline") == -1
        && llSubStringIndex(eventName, "detach") == -1)
    {
        return;
    }

    ensureDefaults();
    now = llGetUnixTime();

    if (llSubStringIndex(eventName, "offline") != -1 || llSubStringIndex(eventName, "detach") != -1)
    {
        llLinksetDataWrite(xpKey("wearActive"), "0");
        llLinksetDataWrite(xpKey("lastWearXp"), (string)now);
    }
    else
    {
        llLinksetDataWrite(xpKey("wearActive"), "1");
        if (stored("lastWearXp") == "") llLinksetDataWrite(xpKey("lastWearXp"), (string)now);
    }

    llLinksetDataWrite(xpKey("updated"), (string)now);
    sendXP();
}

applyWearXP()
{
    integer now;
    integer last;
    integer ticks;

    ensureDefaults();
    now = llGetUnixTime();
    last = toInt(stored("lastWearXp"));

    if (toInt(stored("xpPaused")) || !toInt(stored("wearActive")))
    {
        llLinksetDataWrite(xpKey("lastWearXp"), (string)now);
        return;
    }

    ticks = (now - last) / XP_WEAR_TICK_SECONDS;
    if (ticks <= 0) return;
    if (ticks > 2) ticks = 2;

    saveXP(toInt(stored("xp")) + (ticks * XP_WEAR_TICK));
    llLinksetDataWrite(xpKey("lastWearXp"), (string)(last + (ticks * XP_WEAR_TICK_SECONDS)));
    sendXP();
}

handleCommand(string message, key requester, string routeName)
{
    list parts;
    string command;
    string ownerId;
    string value;

    parts = llParseStringKeepNulls(message, ["|"], []);
    command = llToUpper(cleanText(llList2String(parts, 0)));
    ownerId = cleanText(getParam(parts, "owner"));

    if (ownerId != "" && ownerId != (string)llGetOwner()) return;
    if (requester != NULL_KEY && requester != llGetOwner() && ownerId == "") return;

    if (command == "NEURA_XP_HANDSHAKE" || command == "XP_HANDSHAKE")
    {
        gLastError = "";
        if (!validFeature(parts)) { deny(gLastError); return; }
        if (!validSchema(parts)) { deny(gLastError); return; }
        gHandshakeReady = TRUE;
        reply("NEURA_XP_HANDSHAKE_OK|feature=" + FEATURE_ID + "|build=" + (string)BUILD_NUMBER + "|schema=" + (string)SCHEMA_VERSION);
        return;
    }

    if (command == "NEURA_XP_READ" || command == "XP_READ")
    {
        gLastError = "";
        if (!validateEnvelope(parts)) { deny(gLastError); return; }
        sendXP();
        return;
    }

    if (command == "NEURA_XP_ADD" || command == "XP_ADD")
    {
        gLastError = "";
        if (!validateEnvelope(parts)) { deny(gLastError); return; }
        addXP(toInt(getParam(parts, "amount")));
        sendXP();
        return;
    }

    if (command == "NEURA_XP_PAUSE" || command == "XP_PAUSE")
    {
        gLastError = "";
        if (!validateEnvelope(parts)) { deny(gLastError); return; }
        llLinksetDataWrite(xpKey("xpPaused"), "1");
        sendXP();
        return;
    }

    if (command == "NEURA_XP_RESUME" || command == "XP_RESUME")
    {
        gLastError = "";
        if (!validateEnvelope(parts)) { deny(gLastError); return; }
        llLinksetDataWrite(xpKey("xpPaused"), "0");
        llLinksetDataWrite(xpKey("lastWearXp"), (string)llGetUnixTime());
        sendXP();
        return;
    }

    if (command == "NEURA_XP_SET" || command == "XP_SET")
    {
        gLastError = "";
        if (!validateEnvelope(parts)) { deny(gLastError); return; }
        value = cleanText(getParam(parts, "xp"));
        saveXP(toInt(value));
        sendXP();
        return;
    }

    deny("unknown_command");
}

default
{
    state_entry()
    {
        llListen(CDF_TRACKER_CHANNEL, "", NULL_KEY, "");
        llListen(NEURON_SERVER_CHANNEL, "", NULL_KEY, "");
        llListen(XP_COMMAND_CHANNEL, "", NULL_KEY, "");
        ensureDefaults();
        llSetTimerEvent(60.0);
        llOwnerSay(DISPLAY_TITLE + " online | Build " + (string)BUILD_NUMBER + " | Schema " + (string)SCHEMA_VERSION);
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }

    link_message(integer sender, integer number, string message, key id)
    {
        if (number != LM_NEURA_XP_SERVER) return;
        if (id != llGetOwner()) { deny("owner_only"); return; }
        handleCommand(message, id, "link " + (string)sender);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel == XP_COMMAND_CHANNEL)
        {
            handleCommand(message, id, "region");
            return;
        }

        if (channel == CDF_TRACKER_CHANNEL)
        {
            handleBreadcrumb(message);
            return;
        }

        if (channel == NEURON_SERVER_CHANNEL)
        {
            handlePresence(message);
        }
    }

    timer()
    {
        applyWearXP();
    }
}
