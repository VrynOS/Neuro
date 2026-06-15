// =====================================================
// Neuron Part 1
// Build 0.3
//
// Wear in the Neuron avatar attachment with Neuron Part 2.
// Part 1 owns profile setup, HUD sync, and Neuron Server backup.
//
// Commands:
//   /77 neuron
//   /77 setup
//   /77 profile
//   /77 stats
//   /77 sync hud
//   /77 reset setup
// =====================================================

string DISPLAY_TITLE = "Neuron Part 1";
integer BUILD_NUMBER = 3;

integer CDF_TRACKER_CHANNEL = -73463301;
integer NEURON_HUD_CHANNEL = -73463304;
integer NEURON_SERVER_CHANNEL = -73463305;
integer NEURON_CONTROL_CHANNEL = -73463306;
integer COMMAND_CHANNEL = 77;
string CDF_TOKEN = "CDF_WORLD_V1";

integer LM_STATS_REQ = 7301;
integer LM_STATS_RSP = 7302;
integer LM_STATS_RESTORE = 7303;
integer LM_STATS_COMMAND = 7304;

integer HEARTBEAT_SECONDS = 120;

string K_PROFILE = "NEURON_PROFILE";

integer gCmdListen;
integer gServerListen;
integer gControlListen;
integer gSetupListen;
integer gSetupChannel;
string gSetupStep = "";

string gDisplayName = "";
string gSex = "";
integer gAge = 0;
string gTitle = "";
string gLocation = "";
integer gSetupDone = FALSE;
string gStatsJson = "";
integer gLastHeartbeat = 0;
integer gLastSetupPrompt = 0;

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
    return llToLower(value);
}

string safeStat(string keyName, string fallback)
{
    string value;

    if (gStatsJson == "") return fallback;
    value = llJsonGetValue(gStatsJson, [keyName]);
    if (value == "" || value == JSON_INVALID) return fallback;
    return value;
}

integer isVerified()
{
    return (toInt(safeStat("level", "0")) >= 10);
}

loadProfile()
{
    string raw = llLinksetDataRead(K_PROFILE);

    if (raw == "")
    {
        gDisplayName = llGetDisplayName(llGetOwner());
        if (gDisplayName == "" || gDisplayName == "Resident") gDisplayName = llKey2Name(llGetOwner());
        gSex = "";
        gAge = 0;
        gTitle = "";
        gLocation = "";
        gSetupDone = FALSE;
        return;
    }

    gDisplayName = llJsonGetValue(raw, ["displayName"]);
    gSex = llJsonGetValue(raw, ["sex"]);
    gAge = toInt(llJsonGetValue(raw, ["age"]));
    gTitle = llJsonGetValue(raw, ["title"]);
    gLocation = llJsonGetValue(raw, ["location"]);
    gSetupDone = (toInt(llJsonGetValue(raw, ["setupDone"])) == TRUE);

    if (gDisplayName == "" || gDisplayName == JSON_INVALID) gDisplayName = llGetDisplayName(llGetOwner());
    if (gSex == JSON_INVALID) gSex = "";
    if (gTitle == JSON_INVALID) gTitle = "";
    if (gLocation == JSON_INVALID) gLocation = "";
}

saveProfile()
{
    string raw = llList2Json(JSON_OBJECT, [
        "avatar", (string)llGetOwner(),
        "displayName", gDisplayName,
        "legacyName", llKey2Name(llGetOwner()),
        "sex", gSex,
        "age", (string)gAge,
        "title", gTitle,
        "location", gLocation,
        "setupDone", (string)gSetupDone,
        "verified", (string)isVerified(),
        "updated", (string)llGetUnixTime()
    ]);

    llLinksetDataWrite(K_PROFILE, raw);
}

string snapshotJsonActive(string reason, integer active)
{
    return llList2Json(JSON_OBJECT, [
        "token", CDF_TOKEN,
        "source", "neuron.brain",
        "event", "neuron.snapshot",
        "reason", reason,
        "active", (string)active,
        "paused", (string)(1 - active),
        "avatar", (string)llGetOwner(),
        "displayName", gDisplayName,
        "legacyName", llKey2Name(llGetOwner()),
        "sex", gSex,
        "age", (string)gAge,
        "title", gTitle,
        "location", gLocation,
        "region", llGetRegionName(),
        "level", safeStat("level", "0"),
        "xp", safeStat("xp", "0"),
        "verified", safeStat("verified", "0"),
        "stat.hunger", safeStat("stat.hunger", "100"),
        "stat.thirst", safeStat("stat.thirst", "100"),
        "stat.sleep", safeStat("stat.sleep", "100"),
        "stat.hygiene", safeStat("stat.hygiene", "100"),
        "stat.energy", safeStat("stat.energy", "100"),
        "stat.fun", safeStat("stat.fun", "100"),
        "time", (string)llGetUnixTime()
    ]);
}

