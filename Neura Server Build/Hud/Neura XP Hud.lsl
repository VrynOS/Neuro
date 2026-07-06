// =====================================================//
// Name of script: Neura XP Hud
// Build: 1001
// Update: Initial XP Hud Bridge
// Date and time: 2026-07-06 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

string DISPLAY_TITLE = "Neura XP Hud";
integer BUILD_NUMBER = 1001;

string FEATURE_ID = "NEURA_XP";
string XP_SERVER_FILE = "Server/Neura XP Server.lsl";
string XP_NEURON_FILE = "Neuron/Neura Neuron XP.lsl";
string XP_JS_FILE = "Web/neura-xp.js";

integer LM_NEURA_XP_READY = 1001650;
integer LM_NEURA_XP_SERVER = 1001601;
integer LM_NEURA_XP_REPLY = 1001602;
integer LM_NEURA_XP_NEURON = 1001603;
integer LM_NEURA_XP_NEURON_REPLY = 1001604;
integer XP_COMMAND_CHANNEL = -73463309;
integer XP_REPLY_CHANNEL = -73463310;

announceXpHud()
{
    llMessageLinked(LINK_SET, LM_NEURA_XP_READY,
        "NEURA_XP_HUD_READY"
        + "|feature=" + FEATURE_ID
        + "|build=" + (string)BUILD_NUMBER
        + "|server=" + XP_SERVER_FILE
        + "|neuron=" + XP_NEURON_FILE
        + "|js=" + XP_JS_FILE,
        llGetOwner());
}

sendXpServer(string message)
{
    llRegionSay(XP_COMMAND_CHANNEL, message + "|owner=" + (string)llGetOwner());
}

sendXpNeuron(string message)
{
    llMessageLinked(LINK_SET, LM_NEURA_XP_NEURON, message, llGetOwner());
}

sendXpHandshake()
{
    sendXpServer("NEURA_XP_HANDSHAKE|feature=" + FEATURE_ID + "|schema=1");
}

sendXpRead()
{
    sendXpHandshake();
    sendXpServer("NEURA_XP_READ|feature=" + FEATURE_ID + "|schema=1");
}

integer startsWith(string value, string prefix)
{
    return llGetSubString(value, 0, llStringLength(prefix) - 1) == prefix;
}

string cleanText(string value)
{
    return llStringTrim(value, STRING_TRIM);
}

string commandName(string message)
{
    return llToUpper(cleanText(llList2String(llParseStringKeepNulls(message, ["|"], []), 0)));
}

integer isXpReplyCommand(string command)
{
    if (command == "NEURA_XP_HANDSHAKE_OK") return TRUE;
    if (command == "NEURA_XP_DATA") return TRUE;
    if (command == "NEURA_XP_ERROR") return TRUE;
    return FALSE;
}

handleHudCommand(string message)
{
    string command;

    command = commandName(message);
    if (isXpReplyCommand(command)) return;

    if (startsWith(command, "NEURA_XP_NEURON_") || startsWith(command, "XP_NEURON_"))
    {
        sendXpNeuron(message);
        return;
    }

    if (startsWith(command, "NEURA_XP_") || startsWith(command, "XP_"))
    {
        if (command == "NEURA_XP_HUD_READY") return;

        if (command == "NEURA_XP_READ" || command == "XP_READ")
        {
            sendXpRead();
            return;
        }

        sendXpServer(message);
    }
}

forwardXpReply(string message, key id)
{
    string command;

    command = commandName(message);
    if (command == "NEURA_XP_ERROR") return;
    if (!startsWith(command, "NEURA_XP_") && !startsWith(command, "XP_")) return;

    llMessageLinked(LINK_SET, LM_NEURA_XP_READY, message, id);
}

default
{
    state_entry()
    {
        llListen(XP_REPLY_CHANNEL, "", NULL_KEY, "");
        announceXpHud();
        sendXpRead();
        llOwnerSay(DISPLAY_TITLE + " online | Build " + (string)BUILD_NUMBER);
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
        if (id != llGetOwner()) return;

        if (number == LM_NEURA_XP_READY)
        {
            handleHudCommand(message);
            return;
        }

        if (number == LM_NEURA_XP_REPLY)
        {
            forwardXpReply(message, id);
            return;
        }

        if (number == LM_NEURA_XP_NEURON_REPLY)
        {
            forwardXpReply(message, id);
        }
    }

    listen(integer channel, string name, key id, string message)
    {
        string ownerMarker;

        if (channel != XP_REPLY_CHANNEL) return;

        ownerMarker = "|owner=" + (string)llGetOwner();
        if (llSubStringIndex(message, ownerMarker) == -1) return;

        forwardXpReply(message, llGetOwner());
    }
}
