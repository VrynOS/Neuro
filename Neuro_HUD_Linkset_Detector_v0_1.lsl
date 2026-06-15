// =====================================================
// Neuro HUD Linkset Detector v0.2
//
// Drop this into the linked Neuro HUD while building.
// It scans the live linkset, reports link numbers, and
// checks the current SL-native Neuro Pad names.
//
// Owner commands:
//   /77 scan
//   /77 links
//   /77 missing
//   /77 stats
//   /77 help
//
// Touch the HUD as owner to scan.
// =====================================================

string DISPLAY_TITLE = "Neuro HUD Linkset Detector";
integer BUILD_NUMBER = 2;
integer CMD_CH = 77;

list ROOT_ALIASES = ["Root", "Neuro Pad"];

list CORE_NAMES = [
    "Settings",
    "Minimize",
    "Notifications",
    "Time",
    "Info Panel",
    "Edit",
    "Refresh",
    "Wallet",
    "Health",
    "Social",
    "Jobs",
    "Messages"
];

list STAT_NAMES = [
    "Stats Sheet",
    "Hunger Fill",
    "Thirst Fill",
    "Sleep Fill",
    "Hygiene Fill",
    "Energy Fill",
    "Fun Fill",
    "XP Fill"
];

list OPTIONAL_NAMES = [
    "Verified",
    "Home"
];

integer listenHandle;

string cleanName(string name)
{
    return llStringTrim(name, STRING_TRIM);
}

string norm(string name)
{
    return llToLower(cleanName(name));
}

integer sameName(string a, string b)
{
    return (norm(a) == norm(b));
}

integer findFirstLink(string wanted)
{
    integer total = llGetNumberOfPrims();
    integer link;

    for (link = 1; link <= total; ++link)
    {
        if (sameName(llGetLinkName(link), wanted)) return link;
    }
    return 0;
}

integer countLinksNamed(string wanted)
{
    integer total = llGetNumberOfPrims();
    integer link;
    integer count = 0;

    for (link = 1; link <= total; ++link)
    {
        if (sameName(llGetLinkName(link), wanted)) count += 1;
    }
    return count;
}

integer findRootLink()
{
    integer i;
    integer link;

    for (i = 0; i < llGetListLength(ROOT_ALIASES); ++i)
    {
        link = findFirstLink(llList2String(ROOT_ALIASES, i));
        if (link) return link;
    }
    return 0;
}

integer countRootLinks()
{
    integer i;
    integer total = 0;

    for (i = 0; i < llGetListLength(ROOT_ALIASES); ++i)
    {
        total += countLinksNamed(llList2String(ROOT_ALIASES, i));
    }
    return total;
}

string reportName(string wanted, integer required)
{
    integer link = findFirstLink(wanted);
    integer count = countLinksNamed(wanted);
    string prefix = "OK";

    if (!required) prefix = "OPTIONAL";

    if (link == 0)
    {
        if (required) return "MISSING | " + wanted;
        return "OPTIONAL missing | " + wanted;
    }

    if (count > 1) return "DUPLICATE x" + (string)count + " | " + wanted + " | first link " + (string)link;
    return prefix + " | " + wanted + " | link " + (string)link;
}

string reportRoot()
{
    integer link = findRootLink();
    integer count = countRootLinks();

    if (link == 0) return "MISSING | Root or Neuro Pad";
    if (count > 1) return "DUPLICATE x" + (string)count + " | Root/Neuro Pad | first link " + (string)link;
    return "OK | Root/Neuro Pad | link " + (string)link;
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

list scanList(list names, integer required)
{
    list rows = [];
    integer i;

    for (i = 0; i < llGetListLength(names); ++i)
    {
        rows += [reportName(llList2String(names, i), required)];
    }
    return rows;
}

scanRequired()
{
    list rows = [];

    rows += [reportRoot()];
    rows += ["-- Core --"];
    rows += scanList(CORE_NAMES, TRUE);
    rows += ["-- Stats --"];
    rows += scanList(STAT_NAMES, TRUE);
    rows += ["-- Optional --"];
    rows += scanList(OPTIONAL_NAMES, FALSE);

    sayBlock("Neuro live linkset scan:", rows);
}

showStatsOnly()
{
    list rows = [];

    rows += scanList(STAT_NAMES, TRUE);
    sayBlock("Neuro stat link scan:", rows);
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

list addMissing(list names, list rows)
{
    integer i;
    string wanted;

    for (i = 0; i < llGetListLength(names); ++i)
    {
        wanted = llList2String(names, i);
        if (findFirstLink(wanted) == 0) rows += [wanted];
    }

    return rows;
}

showMissingOnly()
{
    list rows = [];

    if (findRootLink() == 0) rows += ["Root or Neuro Pad"];
    rows = addMissing(CORE_NAMES, rows);
    rows = addMissing(STAT_NAMES, rows);

    if (llGetListLength(rows) == 0)
    {
        llOwnerSay("Neuro missing link scan: none missing.");
        return;
    }

    sayBlock("Neuro missing required names:", rows);
}

showHelp()
{
    llOwnerSay(
        DISPLAY_TITLE + " Build " + (string)BUILD_NUMBER
        + "\nTouch HUD to scan."
        + "\n/77 scan = current Neuro map"
        + "\n/77 links = all live link names"
        + "\n/77 missing = missing required names"
        + "\n/77 stats = stat sheet/fill names"
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
    if (msg == "stats") { showStatsOnly(); return; }
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
