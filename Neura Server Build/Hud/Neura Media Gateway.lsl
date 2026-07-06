// =====================================================//
// Name of script: Neura Media Gateway
// Build: 1004
// Update: XP Command Bridge
// Date and time: 2026-07-03 00:00:00 -04:00
// Team: Jynx Glitch Violet.(TM) Jah-Vryn(TM) Jah'Vict(TM).
// =====================================================//

string DISPLAY_TITLE = "Neura Media Gateway";
integer BUILD_NUMBER = 1004;

integer MEDIA_LINK = 2;
integer MEDIA_FACE = 0;
integer MEDIA_WIDTH = 1280;
integer MEDIA_HEIGHT = 800;
string MEDIA_PAGE_URL = "https://vrynos.github.io/Neuro/neura-build-1001/";

integer LM_MEMORY_SYNC = 7610;
integer LM_NEURA_HEART_EVENT = 1001303;
integer LM_NEURA_PROFILE_READY = 1001400;
integer LM_NEURA_STATS_READY = 1001500;
integer LM_NEURA_WALLET_READY = 1001600;
integer LM_NEURA_XP_READY = 1001650;
integer LM_NEURA_HEALTH_READY = 1001700;
integer LM_NEURA_WORK_READY = 1001800;
integer LM_NEURA_HUD_RESIZER = 1001900;

key gUrlRequest = NULL_KEY;
string gBridgeUrl = "";
list gReplyQueue = [];

string enc(string value)
{
    return llEscapeURL(value);
}

string dec(string value)
{
    return llUnescapeURL(llDumpList2String(llParseStringKeepNulls(value, ["+"], []), " "));
}

integer startsWith(string value, string prefix)
{
    return llGetSubString(value, 0, llStringLength(prefix) - 1) == prefix;
}

string commandName(string message)
{
    return llToUpper(llStringTrim(llList2String(llParseStringKeepNulls(message, ["|"], []), 0), STRING_TRIM));
}

string queryValue(string body, string keyName)
{
    list parts = llParseStringKeepNulls(body, ["&"], []);
    integer count = llGetListLength(parts);
    integer i = 0;

    while (i < count)
    {
        string row = llList2String(parts, i);
        integer equalsAt = llSubStringIndex(row, "=");

        if (equalsAt != -1)
        {
            string decodedKey = dec(llGetSubString(row, 0, equalsAt - 1));
            if (decodedKey == keyName) return dec(llGetSubString(row, equalsAt + 1, -1));
        }

        i += 1;
    }

    return "";
}

integer mediaLink()
{
    if (MEDIA_LINK > 0 && MEDIA_LINK <= llGetNumberOfPrims()) return MEDIA_LINK;
    return LINK_THIS;
}

integer mediaFace()
{
    integer link = mediaLink();
    integer sides = llGetLinkNumberOfSides(link);
    if (MEDIA_FACE >= 0 && MEDIA_FACE < sides) return MEDIA_FACE;
    return 0;
}

string mediaPageUrl()
{
    return MEDIA_PAGE_URL
        + "?bridge=sl"
        + "&build=media-gateway-" + (string)BUILD_NUMBER
        + "&cache=" + enc((string)llGetUnixTime())
        + "&avatar=" + enc((string)llGetOwner());
}

string wrapperHtml()
{
    string src = mediaPageUrl();

    return "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
        + "<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#061725}"
        + "iframe{border:0;width:100%;height:100%;display:block}</style></head>"
        + "<body><iframe id='neura' src='" + src + "'></iframe><script>"
        + "var f=document.getElementById('neura');"
        + "function ack(t,s,b){f.contentWindow.postMessage('NEURA_GATEWAY_ACK|'+t+'|'+s+'|'+b,'*')}"
        + "window.addEventListener('message',function(e){var d=String(e.data||'');"
        + "if(d.indexOf('NEURA_GATEWAY|')!==0)return;"
        + "var q=d.substring(14),m=q.match(/(?:^|&)tick=([^&]+)/),t=m?decodeURIComponent(m[1]):'';"
        + "var x=new XMLHttpRequest();x.open('POST',window.location.href,true);"
        + "x.setRequestHeader('Content-Type','application/x-www-form-urlencoded');"
        + "x.onload=function(){ack(t,x.status,x.responseText)};"
        + "x.onerror=function(){ack(t,0,'error')};"
        + "x.send(q+'&bridgeTick='+Date.now())});"
        + "</script></body></html>";
}

setMedia()
{
    if (gBridgeUrl == "") return;

    string mediaUrl = gBridgeUrl + "?build=" + (string)BUILD_NUMBER + "&cache=" + (string)llGetUnixTime();
    integer link = mediaLink();
    integer face = mediaFace();

    llClearLinkMedia(link, face);
    llSetLinkMedia(link, face, [
        PRIM_MEDIA_CURRENT_URL, mediaUrl,
        PRIM_MEDIA_HOME_URL, mediaUrl,
        PRIM_MEDIA_AUTO_PLAY, TRUE,
        PRIM_MEDIA_AUTO_ZOOM, FALSE,
        PRIM_MEDIA_CONTROLS, PRIM_MEDIA_CONTROLS_MINI,
        PRIM_MEDIA_PERMS_INTERACT, PRIM_MEDIA_PERM_OWNER,
        PRIM_MEDIA_PERMS_CONTROL, PRIM_MEDIA_PERM_OWNER,
        PRIM_MEDIA_WIDTH_PIXELS, MEDIA_WIDTH,
        PRIM_MEDIA_HEIGHT_PIXELS, MEDIA_HEIGHT
    ]);
}

