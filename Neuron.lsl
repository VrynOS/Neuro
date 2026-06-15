// =====================================================
// Neuro-Link Neuron
// Build 0.2
//
// Wear this as an avatar attachment.
// Neuron is the player-side brain:
// - First-time profile setup
// - Persistent profile storage
// - Stats decay over real time
// - XP and unlimited levels
// - Breadcrumb use tracking
// - Region/location tracking
// - HUD broadcast snapshots
//
// Owner commands:
//   /77 neuron
//   /77 stats
//   /77 profile
//   /77 setup
//   /77 reset setup
//
// HUD/Server contracts:
//   Breadcrumbs/CDF Tracker channel: -73463301
//   Neuron -> HUD channel:          -73463304
//   Neuron <-> Neuron Server:       -73463305
//   HUD -> Neuron control:          -73463306
// =====================================================

string DISPLAY_TITLE = "Neuro-Link Neuron";
integer BUILD_NUMBER = 2;

integer CDF_TRACKER_CHANNEL = -73463301;
integer NEURON_HUD_CHANNEL = -73463304;
integer NEURON_SERVER_CHANNEL = -73463305;
integer NEURON_CONTROL_CHANNEL = -73463306;
integer COMMAND_CHANNEL = 77;
string CDF_TOKEN = "CDF_WORLD_V1";

// Change this if Camden Falls time is adjusted.
integer CDF_HOUR_SECONDS = 900; // 15 RL minutes = 1 CDF hour

integer HEARTBEAT_SECONDS = 120;
integer TICK_SECONDS = 60;
integer XP_PER_LEVEL = 1000;
integer XP_PER_CDF_HOUR_WORN = 20;
integer XP_PER_BREADCRUMB_USE = 100;
integer XP_WALLET_USE = 100;
integer XP_WORK_CLOCK_IN = 150;
integer XP_WORK_CLOCK_OUT = 150;
integer XP_RENTAL_RENTED = 150;
integer XP_RENT_ON_TIME = 200;
integer XP_RENT_LATE = 50;
integer XP_TRANSACTION = 100;

integer DECAY_HUNGER_SECONDS = 900;
integer DECAY_THIRST_SECONDS = 600;
integer DECAY_SLEEP_SECONDS = 1800;
integer DECAY_HYGIENE_SECONDS = 2700;
integer DECAY_ENERGY_SECONDS = 1200;
integer DECAY_FUN_SECONDS = 1500;

string K_PROFILE = "NEURON_PROFILE";
string K_STATS = "NEURON_STATS";
string K_TIMES = "NEURON_TIMES";
string K_XP = "NEURON_XP";

integer gCmdListen;
integer gBreadcrumbListen;
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

integer gHunger = 100;
integer gThirst = 100;
integer gSleep = 100;
integer gHygiene = 100;
integer gEnergy = 100;
integer gFun = 100;

integer gXP = 0;
integer gLevel = 0;
integer gLastStatTick = 0;
integer gLastHungerTick = 0;
integer gLastThirstTick = 0;
integer gLastSleepTick = 0;
integer gLastHygieneTick = 0;
integer gLastEnergyTick = 0;
integer gLastFunTick = 0;
integer gLastWearXP = 0;
integer gLastHeartbeat = 0;

integer clamp(integer value, integer lo, integer hi)
{
    if (value < lo) return lo;
    if (value > hi) return hi;
    return value;
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
    return llToLower(value);
}

integer levelFromXP(integer xp)
{
    if (xp < 0) xp = 0;
    return xp / XP_PER_LEVEL;
}