sendHudSnapshot(string reason)
{
    llRegionSay(NEURON_HUD_CHANNEL, snapshotJsonActive(reason, TRUE));
}

sendServerSnapshot(string reason, integer active)
{
    llRegionSay(NEURON_SERVER_CHANNEL, snapshotJsonActive(reason, active));
}

requestStats()
{
    llMessageLinked(LINK_SET, LM_STATS_REQ, "GET", llGetOwner());
}

requestServerRestore()
{
    string msg = llList2Json(JSON_OBJECT, [
        "token", CDF_TOKEN,
        "source", "neuron.brain",
        "event", "neuron.restore.request",
        "avatar", (string)llGetOwner(),
        "attachment", (string)llGetKey(),
        "time", (string)llGetUnixTime()
    ]);

    llRegionSay(NEURON_SERVER_CHANNEL, msg);
}

restoreFromSnapshot(string snapshot)
{
    if (llJsonGetValue(snapshot, ["token"]) != CDF_TOKEN) return;
    if (llJsonGetValue(snapshot, ["avatar"]) != (string)llGetOwner()) return;

    gDisplayName = llJsonGetValue(snapshot, ["displayName"]);
    gSex = llJsonGetValue(snapshot, ["sex"]);
    gAge = toInt(llJsonGetValue(snapshot, ["age"]));
    gTitle = llJsonGetValue(snapshot, ["title"]);
    gLocation = llJsonGetValue(snapshot, ["location"]);

    if (gDisplayName == "" || gDisplayName == JSON_INVALID) gDisplayName = llGetDisplayName(llGetOwner());
    if (gSex == JSON_INVALID) gSex = "";
    if (gTitle == JSON_INVALID) gTitle = "";
    if (gLocation == JSON_INVALID) gLocation = "";
    gSetupDone = (gSex != "" && gAge > 0 && gLocation != "" && gTitle != "");

    saveProfile();
    llMessageLinked(LINK_SET, LM_STATS_RESTORE, snapshot, llGetOwner());
    sendHudSnapshot("server.restore");
    llOwnerSay("Neuro restored from Neuron Server backup.");
}

handleServerMessage(string message)
{
    string prefix = "NEURON_RESTORE|" + (string)llGetOwner() + "|";
    string snapshot;

    if (llGetSubString(message, 0, llStringLength(prefix) - 1) != prefix) return;
    snapshot = llGetSubString(message, llStringLength(prefix), -1);
    if (snapshot == "") return;

    restoreFromSnapshot(snapshot);
}

sendNeuronEvent(string eventName, string detail)
{
    string payload = llList2Json(JSON_OBJECT, [
        "token", CDF_TOKEN,
        "source", "neurons",
        "event", eventName,
        "avatar", (string)llGetOwner(),
        "displayName", llGetDisplayName(llGetOwner()),
        "legacyName", llKey2Name(llGetOwner()),
        "attachment", (string)llGetKey(),
        "detail", detail,
        "region", llGetRegionName(),
        "time", (string)llGetUnixTime()
    ]);

    llRegionSay(CDF_TRACKER_CHANNEL, payload);
}

showProfile()
{
    llOwnerSay(
        "Neuro Profile"
        + "\nName: " + gDisplayName
        + "\nSex: " + gSex
        + "\nAge: " + (string)gAge
        + "\nTitle: " + gTitle
        + "\nLocation: " + gLocation
        + "\nLevel: " + safeStat("level", "0")
        + "\nVerified: " + safeStat("verified", "0")
    );
}

openHome()
{
    llDialog(llGetOwner(), "Neuro-Link Neuron\nChoose an action.", [
        "Stats",
        "Profile",
        "Setup",
        "Sync HUD",
        "Close"
    ], COMMAND_CHANNEL);
}

startSetup()
{
    if (gSetupListen) llListenRemove(gSetupListen);
    gSetupChannel = -1 * ((integer)llFrand(1000000.0) + 60000);
    gSetupListen = llListen(gSetupChannel, "", llGetOwner(), "");
    gSetupStep = "sex";

    llDialog(llGetOwner(), "Neuro first-time setup\nChoose sex.", [
        "Male",
        "Female",
        "Nonbinary",
        "Other"
    ], gSetupChannel);
}