requestBridgeUrl()
{
    if (gBridgeUrl != "") return;
    gUrlRequest = llRequestURL();
}

queueReply(string message)
{
    if (message == "") return;

    gReplyQueue += [message];
    while (llGetListLength(gReplyQueue) > 16)
    {
        gReplyQueue = llDeleteSubList(gReplyQueue, 0, 0);
    }
}

string pollReplies()
{
    if (llGetListLength(gReplyQueue) == 0) return "NEURA_GATEWAY_IDLE";

    string body = "NEURA_GATEWAY_POLL\n" + llDumpList2String(gReplyQueue, "\n");
    gReplyQueue = [];
    return body;
}

integer isReplyMessage(string message)
{
    string command = commandName(message);

    if (startsWith(command, "NEURA_PROFILE_HANDSHAKE_OK")) return TRUE;
    if (startsWith(command, "NEURA_PROFILE_SAVE_OK")) return TRUE;
    if (startsWith(command, "NEURA_PROFILE_DATA")) return TRUE;
    if (startsWith(command, "NEURA_PROFILE_ERROR")) return TRUE;
    if (startsWith(command, "NEURA_PROFILE_NEURON_HANDSHAKE_OK")) return TRUE;
    if (startsWith(command, "NEURA_PROFILE_NEURON_SAVE_OK")) return TRUE;
    if (startsWith(command, "NEURA_PROFILE_NEURON_DATA")) return TRUE;
    if (startsWith(command, "NEURA_PROFILE_NEURON_ERROR")) return TRUE;
    if (startsWith(command, "NEURA_STATS_HANDSHAKE_OK")) return TRUE;
    if (startsWith(command, "NEURA_STATS_SET_OK")) return TRUE;
    if (startsWith(command, "NEURA_STATS_ADJUST_OK")) return TRUE;
    if (startsWith(command, "NEURA_STATS_DATA")) return TRUE;
    if (startsWith(command, "NEURA_STATS_ERROR")) return TRUE;
    if (startsWith(command, "NEURA_XP_HANDSHAKE_OK")) return TRUE;
    if (startsWith(command, "NEURA_XP_DATA")) return TRUE;
    if (startsWith(command, "NEURA_XP_ERROR")) return TRUE;
    if (startsWith(command, "NEURA_WALLET_DATA")) return TRUE;
    if (startsWith(command, "NEURA_WALLET_PERMISSION_REQUESTED")) return TRUE;
    if (startsWith(command, "NEURA_WALLET_PERMISSION_DENIED")) return TRUE;
    if (startsWith(command, "NEURA_HEALTH_HANDSHAKE_OK")) return TRUE;
    if (startsWith(command, "NEURA_HEALTH_COMMAND_OK")) return TRUE;
    if (startsWith(command, "NEURA_HEALTH_DATA")) return TRUE;
    if (startsWith(command, "NEURA_HEALTH_ERROR")) return TRUE;
    if (startsWith(command, "NEURA_WORK_HANDSHAKE_OK")) return TRUE;
    if (startsWith(command, "NEURA_WORK_COMMAND_OK")) return TRUE;
    if (startsWith(command, "NEURA_WORK_DATA")) return TRUE;
    if (startsWith(command, "NEURA_WORK_ERROR")) return TRUE;
    if (startsWith(command, "NEURA_HEART_EVENT")) return TRUE;

    return FALSE;
}

integer routeMessage(string message)
{
    string command = commandName(message);

    if (startsWith(command, "NEURA_PROFILE_") || startsWith(command, "PROFILE_"))
    {
        llMessageLinked(LINK_SET, LM_NEURA_PROFILE_READY, message, llGetOwner());
        return TRUE;
    }

    if (startsWith(command, "NEURA_STATS_") || startsWith(command, "STATS_"))
    {
        llMessageLinked(LINK_SET, LM_NEURA_STATS_READY, message, llGetOwner());
        return TRUE;
    }

    if (startsWith(command, "NEURA_XP_") || startsWith(command, "XP_"))
    {
        llMessageLinked(LINK_SET, LM_NEURA_XP_READY, message, llGetOwner());
        return TRUE;
    }

    if (startsWith(command, "NEURA_HEALTH_") || startsWith(command, "HEALTH_"))
    {
        llMessageLinked(LINK_SET, LM_NEURA_HEALTH_READY, message, llGetOwner());
        return TRUE;
    }

    if (startsWith(command, "NEURA_WORK_") || startsWith(command, "WORK_"))
    {
        llMessageLinked(LINK_SET, LM_NEURA_WORK_READY, message, llGetOwner());
        return TRUE;
    }

    return FALSE;
}

