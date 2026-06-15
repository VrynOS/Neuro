// =====================================================
// Neuro HUD Stats Display v0.2
//
// Drop into the Neuro Pad HUD linkset.
// Listens for Neuron snapshots and updates the stat bars.
//
// Expected linked prim names:
// Hunger Fill, Thirst Fill, Sleep Fill, Hygiene Fill,
// Energy Fill, Fun Fill, XP Fill
// =====================================================

string DISPLAY_TITLE = "Neuro HUD Stats Display";
integer BUILD_NUMBER = 2;

integer NEURON_HUD_CHANNEL = -73463304;
integer LM_HUD_OPEN_STATE = 7402;
string CDF_TOKEN = "CDF_WORLD_V1";

integer XP_PER_LEVEL = 1000;
integer MIN_PERCENT = 3;

integer gListen;
integer gHudOpen = FALSE;
string gLastSnapshot = "";

list gNames = ["Hunger Fill", "Thirst Fill", "Sleep Fill", "Hygiene Fill", "Energy Fill", "Fun Fill", "XP Fill"];
list gJsonKeys = ["stat.hunger", "stat.thirst", "stat.sleep", "stat.hygiene", "stat.energy", "stat.fun", "xp"];
list gLinks = [];
list gBaseSizes = [];
list gBasePositions = [];

string cleanName(string name)
{
    return llStringTrim(name, STRING_TRIM);
}

integer sameName(string a, string b)
{
    return (llToLower(cleanName(a)) == llToLower(cleanName(b)));
}

integer findLink(string wanted)
{
    integer total = llGetNumberOfPrims();
    integer link;

    for (link = 1; link <= total; ++link)
    {
        if (sameName(llGetLinkName(link), wanted)) return link;
    }
    return 0;
}

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

integer xpPercent(integer xp)
{
    integer progress;

    if (xp < 0) xp = 0;
    progress = xp % XP_PER_LEVEL;
    return clamp((progress * 100) / XP_PER_LEVEL, MIN_PERCENT, 100);
}

integer statPercent(string snapshot, string keyName)
{
    integer value = toInt(llJsonGetValue(snapshot, [keyName]));

    if (keyName == "xp") return xpPercent(value);
    return clamp(value, MIN_PERCENT, 100);
}

scanLinks()
{
    integer i;
    integer link;
    vector size;
    vector pos;

    gLinks = [];
    gBaseSizes = [];
    gBasePositions = [];

    for (i = 0; i < llGetListLength(gNames); ++i)
    {
        link = findLink(llList2String(gNames, i));
        gLinks += [link];

        if (link > 0)
        {
            size = llList2Vector(llGetLinkPrimitiveParams(link, [PRIM_SIZE]), 0);
            pos = llList2Vector(llGetLinkPrimitiveParams(link, [PRIM_POS_LOCAL]), 0);
        }
        else
        {
            size = ZERO_VECTOR;
            pos = ZERO_VECTOR;
        }

        gBaseSizes += [size];
        gBasePositions += [pos];
    }
}

setBar(integer index, integer percent)
{
    integer link = llList2Integer(gLinks, index);
    vector baseSize;
    vector basePos;
    vector newSize;
    vector newPos;
    float pct;

    if (link <= 0) return;

    percent = clamp(percent, MIN_PERCENT, 100);
    pct = (float)percent / 100.0;

    baseSize = llList2Vector(gBaseSizes, index);
    basePos = llList2Vector(gBasePositions, index);
    if (baseSize == ZERO_VECTOR) return;

    newSize = baseSize;
    newSize.x = baseSize.x * pct;
    if (newSize.x < 0.01) newSize.x = 0.01;

    newPos = basePos;
    newPos.x = basePos.x + ((baseSize.x - newSize.x) * 0.5);

    llSetLinkPrimitiveParamsFast(link, [
        PRIM_SIZE, newSize,
        PRIM_POS_LOCAL, newPos
    ]);
}

applySnapshot(string snapshot)
{
    integer i;
    integer percent;
    string keyName;

    gLastSnapshot = snapshot;

    for (i = 0; i < llGetListLength(gNames); ++i)
    {
        keyName = llList2String(gJsonKeys, i);
        percent = statPercent(snapshot, keyName);
        setBar(i, percent);
    }

}

integer validSnapshot(string snapshot)
{
    if (llJsonGetValue(snapshot, ["token"]) != CDF_TOKEN) return FALSE;
    if (llJsonGetValue(snapshot, ["source"]) != "neuron.brain") return FALSE;
    if (llJsonGetValue(snapshot, ["avatar"]) != (string)llGetOwner()) return FALSE;
    return TRUE;
}

default
{
    state_entry()
    {
        scanLinks();
        gListen = llListen(NEURON_HUD_CHANNEL, "", NULL_KEY, "");
        llOwnerSay(DISPLAY_TITLE + " online | Build " + (string)BUILD_NUMBER);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != NEURON_HUD_CHANNEL) return;
        if (!validSnapshot(message)) return;
        applySnapshot(message);
    }

    link_message(integer sender, integer num, string str, key id)
    {
        if (num == LM_HUD_OPEN_STATE)
        {
            gHudOpen = (str == "OPEN");
        }
    }

    changed(integer change)
    {
        if (change & CHANGED_LINK) scanLinks();
        if (change & CHANGED_OWNER) llResetScript();
    }
}