integer isVerified()
{
    return (gLevel >= 10);
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
    if (gLocation == "" || gLocation == JSON_INVALID) gLocation = "";
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

loadStats()
{
    string raw = llLinksetDataRead(K_STATS);
    string xpRaw = llLinksetDataRead(K_XP);
    string timeRaw = llLinksetDataRead(K_TIMES);

    if (raw != "")
    {
        gHunger = clamp(toInt(llJsonGetValue(raw, ["hunger"])), 0, 100);
        gThirst = clamp(toInt(llJsonGetValue(raw, ["thirst"])), 0, 100);
        gSleep = clamp(toInt(llJsonGetValue(raw, ["sleep"])), 0, 100);
        gHygiene = clamp(toInt(llJsonGetValue(raw, ["hygiene"])), 0, 100);
        gEnergy = clamp(toInt(llJsonGetValue(raw, ["energy"])), 0, 100);
        gFun = clamp(toInt(llJsonGetValue(raw, ["fun"])), 0, 100);
    }

    if (xpRaw != "")
    {
        gXP = toInt(llJsonGetValue(xpRaw, ["xp"]));
        gLevel = levelFromXP(gXP);
    }

    if (timeRaw != "")
    {
        gLastStatTick = toInt(llJsonGetValue(timeRaw, ["lastStatTick"]));
        gLastHungerTick = toInt(llJsonGetValue(timeRaw, ["lastHungerTick"]));
        gLastThirstTick = toInt(llJsonGetValue(timeRaw, ["lastThirstTick"]));
        gLastSleepTick = toInt(llJsonGetValue(timeRaw, ["lastSleepTick"]));
        gLastHygieneTick = toInt(llJsonGetValue(timeRaw, ["lastHygieneTick"]));
        gLastEnergyTick = toInt(llJsonGetValue(timeRaw, ["lastEnergyTick"]));
        gLastFunTick = toInt(llJsonGetValue(timeRaw, ["lastFunTick"]));
        gLastWearXP = toInt(llJsonGetValue(timeRaw, ["lastWearXP"]));
    }

    if (gLastStatTick <= 0) gLastStatTick = llGetUnixTime();
    if (gLastHungerTick <= 0) gLastHungerTick = gLastStatTick;
    if (gLastThirstTick <= 0) gLastThirstTick = gLastStatTick;
    if (gLastSleepTick <= 0) gLastSleepTick = gLastStatTick;
    if (gLastHygieneTick <= 0) gLastHygieneTick = gLastStatTick;
    if (gLastEnergyTick <= 0) gLastEnergyTick = gLastStatTick;
    if (gLastFunTick <= 0) gLastFunTick = gLastStatTick;
    if (gLastWearXP <= 0) gLastWearXP = llGetUnixTime();
}

saveStats()
{
    llLinksetDataWrite(K_STATS, llList2Json(JSON_OBJECT, [
        "hunger", (string)gHunger,
        "thirst", (string)gThirst,
        "sleep", (string)gSleep,
        "hygiene", (string)gHygiene,
        "energy", (string)gEnergy,
        "fun", (string)gFun,
        "updated", (string)llGetUnixTime()
    ]));

    llLinksetDataWrite(K_XP, llList2Json(JSON_OBJECT, [
        "xp", (string)gXP,
        "level", (string)gLevel,
        "verified", (string)isVerified(),
        "updated", (string)llGetUnixTime()
    ]));

    llLinksetDataWrite(K_TIMES, llList2Json(JSON_OBJECT, [
        "lastStatTick", (string)gLastStatTick,
        "lastHungerTick", (string)gLastHungerTick,
        "lastThirstTick", (string)gLastThirstTick,
        "lastSleepTick", (string)gLastSleepTick,
        "lastHygieneTick", (string)gLastHygieneTick,
        "lastEnergyTick", (string)gLastEnergyTick,
        "lastFunTick", (string)gLastFunTick,
        "lastWearXP", (string)gLastWearXP
    ]));
}

integer decayAmount(integer elapsed, integer stepSeconds)
{
    if (stepSeconds <= 0) return 0;
    return elapsed / stepSeconds;
}

applyTime()
{
    integer now = llGetUnixTime();
    integer wearSteps;
    integer d;

    if (gLastHungerTick <= 0) gLastHungerTick = now;
    if (gLastThirstTick <= 0) gLastThirstTick = now;
    if (gLastSleepTick <= 0) gLastSleepTick = now;
    if (gLastHygieneTick <= 0) gLastHygieneTick = now;
    if (gLastEnergyTick <= 0) gLastEnergyTick = now;
    if (gLastFunTick <= 0) gLastFunTick = now;

    d = decayAmount(now - gLastHungerTick, DECAY_HUNGER_SECONDS);
    if (d > 0) { gHunger = clamp(gHunger - d, 0, 100); gLastHungerTick += d * DECAY_HUNGER_SECONDS; }

    d = decayAmount(now - gLastThirstTick, DECAY_THIRST_SECONDS);
    if (d > 0) { gThirst = clamp(gThirst - d, 0, 100); gLastThirstTick += d * DECAY_THIRST_SECONDS; }

    d = decayAmount(now - gLastSleepTick, DECAY_SLEEP_SECONDS);
    if (d > 0) { gSleep = clamp(gSleep - d, 0, 100); gLastSleepTick += d * DECAY_SLEEP_SECONDS; }

    d = decayAmount(now - gLastHygieneTick, DECAY_HYGIENE_SECONDS);
    if (d > 0) { gHygiene = clamp(gHygiene - d, 0, 100); gLastHygieneTick += d * DECAY_HYGIENE_SECONDS; }

    d = decayAmount(now - gLastEnergyTick, DECAY_ENERGY_SECONDS);
    if (d > 0) { gEnergy = clamp(gEnergy - d, 0, 100); gLastEnergyTick += d * DECAY_ENERGY_SECONDS; }

    d = decayAmount(now - gLastFunTick, DECAY_FUN_SECONDS);
    if (d > 0) { gFun = clamp(gFun - d, 0, 100); gLastFunTick += d * DECAY_FUN_SECONDS; }

    gLastStatTick = now;

    if (gLastWearXP <= 0) gLastWearXP = now;
    wearSteps = (now - gLastWearXP) / CDF_HOUR_SECONDS;
    if (wearSteps > 0)
    {
        addXP(wearSteps * XP_PER_CDF_HOUR_WORN, "wearing Neuron");
        gLastWearXP += wearSteps * CDF_HOUR_SECONDS;
    }

    saveStats();
}

addXP(integer amount, string reason)
{
    integer oldLevel = gLevel;
    if (amount <= 0) return;

    gXP += amount;
    gLevel = levelFromXP(gXP);
    saveStats();

    if (gLevel > oldLevel)
    {
        llOwnerSay("Neuro: Level up. Level " + (string)gLevel + ".");
        saveProfile();
    }

    sendHudSnapshot("xp." + reason);
}

applyStat(string statName, integer amount)
{
    statName = lower(statName);
    if (amount == 0) return;

    if (statName == "hunger") gHunger = clamp(gHunger + amount, 0, 100);
    else if (statName == "thirst") gThirst = clamp(gThirst + amount, 0, 100);
    else if (statName == "sleep") gSleep = clamp(gSleep + amount, 0, 100);
    else if (statName == "rest") gSleep = clamp(gSleep + amount, 0, 100);
    else if (statName == "hygiene") gHygiene = clamp(gHygiene + amount, 0, 100);
    else if (statName == "energy") gEnergy = clamp(gEnergy + amount, 0, 100);
    else if (statName == "fun") gFun = clamp(gFun + amount, 0, 100);
    else if (statName == "comfort") gFun = clamp(gFun + amount, 0, 100);
    else if (statName == "care") gHygiene = clamp(gHygiene + amount, 0, 100);
    else if (statName == "health") gEnergy = clamp(gEnergy + amount, 0, 100);
}

integer xpForPayload(string payload)
{
    string eventName = lower(llJsonGetValue(payload, ["event"]));
    string typeName = lower(llJsonGetValue(payload, ["type"]));
    string detail = lower(llJsonGetValue(payload, ["detail"]));

    if (llSubStringIndex(eventName, "heartbeat") != -1) return 0;
    if (llSubStringIndex(eventName, "register") != -1) return 0;

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
    if (llSubStringIndex(eventName, "gcoin") != -1 || llSubStringIndex(eventName, "transaction") != -1 || llSubStringIndex(eventName, "purchase") != -1) return XP_TRANSACTION;

    return XP_PER_BREADCRUMB_USE;
}

handleBreadcrumb(string payload)
{
    key avatar = (key)llJsonGetValue(payload, ["avatar"]);
    integer gained;

    if (avatar != llGetOwner()) return;

    applyStat("hunger", toInt(llJsonGetValue(payload, ["stat.hunger"])));
    applyStat("thirst", toInt(llJsonGetValue(payload, ["stat.thirst"])));
    applyStat("sleep", toInt(llJsonGetValue(payload, ["stat.sleep"])));
    applyStat("rest", toInt(llJsonGetValue(payload, ["stat.rest"])));
    applyStat("hygiene", toInt(llJsonGetValue(payload, ["stat.hygiene"])));
    applyStat("energy", toInt(llJsonGetValue(payload, ["stat.energy"])));
    applyStat("fun", toInt(llJsonGetValue(payload, ["stat.fun"])));
    applyStat("comfort", toInt(llJsonGetValue(payload, ["stat.comfort"])));
    applyStat("care", toInt(llJsonGetValue(payload, ["stat.care"])));
    applyStat("health", toInt(llJsonGetValue(payload, ["stat.health"])));

    saveProfile();
    saveStats();

    gained = xpForPayload(payload);
    if (gained > 0) addXP(gained, "breadcrumb");

    sendHudSnapshot("breadcrumb");
}

string snapshotJsonActive(string reason, integer active)
{
    return llList2Json(JSON_OBJECT, [
        "token", CDF_TOKEN,
        "source", "neuron.brain",
        "event", "neuron.snapshot",
        "reason", reason,
        "active", (string)active,
        "paused", (string)(!active),
        "avatar", (string)llGetOwner(),
        "displayName", gDisplayName,
        "legacyName", llKey2Name(llGetOwner()),
        "sex", gSex,
        "age", (string)gAge,
        "title", gTitle,
        "location", gLocation,
        "region", llGetRegionName(),
        "level", (string)gLevel,
        "xp", (string)gXP,
        "verified", (string)isVerified(),
        "stat.hunger", (string)gHunger,
        "stat.thirst", (string)gThirst,
        "stat.sleep", (string)gSleep,
        "stat.hygiene", (string)gHygiene,
        "stat.energy", (string)gEnergy,
        "stat.fun", (string)gFun,
        "time", (string)llGetUnixTime()
    ]);
}

string snapshotJson(string reason)
{
    return snapshotJsonActive(reason, TRUE);
}

sendHudSnapshot(string reason)
{
    llRegionSay(NEURON_HUD_CHANNEL, snapshotJson(reason));
}

sendServerSnapshot(string reason, integer active)
{
    llRegionSay(NEURON_SERVER_CHANNEL, snapshotJsonActive(reason, active));
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

restoreFromSnapshot(string state)
{
    if (llJsonGetValue(state, ["token"]) != CDF_TOKEN) return;
    if (llJsonGetValue(state, ["avatar"]) != (string)llGetOwner()) return;

    gDisplayName = llJsonGetValue(state, ["displayName"]);
    gSex = llJsonGetValue(state, ["sex"]);
    gAge = toInt(llJsonGetValue(state, ["age"]));
    gTitle = llJsonGetValue(state, ["title"]);
    gLocation = llJsonGetValue(state, ["location"]);
    gXP = toInt(llJsonGetValue(state, ["xp"]));
    gLevel = levelFromXP(gXP);
    gHunger = clamp(toInt(llJsonGetValue(state, ["stat.hunger"])), 0, 100);
    gThirst = clamp(toInt(llJsonGetValue(state, ["stat.thirst"])), 0, 100);
    gSleep = clamp(toInt(llJsonGetValue(state, ["stat.sleep"])), 0, 100);
    gHygiene = clamp(toInt(llJsonGetValue(state, ["stat.hygiene"])), 0, 100);
    gEnergy = clamp(toInt(llJsonGetValue(state, ["stat.energy"])), 0, 100);
    gFun = clamp(toInt(llJsonGetValue(state, ["stat.fun"])), 0, 100);

    if (gDisplayName == "" || gDisplayName == JSON_INVALID) gDisplayName = llGetDisplayName(llGetOwner());
    if (gTitle == JSON_INVALID) gTitle = "";
    if (gSex == JSON_INVALID) gSex = "";
    if (gLocation == JSON_INVALID) gLocation = "";
    gSetupDone = (gSex != "" && gAge > 0 && gLocation != "" && gTitle != "");

    saveProfile();
    saveStats();
    sendHudSnapshot("server.restore");
    llOwnerSay("Neuro restored from Neuron Server backup.");
}

handleServerMessage(string message)
{
    string prefix = "NEURON_RESTORE|" + (string)llGetOwner() + "|";
    string state;

    if (llGetSubString(message, 0, llStringLength(prefix) - 1) != prefix) return;
    state = llGetSubString(message, llStringLength(prefix), -1);
    if (state == "") return;

    restoreFromSnapshot(state);
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

showStats()
{
    llOwnerSay(
        "Neuro Stats"
        + "\nHunger: " + (string)gHunger
        + "\nThirst: " + (string)gThirst
        + "\nSleep: " + (string)gSleep
        + "\nHygiene: " + (string)gHygiene
        + "\nEnergy: " + (string)gEnergy
        + "\nFun: " + (string)gFun
        + "\nXP: " + (string)gXP
        + "\nLevel: " + (string)gLevel
        + "\nVerified: " + (string)isVerified()
    );
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
        + "\nLevel: " + (string)gLevel
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
    saveStats();
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
    if (cmd == "stats") { applyTime(); showStats(); return; }
    if (cmd == "profile") { showProfile(); return; }
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
        sendHudSnapshot("manual.sync");
        sendServerSnapshot("manual.sync", TRUE);
        llOwnerSay("Neuro HUD sync sent.");
        return;
    }
}

init()
{
    loadProfile();
    loadStats();

    if (gCmdListen) llListenRemove(gCmdListen);
    if (gBreadcrumbListen) llListenRemove(gBreadcrumbListen);
    if (gServerListen) llListenRemove(gServerListen);
    if (gControlListen) llListenRemove(gControlListen);

    gCmdListen = llListen(COMMAND_CHANNEL, "", llGetOwner(), "");
    gBreadcrumbListen = llListen(CDF_TRACKER_CHANNEL, "", NULL_KEY, "");
    gServerListen = llListen(NEURON_SERVER_CHANNEL, "", NULL_KEY, "");
    gControlListen = llListen(NEURON_CONTROL_CHANNEL, "", NULL_KEY, "");

    llSetTimerEvent((float)TICK_SECONDS);
    sendNeuronEvent("neuron.online", "init");
    sendHudSnapshot("init");
    sendServerSnapshot("init", TRUE);
    requestServerRestore();

    if (!gSetupDone)
    {
        llOwnerSay("Neuro first-time setup needed. Type /77 setup.");
        startSetup();
    }
}

default
{
    state_entry()
    {
        init();
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
            applyTime();
            saveProfile();
            saveStats();
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

        if (channel == CDF_TRACKER_CHANNEL)
        {
            if (llJsonGetValue(message, ["token"]) != CDF_TOKEN) return;
            if (llJsonGetValue(message, ["source"]) == "breadcrumb") handleBreadcrumb(message);
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

    timer()
    {
        integer now = llGetUnixTime();
        applyTime();
        if (now - gLastHeartbeat >= HEARTBEAT_SECONDS)
        {
            gLastHeartbeat = now;
            saveProfile();
            sendNeuronEvent("neuron.heartbeat", "alive");
            sendHudSnapshot("heartbeat");
            sendServerSnapshot("heartbeat", TRUE);
        }
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER)
        {
            llResetScript();
        }
        if (change & CHANGED_REGION)
        {
            saveProfile();
            sendHudSnapshot("region.changed");
            sendServerSnapshot("region.changed", TRUE);
        }
    }
}
