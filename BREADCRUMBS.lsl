// =====================================================
// BREADCRUMBS v1
//
// One setup script for Camden Falls Neuro stat objects.
// Drop into an object, choose stats, choose value, finalize.
//
// V1 behavior:
// - Auto mode is default.
// - Silent is default.
// - Non-fun stats auto-detect avatars within 2m.
// - Fun auto-detects avatars within 20m.
// - Manual mode uses touch.
// - Gives 20 XP per use event.
// - Each avatar can receive up to MAX_TOTAL per object session.
// =====================================================

string DISPLAY_TITLE = "BREADCRUMBS";
integer BUILD_NUMBER = 1;

integer CDF_TRACKER_CHANNEL = -73463301;
string CDF_TOKEN = "CDF_WORLD_V1";

integer SETUP_CHANNEL;
integer setupListen;
integer finalized = FALSE;

integer useHunger = FALSE;
integer useThirst = FALSE;
integer useSleep = FALSE;
integer useHygiene = FALSE;
integer useEnergy = FALSE;
integer useFun = FALSE;

integer tickValue = 2;
integer autoMode = TRUE;
integer silentMode = TRUE;
integer MAX_TOTAL = 50;
integer XP_VALUE = 20;
float CLOSE_RANGE = 2.0;
float FUN_RANGE = 20.0;
float TICK_SECONDS = 30.0;

list avatarKeys = [];
list avatarTotals = [];

string K_LOCK = "BC_LOCK";

string onOff(integer value)
{
    if (value) return "ON";
    return "OFF";
}

string safeLabel()
{
    return llGetObjectName();
}

integer hasAnyStat()
{
    return (useHunger || useThirst || useSleep || useHygiene || useEnergy || useFun);
}

integer avatarIndex(key avatar)
{
    return llListFindList(avatarKeys, [(string)avatar]);
}

integer avatarTotal(key avatar)
{
    integer index = avatarIndex(avatar);
    if (index == -1) return 0;
    return llList2Integer(avatarTotals, index);
}

setAvatarTotal(key avatar, integer total)
{
    integer index = avatarIndex(avatar);

    if (index == -1)
    {
        avatarKeys += [(string)avatar];
        avatarTotals += [total];
        return;
    }

    avatarTotals = llListReplaceList(avatarTotals, [total], index, index);
}

integer remainingFor(key avatar)
{
    integer remaining = MAX_TOTAL - avatarTotal(avatar);
    if (remaining < 0) remaining = 0;
    return remaining;
}

integer applyAmountFor(key avatar)
{
    integer remaining = remainingFor(avatar);
    integer amount = tickValue;

    if (remaining <= 0) return 0;
    if (amount > remaining) amount = remaining;
    return amount;
}

string configSummary()
{
    string stats = "";

    if (useHunger) stats += " Hunger";
    if (useThirst) stats += " Thirst";
    if (useSleep) stats += " Sleep";
    if (useHygiene) stats += " Hygiene";
    if (useEnergy) stats += " Energy";
    if (useFun) stats += " Fun";
    if (stats == "") stats = " none";

    return "Stats:" + stats
        + "\nValue: " + (string)tickValue
        + "\nMax: " + (string)MAX_TOTAL
        + "\nMode: " + llList2String(["Manual", "Auto"], autoMode)
        + "\nSilent: " + onOff(silentMode);
}

openSetup()
{
    if (finalized) return;

    if (setupListen) llListenRemove(setupListen);
    SETUP_CHANNEL = -1 * ((integer)llFrand(1000000.0) + 88000);
    setupListen = llListen(SETUP_CHANNEL, "", llGetOwner(), "");

    llDialog(llGetOwner(),
        DISPLAY_TITLE + " setup\n" + configSummary(),
        [
            "Hunger",
            "Thirst",
            "Sleep",
            "Hygiene",
            "Energy",
            "Fun",
            "Value",
            "Mode",
            "Silent",
            "Finalize"
        ],
        SETUP_CHANNEL
    );
}

openValueMenu()
{
    llDialog(llGetOwner(), DISPLAY_TITLE + " value\nChoose gain per 30 seconds.", [
        "Value 2",
        "Value 4",
        "Value 6",
        "Back"
    ], SETUP_CHANNEL);
}

sendBreadcrumb(key avatar, integer amount, string detail)
{
    vector pos = llGetPos();
    string payload;

    if (avatar == NULL_KEY) return;
    if (amount <= 0) return;

    payload = llList2Json(JSON_OBJECT, [
        "token", CDF_TOKEN,
        "source", "breadcrumb",
        "event", "breadcrumb.used",
        "type", "neuro",
        "label", safeLabel(),
        "objectKey", (string)llGetKey(),
        "owner", (string)llGetOwner(),
        "avatar", (string)avatar,
        "detail", detail,
        "stat.hunger", (string)(useHunger * amount),
        "stat.thirst", (string)(useThirst * amount),
        "stat.sleep", (string)(useSleep * amount),
        "stat.hygiene", (string)(useHygiene * amount),
        "stat.energy", (string)(useEnergy * amount),
        "stat.fun", (string)(useFun * amount),
        "xp", (string)XP_VALUE,
        "region", llGetRegionName(),
        "pos", (string)((integer)pos.x) + "," + (string)((integer)pos.y) + "," + (string)((integer)pos.z),
        "time", (string)llGetUnixTime()
    ]);

    llRegionSay(CDF_TRACKER_CHANNEL, payload);
}

