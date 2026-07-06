// =====================================================//
// Name of script: Neura Stats Server
// Build: 1010
// Update: Stamina Energy Impact
// Date and time: 2026-07-02 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

string DISPLAY_TITLE = "Neura Stats Server";
integer BUILD_NUMBER = 1010;

string FEATURE_ID = "NEURA_STATS";
integer SCHEMA_VERSION = 1;

integer LM_NEURA_STATS_SERVER = 1001501;
integer LM_NEURA_STATS_REPLY = 1001502;
integer CDF_TRACKER_CHANNEL = -73463301;
integer NEURON_SERVER_CHANNEL = -73463305;
integer STATS_COMMAND_CHANNEL = -73463307;
integer STATS_REPLY_CHANNEL = -73463308;
string CDF_TOKEN = "CDF_WORLD_V1";

list STAT_KEYS = ["hunger", "thirst", "sleep", "energy", "hygiene", "fun", "care"];

integer gHandshakeReady = FALSE;
string gLastError = "";

debugStats(string message)
{
}

string baseKey()
{
    return "NS:" + (string)llGetOwner() + ":";
}

string statKey(string field)
{
    return baseKey() + field;
}

string staminaKey()
{
    return "NEURON_STAMINA:" + (string)llGetOwner();
}

reply(string message)
{
    llMessageLinked(LINK_SET, LM_NEURA_STATS_REPLY, message, llGetOwner());
    llRegionSay(STATS_REPLY_CHANNEL, message + "|owner=" + (string)llGetOwner());
}

deny(string reason)
{
    reply("NEURA_STATS_ERROR|reason=" + reason);
}

integer isOwner(key requester)
{
    return requester == llGetOwner();
}

string cleanText(string value)
{
    return llStringTrim(value, STRING_TRIM);
}

string stored(string field)
{
    return llLinksetDataRead(statKey(field));
}

integer toInt(string value, integer fallback)
{
    if (value == "" || value == JSON_INVALID) return fallback;
    return (integer)value;
}

float toFloat(string value, float fallback)
{
    if (value == "" || value == JSON_INVALID) return fallback;
    return (float)value;
}

float clampStat(float value)
{
    if (value < 0.0) return 0.0;
    if (value > 100.0) return 100.0;
    return value;
}

integer decaySeconds(string statName)
{
    if (statName == "hunger") return 880;
    if (statName == "thirst") return 660;
    if (statName == "sleep") return 1400;
    if (statName == "energy") return 1500;
    if (statName == "hygiene") return 1400;
    if (statName == "fun") return 2100;
    if (statName == "care") return 2700;
    return 1800;
}

string lastKeyName(string statName)
{
    return "last." + statName;
}

