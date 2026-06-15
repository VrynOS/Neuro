// =====================================================
// Neuro HUD Controller v0.1
//
// Drop this into the Neuro Pad HUD root.
// This is the SL-native control layer.
//
// Current focus:
// - Button detection by prim name
// - Settings > Neuron category
// - Sends Neuron commands without requiring /77 typing
// =====================================================

string DISPLAY_TITLE = "Neuro HUD Controller";
integer BUILD_NUMBER = 1;

integer NEURON_CONTROL_CHANNEL = -73463306;
integer DIALOG_TIMEOUT = 60;

integer gDialogChannel;
integer gDialogListen;
string gMode = "";
integer gDialogStarted;

string cleanName(string name)
{
    return llStringTrim(name, STRING_TRIM);
}

string lower(string value)
{
    return llToLower(llStringTrim(value, STRING_TRIM));
}

sendNeuronCommand(string cmd)
{
    llRegionSay(NEURON_CONTROL_CHANNEL, "NEURON_CMD|" + (string)llGetOwner() + "|" + cmd);
}

openMain()
{
    openDialog("main", "Neuro Pad\nChoose a section.", [
        "Neuron",
        "Apps",
        "Refresh",
        "Close"
    ]);
}

openSettings()
{
    openDialog("settings", "Settings\nChoose a category.", [
        "Neuron",
        "Display",
        "System",
        "Back",
        "Close"
    ]);
}

openNeuronSettings()
{
    openDialog("neuron", "Settings > Neuron", [
        "Setup",
        "Profile",
        "Stats",
        "Sync HUD",
        "Neuron",
        "Back",
        "Close"
    ]);
}

openApps()
{
    openDialog("apps", "Neuro apps\nFirst versions are placeholders.", [
        "Wallet",
        "Health",
        "Social",
        "Jobs",
        "Back",
        "Close"
    ]);
}

openDialog(string mode, string text, list buttons)
{
    if (gDialogListen) llListenRemove(gDialogListen);
    gDialogChannel = -1 * ((integer)llFrand(1000000.0) + 70000);
    gDialogListen = llListen(gDialogChannel, "", llGetOwner(), "");
    gMode = mode;
    gDialogStarted = llGetUnixTime();
    llSetTimerEvent(1.0);
    llDialog(llGetOwner(), text, buttons, gDialogChannel);
}

comingSoon(string name)
{
    llOwnerSay("Neuro: " + name + " is coming soon.");
}

handleButtonName(string name)
{
    string n = lower(name);

    if (n == "home") { openMain(); return; }
    if (n == "settings") { openSettings(); return; }
    if (n == "notifications") { comingSoon("Notifications"); return; }
    if (n == "wallet") { comingSoon("Wallet"); return; }
    if (n == "health") { comingSoon("Health"); return; }
    if (n == "social") { comingSoon("Social"); return; }
    if (n == "jobs") { comingSoon("Jobs"); return; }
    if (n == "edit") { sendNeuronCommand("setup"); return; }
    if (n == "refresh") { sendNeuronCommand("sync hud"); llOwnerSay("Neuro: sync requested."); return; }
    if (n == "minimize") { llOwnerSay("Neuro: minimize placeholder."); return; }
}

handleDialog(string msg)
{
    if (msg == "Close") return;
    if (msg == "Back")
    {
        if (gMode == "neuron" || gMode == "apps") openSettings();
        else openMain();
        return;
    }

    if (msg == "Refresh")
    {
        sendNeuronCommand("sync hud");
        llOwnerSay("Neuro: sync requested.");
        return;
    }

    if (msg == "Apps") { openApps(); return; }
    if (msg == "Neuron") { openNeuronSettings(); return; }
    if (msg == "Display" || msg == "System")
    {
        comingSoon(msg + " settings");
        return;
    }

    if (gMode == "neuron")
    {
        if (msg == "Setup") { sendNeuronCommand("setup"); return; }
        if (msg == "Profile") { sendNeuronCommand("profile"); return; }
        if (msg == "Stats") { sendNeuronCommand("stats"); return; }
        if (msg == "Sync HUD") { sendNeuronCommand("sync hud"); return; }
    }

    comingSoon(msg);
}

default
{
    state_entry()
    {
        llOwnerSay(DISPLAY_TITLE + " online | Build " + (string)BUILD_NUMBER);
    }

    touch_start(integer total)
    {
        integer i;
        string name;

        for (i = 0; i < total; ++i)
        {
            if (llDetectedKey(i) != llGetOwner()) return;
            name = cleanName(llGetLinkName(llDetectedLinkNumber(i)));
            handleButtonName(name);
        }
    }

    listen(integer channel, string name, key id, string msg)
    {
        if (channel == gDialogChannel && id == llGetOwner()) handleDialog(msg);
    }

    timer()
    {
        if (gDialogListen && llGetUnixTime() - gDialogStarted >= DIALOG_TIMEOUT)
        {
            llListenRemove(gDialogListen);
            gDialogListen = 0;
            llSetTimerEvent(0.0);
        }
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
