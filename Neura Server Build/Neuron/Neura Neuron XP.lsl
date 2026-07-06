// =====================================================//
// Name of script: Neura Neuron XP
// Build: 1001
// Update: Initial XP Presence Relay
// Date and time: 2026-07-06 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

string DISPLAY_TITLE = "Neura Neuron XP";
integer BUILD_NUMBER = 1001;

string FEATURE_ID = "NEURA_XP_NEURON";
integer SCHEMA_VERSION = 1;

integer NEURON_SERVER_CHANNEL = -73463305;
integer LM_NEURA_XP_NEURON = 1001603;
integer LM_NEURA_XP_NEURON_REPLY = 1001604;
string CDF_TOKEN = "CDF_WORLD_V1";

integer gHandshakeReady = FALSE;
string gLastError = "";

reply(string message)
{
    llMessageLinked(LINK_SET, LM_NEURA_XP_NEURON_REPLY, message, llGetOwner());
}

deny(string reason)
{
    reply("NEURA_XP_NEURON_ERROR|reason=" + reason);
}

string cleanText(string value)
{
    return llStringTrim(value, STRING_TRIM);
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

sendXpEvent(string eventName, string detail)
{
    llRegionSay(NEURON_SERVER_CHANNEL, llList2Json(JSON_OBJECT, [
        "token", CDF_TOKEN,
        "source", "neura.xp.neuron",
        "event", eventName,
        "avatar", (string)llGetOwner(),
        "attachment", (string)llGetKey(),
        "detail", detail,
        "region", llGetRegionName(),
        "time", (string)llGetUnixTime()
    ]));
}

sendOnline(string detail)
{
    sendXpEvent("neuron.online", detail);
    sendXpEvent("neuron.restore.request", "xp.restore");
}

handleHandshake(list parts)
{
    gLastError = "";
    if (!validFeature(parts)) { deny(gLastError); return; }
    if (!validSchema(parts)) { deny(gLastError); return; }
    gHandshakeReady = TRUE;
    reply("NEURA_XP_NEURON_HANDSHAKE_OK|feature=" + FEATURE_ID + "|build=" + (string)BUILD_NUMBER + "|schema=" + (string)SCHEMA_VERSION);
}

handlePing(list parts)
{
    if (!gHandshakeReady) { deny("handshake_required"); return; }
    gLastError = "";
    if (!validFeature(parts)) { deny(gLastError); return; }
    sendOnline("xp.ping");
    reply("NEURA_XP_NEURON_PING_OK|feature=" + FEATURE_ID + "|updated=" + llGetTimestamp());
}

default
{
    state_entry()
    {
        sendOnline("xp.online");
        llOwnerSay(DISPLAY_TITLE + " online | Build " + (string)BUILD_NUMBER + " | Schema " + (string)SCHEMA_VERSION);
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    attach(key id)
    {
        if (id != NULL_KEY) sendOnline("xp.attach");
        else sendXpEvent("neuron.offline", "xp.detach");
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
        if (change & CHANGED_REGION) sendOnline("xp.region");
    }

    link_message(integer sender, integer number, string message, key id)
    {
        list parts;
        string command;

        if (number != LM_NEURA_XP_NEURON) return;
        if (id != llGetOwner()) { deny("owner_only"); return; }

        parts = llParseStringKeepNulls(message, ["|"], []);
        command = llToUpper(cleanText(llList2String(parts, 0)));

        if (command == "NEURA_XP_NEURON_HANDSHAKE" || command == "XP_NEURON_HANDSHAKE") { handleHandshake(parts); return; }
        if (command == "NEURA_XP_NEURON_PING" || command == "XP_NEURON_PING") { handlePing(parts); return; }
        deny("unknown_command");
    }
}
