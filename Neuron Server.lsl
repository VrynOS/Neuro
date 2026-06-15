// =====================================================
// Neuron Server
// Build 0.1
//
// Drop this into the Camden Falls/Neuro server object.
// It stores the last known Neuron state by avatar UUID.
//
// Important rule:
// If the HUD is off or Neuron is detached, scripts inside
// those objects cannot keep running. The server keeps the
// backup state and marks stats paused/offline until Neuron
// returns.
//
// Commands:
//   /77 neuron server status
// =====================================================

string DISPLAY_TITLE = "Neuron Server";
integer BUILD_NUMBER = 1;

integer NEURON_SERVER_CHANNEL = -73463305;
integer COMMAND_CHANNEL = 77;
string CDF_TOKEN = "CDF_WORLD_V1";

integer gListenNeuron;
integer gListenCommand;
integer gStored;
integer gRestored;
integer gRejected;

string stateKey(key avatar)
{
    return "NEURON_STATE:" + (string)avatar;
}

string indexKey()
{
    return "NEURON_INDEX";
}

integer indexHas(key avatar)
{
    string raw = llLinksetDataRead(indexKey());
    if (raw == "") return FALSE;
    return (llSubStringIndex("|" + raw + "|", "|" + (string)avatar + "|") != -1);
}

addIndex(key avatar)
{
    string raw;

    if (avatar == NULL_KEY) return;
    if (indexHas(avatar)) return;

    raw = llLinksetDataRead(indexKey());
    if (raw == "") raw = (string)avatar;
    else raw += "|" + (string)avatar;
    llLinksetDataWrite(indexKey(), raw);
}

integer validNeuronMessage(string message)
{
    if (llJsonGetValue(message, ["token"]) != CDF_TOKEN) return FALSE;
    if (llJsonGetValue(message, ["source"]) != "neuron.brain") return FALSE;
    if (llJsonGetValue(message, ["event"]) == JSON_INVALID) return FALSE;
    if (llJsonGetValue(message, ["avatar"]) == JSON_INVALID) return FALSE;
    return TRUE;
}

storeSnapshot(string message)
{
    key avatar = (key)llJsonGetValue(message, ["avatar"]);

    if (avatar == NULL_KEY) return;
    llLinksetDataWrite(stateKey(avatar), message);
    addIndex(avatar);
    ++gStored;
}

restoreSnapshot(key avatar)
{
    string state;

    if (avatar == NULL_KEY) return;
    state = llLinksetDataRead(stateKey(avatar));
    if (state == "") return;

    llRegionSay(NEURON_SERVER_CHANNEL, "NEURON_RESTORE|" + (string)avatar + "|" + state);
    ++gRestored;
}

status(key avatar)
{
    string raw = llLinksetDataRead(indexKey());
    integer count = 0;

    if (raw != "") count = llGetListLength(llParseString2List(raw, ["|"], []));

    llRegionSayTo(avatar, 0,
        "Neuron Server"
        + "\nStored profiles: " + (string)count
        + "\nSnapshots stored: " + (string)gStored
        + "\nRestores sent: " + (string)gRestored
        + "\nRejected: " + (string)gRejected
    );
}

default
{
    state_entry()
    {
        gListenNeuron = llListen(NEURON_SERVER_CHANNEL, "", NULL_KEY, "");
        gListenCommand = llListen(COMMAND_CHANNEL, "", llGetOwner(), "");
        llOwnerSay(DISPLAY_TITLE + " online | Build " + (string)BUILD_NUMBER);
    }

    listen(integer channel, string name, key id, string message)
    {
        string eventName;
        key avatar;

        if (channel == COMMAND_CHANNEL)
        {
            if (llToLower(message) == "neuron server status") status(id);
            return;
        }

        if (!validNeuronMessage(message))
        {
            ++gRejected;
            return;
        }

        eventName = llJsonGetValue(message, ["event"]);
        avatar = (key)llJsonGetValue(message, ["avatar"]);

        if (eventName == "neuron.restore.request")
        {
            restoreSnapshot(avatar);
            return;
        }

        if (eventName == "neuron.snapshot")
        {
            storeSnapshot(message);
            return;
        }
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
