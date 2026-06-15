// =====================================================
// Neuro HUD Controller v0.3
//
// Drop this into the Neuro Pad HUD root.
// This is the SL-native control layer.
//
// Current focus:
// - Button detection by prim name
// - Settings > Neuron category
// - Sends Neuron and wallet commands without requiring /77 typing
// =====================================================

string DISPLAY_TITLE = "Neuro HUD Controller";
integer BUILD_NUMBER = 3;

integer NEURON_CONTROL_CHANNEL = -73463306;
integer LM_WALLET_COMMAND = 7401;
integer DIALOG_TIMEOUT = 60;

integer gDialogChannel;
integer gDialogListen;
string gMode = "";
integer gDialogStarted;
integer gOpen = FALSE;

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

sendWalletCommand(string cmd)
{
    llMessageLinked(LINK_SET, LM_WALLET_COMMAND, cmd, llGetOwner());
}

closeDialog()
{
    if (gDialogListen) llListenRemove(gDialogListen);
    gDialogListen = 0;
    gMode = "";
    llSetTimerEvent(0.0);
}

integer isHomeLink(integer link)
{
    return (lower(llGetLinkName(link)) == "home");
}

setHudOpen(integer openFlag)
{
    integer link;
    integer total;
    float alpha;
    integer changed;

    changed = (gOpen != openFlag);
    gOpen = openFlag;
    total = llGetNumberOfPrims();

    for (link = 1; link <= total; ++link)
    {
        alpha = 1.0;
        if (!gOpen && !isHomeLink(link)) alpha = 0.0;
        llSetLinkAlpha(link, alpha, ALL_SIDES);
    }

    if (gOpen)
    {
        sendNeuronCommand("sync hud");
        if (changed) llOwnerSay("Neuro Pad opened.");
    }
    else
    {
        closeDialog();
        sendWalletCommand("close");
        if (changed) llOwnerSay("Neuro Pad closed.");
    }
}

openHud()
{
    setHudOpen(TRUE);
}

closeHud()
{
    setHudOpen(FALSE);
}

openMain()
{
    if (!gOpen) openHud();
    openDialog("main", "Neuro Pad\nChoose a section.", [
        "Profile",
        "Stats",
        "Refresh",
        "Close"
    ]);
}

openSettings()
{
    openDialog("settings", "Settings\nChoose a category.", [
        "Neuron",
        "Profile",
        "Stats",
        "Sync HUD",
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
    openDialog("apps", "Neuro apps\nChoose a section.", [
        "Wallet",
        "Health",
        "Social",
        "Jobs",
        "Back",
        "Close"
    ]);
}

openNotifications()
{
    openDialog("notifications", "Notifications\nQuick alerts.", [
        "Refresh",
        "Stats",
        "Profile",
        "Back",
        "Close"
    ]);
}

openHealth()
{
    sendNeuronCommand("stats");
    openDialog("health", "Health\nNeuron stats requested.", [
        "Stats",
        "Refresh",
        "Back",
        "Close"
    ]);
}

openSocial()
{
    sendNeuronCommand("profile");
    openDialog("social", "Social\nProfile requested.", [
        "Profile",
        "Refresh",
        "Back",
        "Close"
    ]);
}

openJobs()
{
    openDialog("jobs", "Jobs\nWork tracking uses Breadcrumbs.", [
        "Stats",
        "Refresh",
        "Back",
        "Close"
    ]);
}

openDialog(string mode, string text, list buttons)
{
    if (!gOpen) openHud();
    if (gDialogListen) llListenRemove(gDialogListen);
    gDialogChannel = -1 * ((integer)llFrand(1000000.0) + 70000);
    gDialogListen = llListen(gDialogChannel, "", llGetOwner(), "");
    gMode = mode;
    gDialogStarted = llGetUnixTime();
    llSetTimerEvent(1.0);
    llDialog(llGetOwner(), text, buttons, gDialogChannel);
}

handleButtonName(string name)
{
    string n = lower(name);

    if (!gOpen)
    {
        if (n == "home") { openHud(); return; }
        return;
    }

    if (n == "home") { openMain(); return; }
    if (n == "settings") { openSettings(); return; }
    if (n == "notifications") { openNotifications(); return; }
    if (n == "wallet") { sendWalletCommand("wallet"); return; }
    if (n == "health") { openHealth(); return; }
    if (n == "social") { openSocial(); return; }
    if (n == "jobs") { openJobs(); return; }
    if (n == "edit") { sendNeuronCommand("setup"); return; }
    if (n == "refresh") { sendNeuronCommand("sync hud"); llOwnerSay("Neuro: sync requested."); return; }
    if (n == "minimize") { closeHud(); return; }
    if (n == "info panel") { sendNeuronCommand("profile"); return; }
    if (n == "messages") { openNotifications(); return; }
    if (n == "time") { llOwnerSay("Neuro time: " + llGetTimestamp()); return; }
}

handleDialog(string msg)
{
    if (msg == "Close") { closeHud(); return; }
    if (msg == "Back")
    {
        if (gMode == "main") return;
        if (gMode == "neuron" || gMode == "apps" || gMode == "health" || gMode == "social" || gMode == "jobs" || gMode == "notifications") openSettings();
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
    if (msg == "Wallet") { sendWalletCommand("wallet"); return; }
    if (msg == "Health") { openHealth(); return; }
    if (msg == "Social") { openSocial(); return; }
    if (msg == "Jobs") { openJobs(); return; }
    if (msg == "Profile") { sendNeuronCommand("profile"); return; }
    if (msg == "Stats") { sendNeuronCommand("stats"); return; }
    if (msg == "Sync HUD") { sendNeuronCommand("sync hud"); return; }

    if (gMode == "neuron")
    {
        if (msg == "Setup") { sendNeuronCommand("setup"); return; }
        if (msg == "Profile") { sendNeuronCommand("profile"); return; }
        if (msg == "Stats") { sendNeuronCommand("stats"); return; }
        if (msg == "Sync HUD") { sendNeuronCommand("sync hud"); return; }
    }

    llOwnerSay("Neuro: " + msg + " selected.");
}

default
{
    state_entry()
    {
        closeHud();
        llOwnerSay(DISPLAY_TITLE + " online | Build " + (string)BUILD_NUMBER);
    }

    attach(key id)
    {
        if (id) closeHud();
        else
        {
            closeDialog();
            llSetTimerEvent(0.0);
        }
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
