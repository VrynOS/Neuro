// =====================================================
// G Coin System - AtlasVault Account Migrator
// Build 20405
//
// One-time migration from:
//   BBS_ACCOUNTS = uuid|checking|savings|uuid|checking|savings
//
// To:
//   BBS_ACCT:<uuid> = checking|savings
//   BBS_ACCT_INDEX = uuid|uuid|uuid
//
// Drop into the AtlasVault server object with the old data still present.
// Touch by owner/admin to migrate. Remove after migration reports DONE.
// =====================================================

string DISPLAY_TITLE = "G Coin AtlasVault Account Migrator";
integer BUILD_NUMBER = 20405;

key BANK_ADMIN = "0f6de87a-d007-46bb-85e5-fceccf6974ae";

string LSD_LEGACY_ACCTS = "BBS_ACCOUNTS";
string LSD_INDEX = "BBS_ACCT_INDEX";
string LSD_MIGRATION = "BBS_ACCT_MIGRATION";

integer cursor = 0;
integer migrated = 0;
integer running = FALSE;
string raw = "";
string indexRaw = "";

integer isAdmin(key user)
{
    return (user == BANK_ADMIN || user == llGetOwner());
}

string accountKey(key id)
{
    return "BBS_ACCT:" + (string)id;
}

float round2(float v)
{
    return (float)llRound(v);
}

integer indexHas(key id)
{
    string needle;

    if (indexRaw == "") return FALSE;
    needle = "|" + (string)id + "|";
    return (llSubStringIndex("|" + indexRaw + "|", needle) != -1);
}

addIndex(key id)
{
    if (id == NULL_KEY) return;
    if (indexHas(id)) return;

    if (indexRaw == "") indexRaw = (string)id;
    else indexRaw += "|" + (string)id;

    llLinksetDataWrite(LSD_INDEX, indexRaw);
}

string nextToken()
{
    string tail;
    integer hit;
    string token;

    if (cursor > llStringLength(raw)) return "";

    tail = llGetSubString(raw, cursor, -1);
    hit = llSubStringIndex(tail, "|");

    if (hit == -1)
    {
        token = tail;
        cursor = llStringLength(raw) + 1;
        return token;
    }

    token = llGetSubString(tail, 0, hit - 1);
    cursor += hit + 1;
    return token;
}

processOne()
{
    key id;
    string checkRaw;
    string saveRaw;
    float checking;
    float savings;

    id = (key)nextToken();
    checkRaw = nextToken();
    saveRaw = nextToken();

    if (id == NULL_KEY)
    {
        running = FALSE;
        llSetTimerEvent(0.0);
        llLinksetDataWrite(LSD_MIGRATION, "DONE|" + (string)migrated + "|" + (string)llGetUnixTime());
        llOwnerSay(DISPLAY_TITLE + " DONE. Migrated " + (string)migrated + " accounts.");
        return;
    }

    checking = round2((float)checkRaw);
    savings = round2((float)saveRaw);

    llLinksetDataWrite(accountKey(id), (string)checking + "|" + (string)savings);
    addIndex(id);
    migrated += 1;

    if (cursor > llStringLength(raw))
    {
        running = FALSE;
        llSetTimerEvent(0.0);
        llLinksetDataWrite(LSD_MIGRATION, "DONE|" + (string)migrated + "|" + (string)llGetUnixTime());
        llOwnerSay(DISPLAY_TITLE + " DONE. Migrated " + (string)migrated + " accounts.");
    }
}

default
{
    state_entry()
    {
        llOwnerSay(DISPLAY_TITLE + " ready | Build " + (string)BUILD_NUMBER + ". Touch to migrate legacy accounts.");
    }

    touch_start(integer total)
    {
        key toucher = llDetectedKey(0);
        if (!isAdmin(toucher)) return;

        raw = llLinksetDataRead(LSD_LEGACY_ACCTS);
        if (raw == "")
        {
            llOwnerSay(DISPLAY_TITLE + ": No legacy BBS_ACCOUNTS data found.");
            return;
        }

        cursor = 0;
        migrated = 0;
        indexRaw = llLinksetDataRead(LSD_INDEX);
        running = TRUE;
        llLinksetDataWrite(LSD_MIGRATION, "RUNNING|" + (string)llGetUnixTime());
        llOwnerSay(DISPLAY_TITLE + " starting migration. Do not delete this script until DONE.");
        llSetTimerEvent(0.15);
    }

    timer()
    {
        integer i;
        if (!running) return;

        for (i = 0; i < 4 && running; ++i)
        {
            processOne();
        }
    }
}
