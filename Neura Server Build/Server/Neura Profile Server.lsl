// =====================================================//
// Name of script: Neura Profile Server
// Build: 1017
// Update: Read Official Stamina Progress
// Date and time: 2026-07-02 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

string DISPLAY_TITLE = "Neura Profile Server";
integer BUILD_NUMBER = 1017;

string FEATURE_ID = "NEURA_PROFILE";
integer SCHEMA_VERSION = 1;

integer LM_NEURA_PROFILE_SERVER = 1001401;
integer LM_NEURA_PROFILE_REPLY = 1001402;

integer PROFILE_SERVER_CHANNEL = -1001401;
integer PROFILE_HUD_REPLY_CHANNEL = -1001405;

list SEX_VALUES = ["female", "male", "nonbinary"];
list DISTRICT_VALUES = ["Chi-Core", "Eden Palms", "Camden Falls"];
list ZODIAC_VALUES = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
list SIGIL_VALUES = ["core", "spark", "fire", "wave", "star", "moon", "sun", "leaf", "bolt", "gem", "crown", "shield"];

integer gHandshakeReady = FALSE;
string gLastError = "";
integer gCommandListen = 0;
key gReplyTarget = NULL_KEY;

string baseKey()
{
    return "NP:" + (string)llGetOwner() + ":";
}

string profileKey(string field)
{
    return baseKey() + field;
}

string staminaKey()
{
    return "NEURON_STAMINA:" + (string)llGetOwner();
}

string jsonValue(string raw, string field, string fallback)
{
    string value = llJsonGetValue(raw, [field]);
    if (value == "" || value == JSON_INVALID) return fallback;
    return value;
}

integer xpGoalForLevel(integer level)
{
    if (level <= 1) return 100;
    if (level == 2) return 250;
    if (level == 3) return 450;
    if (level == 4) return 700;
    if (level == 5) return 1000;
    if (level == 6) return 1400;
    if (level == 7) return 1900;
    if (level == 8) return 2500;
    return 3200;
}

reply(string message)
{
    llMessageLinked(LINK_SET, LM_NEURA_PROFILE_REPLY, message, llGetOwner());
    if (gReplyTarget != NULL_KEY) llRegionSayTo(gReplyTarget, PROFILE_HUD_REPLY_CHANNEL, message);
}

deny(string reason)
{
    reply("NEURA_PROFILE_ERROR|reason=" + reason);
}

integer isOwner(key requester)
{
    return requester == llGetOwner();
}

integer hasProtocolBreak(string value)
{
    if (llSubStringIndex(value, "|") != -1) return TRUE;
    if (llSubStringIndex(value, "=") != -1) return TRUE;
    if (llSubStringIndex(value, "\n") != -1) return TRUE;
    if (llSubStringIndex(value, "\r") != -1) return TRUE;
    return FALSE;
}

string cleanText(string value)
{
    return llStringTrim(value, STRING_TRIM);
}

string stripProtocolBreaks(string value)
{
    return llStringTrim(llDumpList2String(llParseStringKeepNulls(value, ["|", "=", "\n", "\r"], []), " "), STRING_TRIM);
}

string safeOptionalText(string value, integer maxLength)
{
    value = stripProtocolBreaks(value);
    if (llStringLength(value) > maxLength) value = llGetSubString(value, 0, maxLength - 1);
    return value;
}

string stored(string field)
{
    return llLinksetDataRead(profileKey(field));
}

ensureCommandListen()
{
    if (!gCommandListen) gCommandListen = llListen(PROFILE_SERVER_CHANNEL, "", NULL_KEY, "");
}

integer validTextField(string label, string value, integer maxLength, integer required)
{
    if (required && value == "")
    {
        gLastError = label + "_required";
        return FALSE;
    }

    if (llStringLength(value) > maxLength)
    {
        gLastError = label + "_too_long";
        return FALSE;
    }

    if (hasProtocolBreak(value))
    {
        gLastError = label + "_invalid_character";
        return FALSE;
    }

    return TRUE;
}

integer allowedValue(string label, string value, list allowed)
{
    if (llListFindList(allowed, [value]) != -1) return TRUE;
    gLastError = label + "_invalid";
    return FALSE;
}

integer optionalAllowedValue(string label, string value, list allowed)
{
    if (value == "") return TRUE;
    return allowedValue(label, value, allowed);
}

integer isHexChar(string value)
{
    return llSubStringIndex("0123456789abcdefABCDEF", value) != -1;
}

integer validColor(string label, string value)
{
    if (llStringLength(value) != 7 || llGetSubString(value, 0, 0) != "#")
    {
        gLastError = label + "_invalid";
        return FALSE;
    }

    integer i = 1;
    while (i < 7)
    {
        if (!isHexChar(llGetSubString(value, i, i)))
        {
            gLastError = label + "_invalid";
            return FALSE;
        }
        i += 1;
    }

    return TRUE;
}