continueSetup(string answer)
{
    answer = cleanText(answer);

    if (gSetupStep == "sex")
    {
        gSex = answer;
        gSetupStep = "age";
        llTextBox(llGetOwner(), "Enter age as a number.", gSetupChannel);
        return;
    }

    if (gSetupStep == "age")
    {
        gAge = (integer)answer;
        if (gAge < 0) gAge = 0;
        gSetupStep = "location";
        llDialog(llGetOwner(), "Choose Camden Falls location.", [
            "Chi-Core",
            "Eden Palms"
        ], gSetupChannel);
        return;
    }

    if (gSetupStep == "location")
    {
        if (answer == "Chi-Core" || answer == "Eden Palms") gLocation = answer;
        else gLocation = "Eden Palms";
        gSetupStep = "title";
        llTextBox(llGetOwner(), "Enter title. Example: Ghost", gSetupChannel);
        return;
    }

    if (gSetupStep == "title")
    {
        gTitle = answer;
        if (gTitle == "") gTitle = "Resident";
        gDisplayName = llGetDisplayName(llGetOwner());
        if (gDisplayName == "" || gDisplayName == "Resident") gDisplayName = llKey2Name(llGetOwner());
        gSetupDone = TRUE;
        saveProfile();
        requestStats();
        sendHudSnapshot("setup.complete");
        sendServerSnapshot("setup.complete", TRUE);
        llOwnerSay("Neuro setup complete. Welcome, " + gDisplayName + ".");

        if (gSetupListen) llListenRemove(gSetupListen);
        gSetupListen = 0;
        gSetupStep = "";
    }
}

handleCommand(string msg)
{
    string cmd = lower(cleanText(msg));

    if (cmd == "neuron") { openHome(); return; }
    if (cmd == "stats") { llMessageLinked(LINK_SET, LM_STATS_COMMAND, "stats", llGetOwner()); return; }
    if (cmd == "profile") { requestStats(); showProfile(); return; }
    if (cmd == "setup") { startSetup(); return; }
    if (cmd == "reset setup")
    {
        llLinksetDataDelete(K_PROFILE);
        loadProfile();
        startSetup();
        return;
    }
    if (cmd == "sync hud")
    {
        requestStats();
        sendHudSnapshot("manual.sync");
        sendServerSnapshot("manual.sync", TRUE);
        llOwnerSay("Neuro HUD sync sent.");
        return;
    }
}

init()
{
    loadProfile();

    if (gCmdListen) llListenRemove(gCmdListen);
    if (gServerListen) llListenRemove(gServerListen);
    if (gControlListen) llListenRemove(gControlListen);

    gCmdListen = llListen(COMMAND_CHANNEL, "", llGetOwner(), "");
    gServerListen = llListen(NEURON_SERVER_CHANNEL, "", NULL_KEY, "");
    gControlListen = llListen(NEURON_CONTROL_CHANNEL, "", NULL_KEY, "");

    llSetTimerEvent((float)HEARTBEAT_SECONDS);
    requestStats();
    sendNeuronEvent("neuron.online", "part1");
    sendHudSnapshot("init");
    sendServerSnapshot("init", TRUE);
    requestServerRestore();

    if (!gSetupDone && llGetUnixTime() - gLastSetupPrompt > 30)
    {
        gLastSetupPrompt = llGetUnixTime();
        llOwnerSay("Neuro first-time setup needed. Type /77 setup.");
        startSetup();
    }
}

default
{
    state_entry()
    {
        init();
        llOwnerSay(DISPLAY_TITLE + " online | Build " + (string)BUILD_NUMBER);
    }

    attach(key id)
    {
        if (id)
        {
            init();
            sendNeuronEvent("neuron.online", "attached");
        }
        else
        {
            requestStats();
            saveProfile();
            sendServerSnapshot("detached", FALSE);
            sendNeuronEvent("neuron.offline", "detached");
            llSetTimerEvent(0.0);
        }
    }

    listen(integer channel, string name, key id, string message)
    {
        list p;

        if (channel == COMMAND_CHANNEL)
        {
            handleCommand(message);
            return;
        }

        if (channel == gSetupChannel)
        {
            continueSetup(message);
            return;
        }

        if (channel == NEURON_SERVER_CHANNEL)
        {
            handleServerMessage(message);
            return;
        }

        if (channel == NEURON_CONTROL_CHANNEL)
        {
            p = llParseStringKeepNulls(message, ["|"], []);
            if (llGetListLength(p) < 3) return;
            if (llList2String(p, 0) != "NEURON_CMD") return;
            if ((key)llList2String(p, 1) != llGetOwner()) return;
            if (llGetOwnerKey(id) != llGetOwner()) return;
            handleCommand(llList2String(p, 2));
            return;
        }
    }

    link_message(integer sender, integer num, string str, key id)
    {
        if (num == LM_STATS_RSP)
        {
            gStatsJson = str;
            sendHudSnapshot("stats.update");
            sendServerSnapshot("stats.update", TRUE);
        }
    }

    timer()
    {
        requestStats();
        saveProfile();
        sendNeuronEvent("neuron.heartbeat", "alive");
        sendHudSnapshot("heartbeat");
        sendServerSnapshot("heartbeat", TRUE);
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
        if (change & CHANGED_REGION)
        {
            requestStats();
            saveProfile();
            sendHudSnapshot("region.changed");
            sendServerSnapshot("region.changed", TRUE);
        }
    }
}
