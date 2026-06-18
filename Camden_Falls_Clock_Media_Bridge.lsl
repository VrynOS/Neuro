// =====================================================
// Camden Falls Clock Media Bridge
// Loads the media version of the official CDF clock.
//
// Put this in the clock object or linked clock screen.
// Configure MEDIA_LINK and MEDIA_FACE if your screen differs.
// =====================================================

string DISPLAY_TITLE = "Camden Falls Clock Media Bridge";
integer BUILD_NUMBER = 2;

integer MEDIA_LINK = LINK_THIS;
integer MEDIA_FACE = 4;
string CLOCK_BASE_URL = "https://vrynos.github.io/Neuro/clock.html";
integer USE_24_HOUR = FALSE;

string clockUrl()
{
    string format = "12";
    if (USE_24_HOUR) format = "24";
    return CLOCK_BASE_URL + "?format=" + format + "&v=2";
}

loadClock()
{
    string url = clockUrl();
    llSetLinkMedia(MEDIA_LINK, MEDIA_FACE, [
        PRIM_MEDIA_CURRENT_URL, url,
        PRIM_MEDIA_HOME_URL, url,
        PRIM_MEDIA_AUTO_PLAY, TRUE,
        PRIM_MEDIA_AUTO_ZOOM, FALSE,
        PRIM_MEDIA_CONTROLS, PRIM_MEDIA_CONTROLS_MINI,
        PRIM_MEDIA_PERMS_INTERACT, PRIM_MEDIA_PERM_NONE,
        PRIM_MEDIA_PERMS_CONTROL, PRIM_MEDIA_PERM_NONE,
        PRIM_MEDIA_WIDTH_PIXELS, 1024,
        PRIM_MEDIA_HEIGHT_PIXELS, 512
    ]);
}

default
{
    state_entry()
    {
        loadClock();
        llOwnerSay(DISPLAY_TITLE + " online | Build " + (string)BUILD_NUMBER);
    }

    touch_start(integer total_number)
    {
        if (llDetectedKey(0) != llGetOwner()) return;
        USE_24_HOUR = !USE_24_HOUR;
        loadClock();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