integer rangedInteger(string label, string value, integer fallback, integer minValue, integer maxValue)
{
    if (value == "") return fallback;
    integer parsed = (integer)value;
    if (parsed < minValue || parsed > maxValue)
    {
        gLastError = label + "_out_of_range";
        return -1;
    }
    return parsed;
}

string getParam(list parts, string name)
{
    integer count = llGetListLength(parts);
    integer i = 1;
    string target = llToLower(name);

    while (i < count)
    {
        string part = llList2String(parts, i);
        integer equalsAt = llSubStringIndex(part, "=");

        if (equalsAt > 0)
        {
            string keyName = llToLower(llGetSubString(part, 0, equalsAt - 1));
            if (keyName == target) return llGetSubString(part, equalsAt + 1, -1);
        }

        i += 1;
    }

    return "";
}

integer validFeature(list parts)
{
    if (getParam(parts, "feature") == FEATURE_ID) return TRUE;
    gLastError = "unknown_feature";
    return FALSE;
}

integer validSchema(list parts)
{
    if ((integer)getParam(parts, "schema") == SCHEMA_VERSION) return TRUE;
    gLastError = "schema_mismatch";
    return FALSE;
}

integer validateCommandEnvelope(list parts)
{
    if (!validFeature(parts)) return FALSE;
    if (!validSchema(parts)) return FALSE;
    if (!gHandshakeReady) gHandshakeReady = TRUE;
    return TRUE;
}

integer profileReady(string age, string sex, string district)
{
    if (age == "") return FALSE;
    if (sex == "") return FALSE;
    if (district == "") return FALSE;
    return TRUE;
}

saveProfile(string age, string sex, string role, string district, string zodiac, string bio, string sigil, string accent, string background, integer stamina, integer staminaGoal)
{
    integer ready = profileReady(age, sex, district);
    llLinksetDataWrite(profileKey("schema"), (string)SCHEMA_VERSION);
    llLinksetDataWrite(profileKey("ready"), (string)ready);
    llLinksetDataWrite(profileKey("age"), age);
    llLinksetDataWrite(profileKey("sex"), sex);
    llLinksetDataWrite(profileKey("role"), role);
    llLinksetDataWrite(profileKey("district"), district);
    llLinksetDataWrite(profileKey("zodiac"), zodiac);
    llLinksetDataWrite(profileKey("bio"), bio);
    llLinksetDataWrite(profileKey("sigil"), sigil);
    llLinksetDataWrite(profileKey("accent"), llToLower(accent));
    llLinksetDataWrite(profileKey("bg"), llToLower(background));
    llLinksetDataWrite(profileKey("stamina"), (string)stamina);
    llLinksetDataWrite(profileKey("staminaGoal"), (string)staminaGoal);
    llLinksetDataWrite(profileKey("updated"), llGetTimestamp());
}

ensureProgressDefaults()
{
    if (stored("stamina") == "") llLinksetDataWrite(profileKey("stamina"), "100");
    if (stored("staminaGoal") == "") llLinksetDataWrite(profileKey("staminaGoal"), "100");
    if (stored("level") == "") llLinksetDataWrite(profileKey("level"), "1");
    if (stored("xp") == "") llLinksetDataWrite(profileKey("xp"), "0");
    if (stored("xpGoal") == "") llLinksetDataWrite(profileKey("xpGoal"), "100");
}

sendProfile()
{
    string staminaRaw;
    string staminaCurrent;
    string staminaMax;
    string staminaXp;
    string staminaLevel;
    integer xpGoal;

    ensureProgressDefaults();
    staminaRaw = llLinksetDataRead(staminaKey());
    staminaCurrent = jsonValue(staminaRaw, "current", stored("stamina"));
    staminaMax = jsonValue(staminaRaw, "max", stored("staminaGoal"));
    staminaXp = jsonValue(staminaRaw, "xp", stored("xp"));
    staminaLevel = jsonValue(staminaRaw, "level", stored("level"));
    xpGoal = xpGoalForLevel((integer)staminaLevel);

    reply("NEURA_PROFILE_DATA"
        + "|feature=" + FEATURE_ID
        + "|schema=" + (string)SCHEMA_VERSION
        + "|ready=" + stored("ready")
        + "|age=" + stored("age")
        + "|sex=" + stored("sex")
        + "|role=" + stored("role")
        + "|district=" + stored("district")
        + "|zodiac=" + stored("zodiac")
        + "|bio=" + stored("bio")
        + "|sigil=" + stored("sigil")
        + "|accent=" + stored("accent")
        + "|background=" + stored("bg")
        + "|stamina=" + staminaCurrent
        + "|staminaGoal=" + staminaMax
        + "|level=" + staminaLevel
        + "|xp=" + staminaXp
        + "|xpGoal=" + (string)xpGoal
        + "|updated=" + stored("updated"));
}

