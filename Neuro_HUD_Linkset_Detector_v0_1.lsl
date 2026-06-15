// =====================================================
// Neuro HUD Linkset Detector v0.1
//
// Drop this into the linked Neuro HUD while building.
// It scans prim names, reports link numbers, and warns
// about missing or duplicate controls.
//
// Owner commands:
//   /77 scan
//   /77 links
//   /77 missing
//   /77 help
//
// Touch the HUD as owner to run a scan.
// Remove this script after the HUD is linked/named.
// =====================================================

string DISPLAY_TITLE = "Neuro HUD Linkset Detector";
integer BUILD_NUMBER = 1;
integer CMD_CH = 77;

list REQUIRED_NAMES = [
    "Root",
    "Screen",
    "Settings",
    "Minimize",
    "Notifications",
    "Time",
    "Hunger",
    "Thirst",
    "Sleep",
    "Hygiene",
    "Energy",
    "Fun",
    "XP",
    "Hunger Light",
    "Thirst Light",
    "Sleep Light",
    "Hygiene Light",
    "Energy Light",
    "Fun Light",
    "XP Light",
    "Info Panel",
    "Edit",
    "Refresh",
    "Wallet",
    "Health",
    "Social",
    "Jobs",
    "Messages",
    "Home"
];

integer listenHandle;

integer sameName(string a, string b)
{
    return (llToLower(llStringTrim(a, STRING_TRIM)) == llToLower(llStringTrim(b, STRING_TRIM)));
}

string cleanName(string name)
{
    return llStringTrim(name, STRING_TRIM);
}

integer findFirstLink(string wanted)
{
    integer total = llGetNumberOfPrims();
    integer link;
    string name;

    for (link = 1; link <= total; ++link)
    {
        name = cleanName(llGetLinkName(link));
        if (sameName(name, wanted)) return link;
    }
    return 0;
}

integer countLinksNamed(string wanted)
{
    integer total = llGetNumberOfPrims();
    integer link;
    integer count = 0;
    string name;

    for (link = 1; link <= total; ++link)
    {
        name = cleanName(llGetLinkName(link));
        if (sameName(name, wanted)) count += 1;
    }
    return count;
}

string linkReportLine(string wanted)
{
    integer link = findFirstLink(wanted);
    integer count = countLinksNamed(wanted);

    if (link == 0) return "MISSING | " + wanted;
    if (count > 1) return "DUPLICATE x" + (string)count + " | " + wanted + " | first link " + (string)link;
    return "OK | " + wanted + " | link " + (string)link;
}

sayBlock(string header, list rows)
{
    integer i;
    string out = header;

    for (i = 0; i < llGetListLength(rows); ++i)
    {
        if (llStringLength(out + "\n" + llList2String(rows, i)) > 900)
        {
            llOwnerSay(out);
            out = header + " continued";
        }
        out += "\n" + llList2String(rows, i);
    }

    llOwnerSay(out);
}

scanRequired()
{
    list rows = [];
    integer i;
    string wanted;

    for (i = 0; i < llGetListLength(REQUIRED_NAMES); ++i)
    {
        wanted = llList2String(REQUIRED_NAMES, i);
        rows += [linkReportLine(wanted)];
    }

    sayBlock("Neuro required link scan:", rows);
}

list allLinkRows()
{
    list rows = [];
    integer total = llGetNumberOfPrims();
    integer link;
    string name;

    for (link = 1; link <= total; ++link)
    {
        name = cleanName(llGetLinkName(link));
        if (name == "") name = "(unnamed)";
        rows += [(string)link + " | " + name];
    }

    return rows;
}

showAllLinks()
{
    sayBlock("Neuro all linked prims:", allLinkRows());
}

showMissingOnly()
{
    list rows = [];
    integer i;
    string wanted;

    for (i = 0; i < llGetListLength(REQUIRED_NAMES); ++i)
    {
        wanted = llList2String(REQUIRED_NAMES, i);
        if (findFirstLink(wanted) == 0) rows += [wanted];
    }

    if (llGetListLength(rows) == 0)
    {
        llOwnerSay("Neuro missing link scan: none missing.");
        return;
    }

    sayBlock("Neuro missing names:", rows);
}

showHelp()
{
    llOwnerSay(
        DISPLAY_TITLE + " Build " + (string)BUILD_NUMBER
        + "\nTouch HUD to scan."
        + "\n/77 scan = required names"
        + "\n/77 links = all link numbers"
        + "\n/77 missing = missing required names"
        + "\n/77 help = this help"
    );
}

handleCommand(key speaker, string msg)
{
    msg = llToLower(llStringTrim(msg, STRING_TRIM));

    if (speaker != llGetOwner()) return;
    if (msg == "scan") { scanRequired(); return; }
    if (msg == "links") { showAllLinks(); return; }
    if (msg == "missing") { showMissingOnly(); return; }
    if (msg == "help") { showHelp(); return; }
}

default
{
    state_entry()
    {
        if (listenHandle) llListenRemove(listenHandle);
        listenHandle = llListen(CMD_CH, "", llGetOwner(), "");
        llOwnerSay(DISPLAY_TITLE + " online. Type /77 scan or touch HUD.");
    }

    on_rez(integer startParam)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
        if (change & CHANGED_LINK) scanRequired();
    }

    touch_start(integer total)
    {
        if (llDetectedKey(0) == llGetOwner()) scanRequired();
    }

    listen(integer channel, string name, key id, string msg)
    {
        if (channel == CMD_CH) handleCommand(id, msg);
    }
}
