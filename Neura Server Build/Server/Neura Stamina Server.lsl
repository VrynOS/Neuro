// =====================================================
// Neura Stamina Server
// Build 1001
//
// Owns hidden Stamina for Profile and Health.
// Neura brain sends passive movement summaries.
// Gym/furniture Neurons can report stamina XP/current changes.
// Low stamina reduces Energy gains in Neura Stats Server.
// Low Energy/Sleep/Hunger/Thirst increases movement drain here.
// =====================================================

integer CDF_TRACKER_CHANNEL = -73463301;
integer NEURON_SERVER_CHANNEL = -73463305;
string CDF_TOKEN = "CDF_WORLD_V1";
string DISPLAY_TITLE = "Neura Stamina Server";
integer BUILD_NUMBER = 1001;

float MAX_STAMINA = 100.0;
integer MAX_LEVEL = 10;
integer DEBUG = FALSE;

string staminaKey(key av) { return "NEURON_STAMINA:" + (string)av; }
string statKey(key av, string field) { return "NS:" + (string)av + ":" + field; }

integer toInt(string v) { if (v == "" || v == JSON_INVALID) return 0; return (integer)v; }
float toFloat(string v) { if (v == "" || v == JSON_INVALID) return 0.0; return (float)v; }
string lower(string v) { return llToLower(llStringTrim(v, STRING_TRIM)); }
string val(string raw, string k, string f) { string v = llJsonGetValue(raw, [k]); if (v == "" || v == JSON_INVALID) return f; return v; }

float statValue(key av, string field, float fallback)
{
    string value = llLinksetDataRead(statKey(av, field));
    if (value == "") return fallback;
    return (float)value;
}

float clampFloat(float v, float lo, float hi)
{
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}

integer xpForLevel(integer level)
{
    if (level <= 1) return 0;
    if (level == 2) return 100;
    if (level == 3) return 250;
    if (level == 4) return 450;
    if (level == 5) return 700;
    if (level == 6) return 1000;
    if (level == 7) return 1400;
    if (level == 8) return 1900;
    if (level == 9) return 2500;
    return 3200;
}

integer levelFromXP(integer xp)
{
    integer level = 1;
    while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) ++level;
    return level;
}

string rankForLevel(integer level)
{
    if (level <= 1) return "Untrained";
    if (level == 2) return "Lightly Active";
    if (level == 3) return "Steady";
    if (level == 4) return "Conditioned";
    if (level == 5) return "Strong";
    if (level == 6) return "Athletic";
    if (level == 7) return "Enduring";
    if (level == 8) return "Powerful";
    if (level == 9) return "Elite";
    return "Peak";
}

integer decayResist(integer level)
{
    if (level <= 1) return 0;
    if (level == 2) return 3;
    if (level == 3) return 6;
    if (level == 4) return 10;
    if (level == 5) return 15;
    if (level == 6) return 20;
    if (level == 7) return 25;
    if (level == 8) return 30;
    if (level == 9) return 35;
    return 40;
}

float movementDrainMultiplier(key av)
{
    float multiplier = 1.0;
    float energy = statValue(av, "energy", 100.0);
    float sleep = statValue(av, "sleep", 100.0);
    float hunger = statValue(av, "hunger", 100.0);
    float thirst = statValue(av, "thirst", 100.0);

    if (energy < 25.0) multiplier += 0.30;
    else if (energy < 50.0) multiplier += 0.15;

    if (sleep < 25.0) multiplier += 0.25;
    else if (sleep < 50.0) multiplier += 0.10;

    if (hunger < 25.0) multiplier += 0.15;
    if (thirst < 25.0) multiplier += 0.15;

    return multiplier;
}

string getStamina(key av)
{
    string raw = llLinksetDataRead(staminaKey(av));
    integer now = llGetUnixTime();
    if (raw == "")
    {
        raw = llList2Json(JSON_OBJECT, [
            "current", "100",
            "max", "100",
            "xp", "0",
            "level", "1",
            "rank", "Untrained",
            "decayResist", "0",
            "lastChange", "0",
            "lastXp", "0",
            "lastReason", "Initial",
            "lastActivity", "None",
            "updated", (string)now
        ]);
        llLinksetDataWrite(staminaKey(av), raw);
    }
    return raw;
}

sendLine(key av, string body)
{
    if (av != NULL_KEY) llRegionSayTo(av, 0, body);
}

saveStamina(key av, string raw)
{
    integer xp = toInt(val(raw, "xp", "0"));
    integer oldLevel = toInt(val(raw, "level", "1"));
    integer level = levelFromXP(xp);
    string rank = rankForLevel(level);
    raw = llJsonSetValue(raw, ["level"], (string)level);
    raw = llJsonSetValue(raw, ["rank"], rank);
    raw = llJsonSetValue(raw, ["decayResist"], (string)decayResist(level));
    raw = llJsonSetValue(raw, ["updated"], (string)llGetUnixTime());
    llLinksetDataWrite(staminaKey(av), raw);

    if (level >= 5 && level > oldLevel)
    {
        sendLine(av, "Neura: Stamina Level " + (string)level + " reached. Strength: " + rank + ".");
    }
}