integer validStatName(string statName)
{
    if (llListFindList(STAT_KEYS, [statName]) != -1) return TRUE;
    gLastError = "unknown_stat";
    return FALSE;
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
    target = llToLower(name);

    while (i < count)
    {
        part = llList2String(parts, i);
        equalsAt = llSubStringIndex(part, "=");

        if (equalsAt > 0)
        {
            keyName = llToLower(llGetSubString(part, 0, equalsAt - 1));
            if (keyName == target) return llGetSubString(part, equalsAt + 1, -1);
        }

        i += 1;
    }

    return "";
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

integer validateCommandEnvelope(list parts)
{
    if (!validFeature(parts)) return FALSE;
    if (!validSchema(parts)) return FALSE;
    if (!gHandshakeReady) gHandshakeReady = TRUE;
    return TRUE;
}

integer rangedStat(string label, string value)
{
    integer parsed;

    if (value == "")
    {
        gLastError = label + "_required";
        return -1;
    }

    parsed = (integer)value;
    if (parsed < 0 || parsed > 100)
    {
        gLastError = label + "_out_of_range";
        return -1;
    }

    return parsed;
}

ensureStatDefaults()
{
    integer count;
    integer i;
    integer now;
    string statName;

    count = llGetListLength(STAT_KEYS);
    i = 0;
    now = llGetUnixTime();

    while (i < count)
    {
        statName = llList2String(STAT_KEYS, i);
        if (stored(statName) == "") llLinksetDataWrite(statKey(statName), "100");
        if (stored(lastKeyName(statName)) == "") llLinksetDataWrite(statKey(lastKeyName(statName)), (string)now);
        i += 1;
    }

    if (stored("updated") == "") llLinksetDataWrite(statKey("updated"), llGetTimestamp());
}

writeStat(string statName, float value)
{
    llLinksetDataWrite(statKey(statName), (string)((integer)clampStat(value)));
    llLinksetDataWrite(statKey(lastKeyName(statName)), (string)llGetUnixTime());
    llLinksetDataWrite(statKey("updated"), llGetTimestamp());
}

writeStatNoClock(string statName, float value)
{
    llLinksetDataWrite(statKey(statName), (string)((integer)clampStat(value)));
    llLinksetDataWrite(statKey("updated"), llGetTimestamp());
}

applyDecay()
{
    integer count;
    integer i;
    integer now;
    integer didDecay;
    string statName;
    string lastName;
    integer seconds;
    integer last;
    integer steps;
    float value;

    count = llGetListLength(STAT_KEYS);
    i = 0;
    now = llGetUnixTime();
    didDecay = FALSE;
    ensureStatDefaults();

    while (i < count)
    {
        statName = llList2String(STAT_KEYS, i);
        lastName = lastKeyName(statName);
        seconds = decaySeconds(statName);
        last = toInt(stored(lastName), now);
        steps = (now - last) / seconds;

        if (steps > 0)
        {
            value = toFloat(stored(statName), 100.0) - (float)steps;
            writeStatNoClock(statName, value);
            llLinksetDataWrite(statKey(lastName), (string)(last + (steps * seconds)));
            didDecay = TRUE;
        }

        i += 1;
    }

    if (didDecay) llLinksetDataWrite(statKey("updated"), llGetTimestamp());
}

adjustStatValue(string statName, float amount)
{
    if (!validStatName(statName)) return;
    if (statName == "energy" && amount > 0.0)
    {
        float stamina = toFloat(llJsonGetValue(llLinksetDataRead(staminaKey()), ["current"]), 100.0);
        if (stamina < 25.0) amount = amount * 0.50;
        else if (stamina < 50.0) amount = amount * 0.75;
    }
    writeStat(statName, toFloat(stored(statName), 100.0) + amount);
}

sendStats()
{
    string message;
    integer count;
    integer i;
    string statName;

    applyDecay();
    message = "NEURA_STATS_DATA"
        + "|feature=" + FEATURE_ID
        + "|schema=" + (string)SCHEMA_VERSION;
    count = llGetListLength(STAT_KEYS);
    i = 0;

    while (i < count)
    {
        statName = llList2String(STAT_KEYS, i);
        message += "|" + statName + "=" + stored(statName);
        i += 1;
    }

    message += "|updated=" + stored("updated");
    reply(message);
}

handleHandshake(list parts)
{
    gLastError = "";
    if (!validFeature(parts)) { deny(gLastError); return; }
    if (!validSchema(parts)) { deny(gLastError); return; }
    gHandshakeReady = TRUE;
    reply("NEURA_STATS_HANDSHAKE_OK|feature=" + FEATURE_ID + "|build=" + (string)BUILD_NUMBER + "|schema=" + (string)SCHEMA_VERSION);
}

handleSet(list parts)
{
    string statName;
    integer value;

    gLastError = "";
    if (!validateCommandEnvelope(parts)) { deny(gLastError); return; }

    statName = llToLower(cleanText(getParam(parts, "stat")));
    if (!validStatName(statName)) { deny(gLastError); return; }

    value = rangedStat("value", cleanText(getParam(parts, "value")));
    if (value == -1) { deny(gLastError); return; }

    applyDecay();
    writeStat(statName, (float)value);
    reply("NEURA_STATS_SET_OK|feature=" + FEATURE_ID + "|stat=" + statName + "|value=" + (string)value + "|updated=" + stored("updated"));
    sendStats();
}

handleAdjust(list parts)
{
    string statName;
    integer delta;

    gLastError = "";
    if (!validateCommandEnvelope(parts)) { deny(gLastError); return; }

    statName = llToLower(cleanText(getParam(parts, "stat")));
    if (!validStatName(statName)) { deny(gLastError); return; }

    delta = (integer)cleanText(getParam(parts, "delta"));

    applyDecay();
    adjustStatValue(statName, (float)delta);
    reply("NEURA_STATS_ADJUST_OK|feature=" + FEATURE_ID + "|stat=" + statName + "|value=" + stored(statName) + "|updated=" + stored("updated"));
    sendStats();
}

handleRead(list parts)
{
    gLastError = "";
    if (!validateCommandEnvelope(parts)) { deny(gLastError); return; }
    sendStats();
}

handleStatsCommand(string message, key requester, string routeName)
{
    list parts;
    string command;
    string ownerId;

    parts = llParseStringKeepNulls(message, ["|"], []);
    command = llToUpper(cleanText(llList2String(parts, 0)));
    ownerId = cleanText(getParam(parts, "owner"));

    if (ownerId != "" && ownerId != (string)llGetOwner()) return;
    if (requester != NULL_KEY && requester != llGetOwner() && ownerId == "") return;

    if (command == "NEURA_STATS_HANDSHAKE" || command == "STATS_HANDSHAKE") { handleHandshake(parts); return; }
    if (command == "NEURA_STATS_SET" || command == "STATS_SET") { handleSet(parts); return; }
    if (command == "NEURA_STATS_ADJUST" || command == "STATS_ADJUST") { handleAdjust(parts); return; }
    if (command == "NEURA_STATS_READ" || command == "STATS_READ") { handleRead(parts); return; }

    deny("unknown_command");
}

handleBreadcrumb(string payload)
{
    key avatar;
    string value;

    avatar = (key)llJsonGetValue(payload, ["avatar"]);

    if (llJsonGetValue(payload, ["token"]) != CDF_TOKEN) return;
    if (avatar != llGetOwner()) return;

    applyDecay();

    value = llJsonGetValue(payload, ["stat.hunger"]);
    if (value != "" && value != JSON_INVALID) adjustStatValue("hunger", (float)value);
    value = llJsonGetValue(payload, ["stat.thirst"]);
    if (value != "" && value != JSON_INVALID) adjustStatValue("thirst", (float)value);
    value = llJsonGetValue(payload, ["stat.sleep"]);
    if (value != "" && value != JSON_INVALID) adjustStatValue("sleep", (float)value);
    value = llJsonGetValue(payload, ["stat.rest"]);
    if (value != "" && value != JSON_INVALID) adjustStatValue("sleep", (float)value);
    value = llJsonGetValue(payload, ["stat.energy"]);
    if (value != "" && value != JSON_INVALID) adjustStatValue("energy", (float)value);
    value = llJsonGetValue(payload, ["stat.health"]);
    if (value != "" && value != JSON_INVALID) adjustStatValue("energy", (float)value);
    value = llJsonGetValue(payload, ["stat.hygiene"]);
    if (value != "" && value != JSON_INVALID) adjustStatValue("hygiene", (float)value);
    value = llJsonGetValue(payload, ["stat.fun"]);
    if (value != "" && value != JSON_INVALID) adjustStatValue("fun", (float)value);
    value = llJsonGetValue(payload, ["stat.comfort"]);
    if (value != "" && value != JSON_INVALID) adjustStatValue("fun", (float)value);
    value = llJsonGetValue(payload, ["stat.care"]);
    if (value != "" && value != JSON_INVALID) adjustStatValue("care", (float)value);

    sendStats();
}

handleNeuronSignal(string payload)
{
    key avatar;
    string eventName;

    avatar = (key)llJsonGetValue(payload, ["avatar"]);
    eventName = llToLower(cleanText(llJsonGetValue(payload, ["event"])));

    if (llJsonGetValue(payload, ["token"]) != CDF_TOKEN) return;
    if (avatar != llGetOwner()) return;

    if (llJsonGetValue(payload, ["stat.hunger"]) != JSON_INVALID
        || llJsonGetValue(payload, ["stat.thirst"]) != JSON_INVALID
        || llJsonGetValue(payload, ["stat.sleep"]) != JSON_INVALID
        || llJsonGetValue(payload, ["stat.energy"]) != JSON_INVALID
        || llJsonGetValue(payload, ["stat.hygiene"]) != JSON_INVALID
        || llJsonGetValue(payload, ["stat.fun"]) != JSON_INVALID
        || llJsonGetValue(payload, ["stat.care"]) != JSON_INVALID)
    {
        handleBreadcrumb(payload);
        return;
    }

    if (eventName == "neuron.restore.request" || eventName == "neuron.online" || eventName == "neuron.relay.online")
    {
        applyDecay();
        sendStats();
    }
}

default
{
    state_entry()
    {
        llListen(CDF_TRACKER_CHANNEL, "", NULL_KEY, "");
        llListen(NEURON_SERVER_CHANNEL, "", NULL_KEY, "");
        llListen(STATS_COMMAND_CHANNEL, "", NULL_KEY, "");
        llLinksetDataWrite(statKey("schema"), (string)SCHEMA_VERSION);
        ensureStatDefaults();
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
        if (number != LM_NEURA_STATS_SERVER) return;
        if (!isOwner(id)) { deny("owner_only"); return; }
        handleStatsCommand(message, id, "link " + (string)sender);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel == STATS_COMMAND_CHANNEL)
        {
            handleStatsCommand(message, id, "region HUD");
            return;
        }

        if (llJsonGetValue(message, ["token"]) != CDF_TOKEN) return;

        if (channel == CDF_TRACKER_CHANNEL)
        {
            handleBreadcrumb(message);
            return;
        }

        if (channel == NEURON_SERVER_CHANNEL)
        {
            handleNeuronSignal(message);
        }
    }
}