syncAll()
{
    llMessageLinked(LINK_SET, LM_NEURA_PROFILE_READY, "NEURA_PROFILE_READ|feature=NEURA_PROFILE|schema=1", llGetOwner());
    llMessageLinked(LINK_SET, LM_NEURA_STATS_READY, "NEURA_STATS_READ|feature=NEURA_STATS|schema=1", llGetOwner());
    llMessageLinked(LINK_SET, LM_NEURA_XP_READY, "NEURA_XP_READ|feature=NEURA_XP|schema=1", llGetOwner());
    llMessageLinked(LINK_SET, LM_NEURA_HEALTH_READY, "NEURA_HEALTH_READ|feature=NEURA_HEALTH|schema=1", llGetOwner());
    llMessageLinked(LINK_SET, LM_NEURA_WORK_READY, "NEURA_WORK_READ|feature=NEURA_WORK|schema=1", llGetOwner());
    llMessageLinked(LINK_SET, LM_NEURA_WALLET_READY, "refresh", llGetOwner());
    llMessageLinked(LINK_SET, LM_NEURA_HEART_EVENT,
        "NEURA_HEART_EVENT|feature=NEURA_HEART|event=HUD_RESYNCED|detail=Media gateway sync requested.",
        llGetOwner());
}

handleOp(string query, key requestId)
{
    string op = llToLower(queryValue(query, "op"));
    string message = queryValue(query, "message");
    string command = queryValue(query, "command");

    if (op == "")
    {
        llSetContentType(requestId, CONTENT_TYPE_HTML);
        llHTTPResponse(requestId, 200, wrapperHtml());
        return;
    }

    if (op == "ping")
    {
        llHTTPResponse(requestId, 200, "NEURA_GATEWAY_PONG|build=" + (string)BUILD_NUMBER);
        return;
    }

    if (op == "poll")
    {
        llHTTPResponse(requestId, 200, pollReplies());
        return;
    }

    if (op == "sync")
    {
        syncAll();
        llHTTPResponse(requestId, 202, "NEURA_GATEWAY_SYNCING");
        return;
    }

    if (op == "reload")
    {
        setMedia();
        syncAll();
        llHTTPResponse(requestId, 202, "NEURA_GATEWAY_RELOADING");
        return;
    }

    if (op == "message")
    {
        if (routeMessage(message))
        {
            llHTTPResponse(requestId, 202, "NEURA_GATEWAY_SENT|" + commandName(message));
            return;
        }

        llHTTPResponse(requestId, 400, "NEURA_GATEWAY_UNKNOWN_MESSAGE|" + commandName(message));
        return;
    }

    if (op == "wallet-command")
    {
        if (command == "") command = "refresh";
        llMessageLinked(LINK_SET, LM_NEURA_WALLET_READY, command, llGetOwner());
        llHTTPResponse(requestId, 202, "NEURA_GATEWAY_WALLET_SENT|" + command);
        return;
    }

    if (op == "ui-command")
    {
        if (command == "") command = message;
        llMessageLinked(LINK_SET, LM_NEURA_HUD_RESIZER, command, llGetOwner());
        llHTTPResponse(requestId, 202, "NEURA_GATEWAY_UI_SENT|" + commandName(command));
        return;
    }

    llHTTPResponse(requestId, 400, "NEURA_GATEWAY_UNKNOWN_OP|" + op);
}

default
{
    state_entry()
    {
        llClearLinkMedia(mediaLink(), mediaFace());
        requestBridgeUrl();
        llOwnerSay(DISPLAY_TITLE + " online | Build " + (string)BUILD_NUMBER + " | requesting media bridge URL");
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    attach(key id)
    {
        if (id != NULL_KEY) setMedia();
    }

    touch_start(integer total)
    {
        if (llDetectedKey(0) == llGetOwner()) setMedia();
    }

    http_request(key requestId, string method, string body)
    {
        string query;

        if (requestId == gUrlRequest)
        {
            if (method == URL_REQUEST_GRANTED)
            {
                gBridgeUrl = body;
                llOwnerSay(DISPLAY_TITLE + " connected. Media URL ready.");
                setMedia();
                syncAll();
                return;
            }

            if (method == URL_REQUEST_DENIED)
            {
                llOwnerSay(DISPLAY_TITLE + " URL denied: " + body);
                return;
            }
        }

        if (method == "GET")
        {
            query = llGetHTTPHeader(requestId, "x-query-string");
            handleOp(query, requestId);
            return;
        }

        if (method == "POST")
        {
            handleOp(body, requestId);
            return;
        }

        llHTTPResponse(requestId, 405, "NEURA_GATEWAY_METHOD_NOT_ALLOWED");
    }

    link_message(integer sender, integer number, string message, key id)
    {
        if (id != llGetOwner()) return;

        if (number == LM_MEMORY_SYNC)
        {
            if (message == "hud-open") setMedia();
            return;
        }

        if (isReplyMessage(message)) queueReply(message);
    }

    changed(integer change)
    {
        if (change & (CHANGED_OWNER | CHANGED_REGION_START)) llResetScript();
    }
}