applyStamina(key av, float currentDelta, integer xpDelta, string reason, string activity)
{
    string raw;
    float cur;
    float max;
    integer xp;
    integer resist;
    float adjustedDelta = currentDelta;

    if (av == NULL_KEY) return;
    raw = getStamina(av);
    cur = toFloat(val(raw, "current", "100"));
    max = toFloat(val(raw, "max", "100"));
    if (max <= 0.0) max = MAX_STAMINA;
    resist = toInt(val(raw, "decayResist", "0"));

    if (adjustedDelta < 0.0 && resist > 0)
    {
        adjustedDelta = adjustedDelta * (100.0 - (float)resist) / 100.0;
    }

    xp = toInt(val(raw, "xp", "0")) + xpDelta;
    if (xp < 0) xp = 0;

    raw = llJsonSetValue(raw, ["current"], (string)clampFloat(cur + adjustedDelta, 0.0, max));
    raw = llJsonSetValue(raw, ["max"], (string)max);
    raw = llJsonSetValue(raw, ["xp"], (string)xp);
    raw = llJsonSetValue(raw, ["lastChange"], (string)adjustedDelta);
    raw = llJsonSetValue(raw, ["lastXp"], (string)xpDelta);
    raw = llJsonSetValue(raw, ["lastReason"], reason);
    raw = llJsonSetValue(raw, ["lastActivity"], activity);
    saveStamina(av, raw);
}

handleMovement(string m)
{
    key av = (key)val(m, "avatar", "");
    integer walk = toInt(val(m, "walkSeconds", "0"));
    integer run = toInt(val(m, "runSeconds", "0"));
    integer fly = toInt(val(m, "flySeconds", "0"));
    integer sit = toInt(val(m, "sitSeconds", "0"));
    integer walkMin = walk / 60;
    integer runMin = run / 60;
    integer flyMin = fly / 60;
    integer sitMin = sit / 60;
    integer xp = walkMin + (runMin * 3) + flyMin;
    float drain = (((float)walk / 60.0 * 0.5) + ((float)run / 60.0 * 1.5) + ((float)fly / 60.0)) * movementDrainMultiplier(av);
    float restore = ((float)sit / 60.0 * 0.5);
    string activity = "Standing";

    if (run > 0) activity = "Running";
    else if (fly > 0) activity = "Flying";
    else if (walk > 0) activity = "Walking";
    else if (sit > 0) activity = "Resting";

    if (xp == 0 && drain == 0.0 && restore == 0.0) return;
    applyStamina(av, restore - drain, xp, "Movement", activity);
}

handleBreadcrumb(string m)
{
    key av = (key)val(m, "avatar", "");
    string ev = lower(val(m, "event", ""));
    string typeName = lower(val(m, "type", ""));
    string label = lower(val(m, "label", "") + " " + val(m, "detail", ""));
    float currentDelta = toFloat(val(m, "stamina.current", ""));
    integer xpDelta = toInt(val(m, "stamina.xp", ""));
    string reason = val(m, "label", "Stamina");
    string activity = val(m, "type", "Stamina");

    if (av == NULL_KEY) return;

    if (ev == "fitness.used" || ev == "gym.used" || typeName == "fitness" || typeName == "gym" || llSubStringIndex(label, "workout") != -1 || llSubStringIndex(label, "gym") != -1)
    {
        if (xpDelta == 0) xpDelta = 10;
        if (currentDelta == 0.0) currentDelta = -5.0;
        applyStamina(av, currentDelta, xpDelta, reason, "Workout");
        return;
    }

    if (ev == "furniture.used" || ev == "rest.used" || ev == "sleep.used" || llSubStringIndex(label, "bed") != -1 || llSubStringIndex(label, "rest") != -1 || llSubStringIndex(label, "sleep") != -1)
    {
        if (currentDelta == 0.0) currentDelta = 2.0;
        applyStamina(av, currentDelta, xpDelta, reason, "Rest");
        return;
    }

    if (currentDelta != 0.0 || xpDelta != 0)
    {
        applyStamina(av, currentDelta, xpDelta, reason, activity);
    }
}

default
{
    state_entry()
    {
        llListen(NEURON_SERVER_CHANNEL, "", NULL_KEY, "");
        llListen(CDF_TRACKER_CHANNEL, "", NULL_KEY, "");
        llOwnerSay(DISPLAY_TITLE + " online | Build " + (string)BUILD_NUMBER);
    }

    listen(integer channel, string name, key id, string message)
    {
        string ev;
        if (llGetSubString(message, 0, 13) == "NEURON_MASTER|") return;
        if (llJsonGetValue(message, ["token"]) != CDF_TOKEN) return;
        ev = lower(llJsonGetValue(message, ["event"]));
        if (channel == NEURON_SERVER_CHANNEL && ev == "neuron.activity.summary") { handleMovement(message); return; }
        if (channel == CDF_TRACKER_CHANNEL) { handleBreadcrumb(message); return; }
    }
}