useOnAvatar(key avatar, string detail)
{
    integer amount = applyAmountFor(avatar);
    integer total;

    if (amount <= 0) return;

    total = avatarTotal(avatar) + amount;
    setAvatarTotal(avatar, total);
    sendBreadcrumb(avatar, amount, detail);

    if (!silentMode)
    {
        llRegionSayTo(avatar, 0, safeLabel() + " +" + (string)amount + " Neuro stats.");
    }
}

float sensorRange()
{
    if (useFun) return FUN_RANGE;
    return CLOSE_RANGE;
}

finalizeSetup()
{
    if (!hasAnyStat())
    {
        llOwnerSay(DISPLAY_TITLE + ": choose at least one stat before Finalize.");
        openSetup();
        return;
    }

    finalized = TRUE;
    llLinksetDataWrite(K_LOCK, llList2Json(JSON_OBJECT, [
        "locked", "1",
        "hunger", (string)useHunger,
        "thirst", (string)useThirst,
        "sleep", (string)useSleep,
        "hygiene", (string)useHygiene,
        "energy", (string)useEnergy,
        "fun", (string)useFun,
        "value", (string)tickValue,
        "auto", (string)autoMode,
        "silent", (string)silentMode
    ]));

    if (setupListen) llListenRemove(setupListen);
    setupListen = 0;

    if (autoMode) llSensorRepeat("", NULL_KEY, AGENT, sensorRange(), PI, TICK_SECONDS);
    else llSensorRemove();

    llOwnerSay(DISPLAY_TITLE + " finalized.\n" + configSummary());
}

loadLock()
{
    string raw = llLinksetDataRead(K_LOCK);

    if (raw == "") return;
    if (llJsonGetValue(raw, ["locked"]) != "1") return;

    finalized = TRUE;
    useHunger = (integer)llJsonGetValue(raw, ["hunger"]);
    useThirst = (integer)llJsonGetValue(raw, ["thirst"]);
    useSleep = (integer)llJsonGetValue(raw, ["sleep"]);
    useHygiene = (integer)llJsonGetValue(raw, ["hygiene"]);
    useEnergy = (integer)llJsonGetValue(raw, ["energy"]);
    useFun = (integer)llJsonGetValue(raw, ["fun"]);
    tickValue = (integer)llJsonGetValue(raw, ["value"]);
    autoMode = (integer)llJsonGetValue(raw, ["auto"]);
    silentMode = (integer)llJsonGetValue(raw, ["silent"]);

    if (tickValue <= 0) tickValue = 2;
    if (autoMode) llSensorRepeat("", NULL_KEY, AGENT, sensorRange(), PI, TICK_SECONDS);
}

handleSetup(string msg)
{
    if (msg == "Hunger") useHunger = !useHunger;
    else if (msg == "Thirst") useThirst = !useThirst;
    else if (msg == "Sleep") useSleep = !useSleep;
    else if (msg == "Hygiene") useHygiene = !useHygiene;
    else if (msg == "Energy") useEnergy = !useEnergy;
    else if (msg == "Fun") useFun = !useFun;
    else if (msg == "Value") { openValueMenu(); return; }
    else if (msg == "Mode") autoMode = !autoMode;
    else if (msg == "Silent") silentMode = !silentMode;
    else if (msg == "Value 2") tickValue = 2;
    else if (msg == "Value 4") tickValue = 4;
    else if (msg == "Value 6") tickValue = 6;
    else if (msg == "Finalize") { finalizeSetup(); return; }

    openSetup();
}

default
{
    state_entry()
    {
        loadLock();

        if (!finalized)
        {
            llOwnerSay(DISPLAY_TITLE + " setup needed.");
            openSetup();
        }
        else
        {
            llOwnerSay(DISPLAY_TITLE + " active.");
        }
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    touch_start(integer total_number)
    {
        integer i;

        if (!finalized)
        {
            if (llDetectedKey(0) == llGetOwner()) openSetup();
            return;
        }

        if (autoMode) return;

        for (i = 0; i < total_number; ++i)
        {
            useOnAvatar(llDetectedKey(i), "manual use");
        }
    }

    sensor(integer count)
    {
        integer i;

        if (!finalized) return;
        if (!autoMode) return;

        for (i = 0; i < count; ++i)
        {
            useOnAvatar(llDetectedKey(i), "auto use");
        }
    }

    listen(integer channel, string name, key id, string msg)
    {
        if (channel == SETUP_CHANNEL && id == llGetOwner()) handleSetup(msg);
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
