// =====================================================//
// Name of script: Neura Stamina Movement Neuron
// Build: 1001
// Update: Migrated Stamina Movement Tracker
// Date and time: 2026-07-06 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

integer NEURON_SERVER_CHANNEL = -73463305;
string CDF_TOKEN = "CDF_WORLD_V1";

integer SAMPLE_SECONDS = 15;
integer REPORT_SECONDS = 120;
float RUN_SPEED = 4.2;

integer gWalkSeconds = 0;
integer gRunSeconds = 0;
integer gFlySeconds = 0;
integer gSitSeconds = 0;
integer gLastReport = 0;

sendSummary()
{
    integer total = gWalkSeconds + gRunSeconds + gFlySeconds + gSitSeconds;
    if (total <= 0) return;

    llRegionSay(NEURON_SERVER_CHANNEL, llList2Json(JSON_OBJECT, [
        "token", CDF_TOKEN,
        "source", "neura.neuron.stamina.movement",
        "event", "neuron.activity.summary",
        "avatar", (string)llGetOwner(),
        "walkSeconds", (string)gWalkSeconds,
        "runSeconds", (string)gRunSeconds,
        "flySeconds", (string)gFlySeconds,
        "sitSeconds", (string)gSitSeconds,
        "time", (string)llGetUnixTime()
    ]));

    gWalkSeconds = 0;
    gRunSeconds = 0;
    gFlySeconds = 0;
    gSitSeconds = 0;
    gLastReport = llGetUnixTime();
}

sampleMovement()
{
    integer info = llGetAgentInfo(llGetOwner());
    vector vel = llGetVel();
    float speed = llVecMag(vel);

    if (info & AGENT_SITTING)
    {
        gSitSeconds += SAMPLE_SECONDS;
        return;
    }

    if (info & AGENT_FLYING)
    {
        gFlySeconds += SAMPLE_SECONDS;
        return;
    }

    if (info & AGENT_WALKING)
    {
        if (speed >= RUN_SPEED) gRunSeconds += SAMPLE_SECONDS;
        else gWalkSeconds += SAMPLE_SECONDS;
    }
}

default
{
    state_entry()
    {
        gLastReport = llGetUnixTime();
        llSetTimerEvent((float)SAMPLE_SECONDS);
        llRegionSay(NEURON_SERVER_CHANNEL, llList2Json(JSON_OBJECT, [
            "token", CDF_TOKEN,
            "source", "neura.neuron.stamina.movement",
            "event", "neuron.relay.online",
            "avatar", (string)llGetOwner(),
            "detail", "neura.stamina.movement",
            "time", (string)llGetUnixTime()
        ]));
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    attach(key id)
    {
        if (id != NULL_KEY) llResetScript();
        else llSetTimerEvent(0.0);
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }

    timer()
    {
        sampleMovement();
        if (llGetUnixTime() - gLastReport >= REPORT_SECONDS) sendSummary();
    }
}
