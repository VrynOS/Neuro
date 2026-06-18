// =====================================================
// Camden Falls Clock Media Bridge
// Loads the media version of the official CDF clock.
//
// Put this in the clock object or linked clock screen.
// Configure MEDIA_LINK and MEDIA_FACE if your screen differs.
// =====================================================

string DISPLAY_TITLE = "Camden Falls Clock Media Bridge";
integer BUILD_NUMBER = 1;

integer MEDIA_LINK = LINK_THIS;
integer MEDIA_FACE = 4;
string CLOCK_URL = "https://vrynos.github.io/Neuro/clock.html";

loadClock()
{
    llSetLinkMedia(MEDIA_LINK, MEDIA_FACE, [
        PRIM_MEDIA_CURRENT_URL, CLOCK_URL,
        PRIM_MEDIA_HOME_URL, CLOCK_URL,
        PRIM_MEDIA_AUTO_PLAY, TRUE,
        PRIM_MEDIA_PERMS_INTERACT, PRIM_MEDIA_PERM_OWNER,
        PRIM_MEDIA_PERMS_CONTROL, PRIM_MEDIA_PERM_OWNER,
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
        if (llDetectedKey(0) == llGetOwner()) loadClock();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
