// =====================================================
// Neuron Part 2
// Build 0.4
//
// Wear in the Neuron avatar attachment with Neuron Part 1.
// Part 2 owns stats, XP, levels, verification, and Breadcrumbs.
// =====================================================

string DISPLAY_TITLE = "Neuron Part 2";
integer BUILD_NUMBER = 4;

integer CDF_TRACKER_CHANNEL = -73463301;
integer COMMAND_CHANNEL = 77;
string CDF_TOKEN = "CDF_WORLD_V1";

integer LM_STATS_REQ = 7301;
integer LM_STATS_RSP = 7302;
integer LM_STATS_RESTORE = 7303;
integer LM_STATS_COMMAND = 7304;

integer CDF_HOUR_SECONDS = 900;
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

integer DECAY_HUNGER_SECONDS = 900;  // -1 every 15 RL minutes
integer DECAY_THIRST_SECONDS = 480;  // -1 every 8 RL minutes
integer DECAY_SLEEP_SECONDS = 1200;  // -1 every 20 RL minutes
integer DECAY_HYGIENE_SECONDS = 2700; // -1 every 45 RL minutes
integer DECAY_ENERGY_SECONDS = 2700; // -1 every 45 RL minutes
integer DECAY_FUN_SECONDS = 1800;    // -1 every 30 RL minutes

string K_STATS = "NEURON_STATS";
string K_TIMES = "NEURON_TIMES";
string K_XP = "NEURON_XP";

integer gBreadcrumbListen;
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

addXP(integer amount, string reason)
{
    integer oldLevel = gLevel;

    if (amount <= 0) return;
    gXP += amount;
    gLevel = levelFromXP(gXP);
    saveStats();

    if (gLevel > oldLevel) llOwnerSay("Neuro: Level up. Level " + (string)gLevel + ".");
    sendStatsToPart1("xp." + reason);
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

    applyTime();
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

    gained = xpForPayload(payload);
    if (gained > 0) addXP(gained, "breadcrumb");

    saveStats();
    sendStatsToPart1("breadcrumb");
}

string statsJson()
{
    return llList2Json(JSON_OBJECT, [
        "xp", (string)gXP,
        "level", (string)gLevel,
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

sendStatsToPart1(string reason)
{
    llMessageLinked(LINK_SET, LM_STATS_RSP, statsJson(), llGetOwner());
}

restoreStats(string snapshot)
{
    if (llJsonGetValue(snapshot, ["token"]) != CDF_TOKEN) return;
    if (llJsonGetValue(snapshot, ["avatar"]) != (string)llGetOwner()) return;

    gXP = toInt(llJsonGetValue(snapshot, ["xp"]));
    gLevel = levelFromXP(gXP);
    gHunger = clamp(toInt(llJsonGetValue(snapshot, ["stat.hunger"])), 0, 100);
    gThirst = clamp(toInt(llJsonGetValue(snapshot, ["stat.thirst"])), 0, 100);
    gSleep = clamp(toInt(llJsonGetValue(snapshot, ["stat.sleep"])), 0, 100);
    gHygiene = clamp(toInt(llJsonGetValue(snapshot, ["stat.hygiene"])), 0, 100);
    gEnergy = clamp(toInt(llJsonGetValue(snapshot, ["stat.energy"])), 0, 100);
    gFun = clamp(toInt(llJsonGetValue(snapshot, ["stat.fun"])), 0, 100);
    saveStats();
    sendStatsToPart1("server.restore");
}

showStats()
{
    applyTime();
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

init()
{
    loadStats();
    if (gBreadcrumbListen) llListenRemove(gBreadcrumbListen);
    gBreadcrumbListen = llListen(CDF_TRACKER_CHANNEL, "", NULL_KEY, "");
    llSetTimerEvent((float)TICK_SECONDS);
    sendStatsToPart1("init");
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
        if (id) init();
        else
        {
            applyTime();
            saveStats();
            llSetTimerEvent(0.0);
        }
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel == CDF_TRACKER_CHANNEL)
        {
            if (llJsonGetValue(message, ["token"]) != CDF_TOKEN) return;
            if (llJsonGetValue(message, ["source"]) == "breadcrumb") handleBreadcrumb(message);
            return;
        }
    }

    link_message(integer sender, integer num, string str, key id)
    {
        if (num == LM_STATS_REQ)
        {
            applyTime();
            saveStats();
            sendStatsToPart1("request");
            return;
        }

        if (num == LM_STATS_RESTORE)
        {
            restoreStats(str);
            return;
        }

        if (num == LM_STATS_COMMAND)
        {
            if (str == "stats") showStats();
            return;
        }
    }

    timer()
    {
        applyTime();
        saveStats();
        sendStatsToPart1("tick");
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