handleHandshake(list parts)
{
    gLastError = "";
    if (!validFeature(parts)) { deny(gLastError); return; }
    if (!validSchema(parts)) { deny(gLastError); return; }
    gHandshakeReady = TRUE;
    reply("NEURA_PROFILE_HANDSHAKE_OK|feature=" + FEATURE_ID + "|build=" + (string)BUILD_NUMBER + "|schema=" + (string)SCHEMA_VERSION);
}

handleSave(list parts)
{
    gLastError = "";
    if (!validateCommandEnvelope(parts)) { deny(gLastError); return; }

    string age = cleanText(getParam(parts, "age"));
    string sex = llToLower(cleanText(getParam(parts, "sex")));
    string role = safeOptionalText(getParam(parts, "role"), 24);
    string district = cleanText(getParam(parts, "district"));
    string zodiac = llToLower(cleanText(getParam(parts, "zodiac")));
    string bio = safeOptionalText(getParam(parts, "bio"), 280);
    string sigil = llToLower(cleanText(getParam(parts, "sigil")));
    string accent = cleanText(getParam(parts, "accent"));
    string background = cleanText(getParam(parts, "background"));
    integer stamina = rangedInteger("stamina", cleanText(getParam(parts, "stamina")), (integer)stored("stamina"), 0, 999);
    if (stamina == -1) { deny(gLastError); return; }

    integer staminaGoal = rangedInteger("staminaGoal", cleanText(getParam(parts, "staminaGoal")), (integer)stored("staminaGoal"), 1, 999);
    if (staminaGoal == -1) { deny(gLastError); return; }

    if (stamina > staminaGoal) { deny("stamina_over_goal"); return; }

    if (zodiac != "" && !optionalAllowedValue("zodiac", zodiac, ZODIAC_VALUES))
    {
        zodiac = "";
        gLastError = "";
    }

    if (sigil == "")
    {
        sigil = stored("sigil");
    }
    if (sigil == "")
    {
        sigil = "core";
    }
    if (!optionalAllowedValue("sigil", sigil, SIGIL_VALUES))
    {
        sigil = "core";
        gLastError = "";
    }

    if (accent == "") accent = "#2fc7ff";
    if (background == "") background = "#061725";
    if (!validColor("accent", accent))
    {
        accent = "#2fc7ff";
        gLastError = "";
    }
    if (!validColor("background", background))
    {
        background = "#061725";
        gLastError = "";
    }

    if (!validTextField("age", age, 16, TRUE)) { deny(gLastError); return; }
    if (!allowedValue("sex", sex, SEX_VALUES)) { deny(gLastError); return; }
    if (!allowedValue("district", district, DISTRICT_VALUES)) { deny(gLastError); return; }

    saveProfile(age, sex, role, district, zodiac, bio, sigil, accent, background, stamina, staminaGoal);
    reply("NEURA_PROFILE_SAVE_OK|feature=" + FEATURE_ID + "|ready=" + stored("ready") + "|sigil=" + stored("sigil") + "|updated=" + stored("updated"));
    sendProfile();
}

handleRead(list parts)
{
    gLastError = "";
    if (!validateCommandEnvelope(parts)) { deny(gLastError); return; }
    sendProfile();
}

handleProfileMessage(string message, key requester)
{
    if (!isOwner(requester)) { deny("owner_only"); return; }

    list parts = llParseStringKeepNulls(message, ["|"], []);
    string command = llToUpper(cleanText(llList2String(parts, 0)));

    if (command == "NEURA_PROFILE_HANDSHAKE" || command == "PROFILE_HANDSHAKE") { handleHandshake(parts); return; }
    if (command == "NEURA_PROFILE_SAVE" || command == "PROFILE_SAVE") { handleSave(parts); return; }
    if (command == "NEURA_PROFILE_READ" || command == "PROFILE_READ") { handleRead(parts); return; }

    deny("unknown_command");
}

default
{
    state_entry()
    {
        ensureCommandListen();
        llLinksetDataWrite(profileKey("schema"), (string)SCHEMA_VERSION);
        if (stored("ready") == "") llLinksetDataWrite(profileKey("ready"), "0");
        if (stored("sigil") == "") llLinksetDataWrite(profileKey("sigil"), "core");
        ensureProgressDefaults();
        llOwnerSay(DISPLAY_TITLE + " online | Build " + (string)BUILD_NUMBER + " | Schema " + (string)SCHEMA_VERSION);
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
        if (number != LM_NEURA_PROFILE_SERVER) return;
        handleProfileMessage(message, id);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != PROFILE_SERVER_CHANNEL) return;
        if (id == llGetKey()) return;
        if (llGetOwnerKey(id) != llGetOwner()) return;

        gReplyTarget = id;
        handleProfileMessage(message, llGetOwner());
        gReplyTarget = NULL_KEY;
    }
}
