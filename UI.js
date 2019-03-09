let searchResultsDiv;
let searchResultButtons;

let clipboard = document.createElement("textarea");
// nice clipboard
clipboard.style = "opacity: 0; width: 0px; height: 0px; position: absolute; left: -9999px;";
clipboard.readOnly = true;
document.getElementsByTagName("body")[0].appendChild(clipboard);

function CopyText(text)
{
    clipboard.value = text;
    clipboard.select();
    document.execCommand("copy");
    clipboard.selectionStart = clipboard.selectionEnd;
}

let searchMask = 1;
function SetSearchMask(mask, add)
{
    if (add)
        searchMask |= mask;
    else
        searchMask &= ~mask;
}

let nodeSearchData = [];
const searchMaxCount = 5;
function UpdateSearchResults(ev)
{
    let pattern = ev.target.value.toLowerCase();

    if (pattern === "")
    {
        searchResultsDiv.className = "search_results_hidden";
        return;
    }
    else
        searchResultsDiv.className = "search_results_visible";

    let results = Search(pattern);
    let keys = Object.keys(results);

    if (keys.length == 0)
    {
        let current = searchResultButtons[0];
        current.innerHTML = "No results";
        current.disabled = true;

        for (let i = 1; i < searchMaxCount; ++i)
        {
            searchResultButtons[i].style.display = "none";
        }
    }
    else
    {
        searchResultButtons[0].disabled = false;

        for (let i = 0; i < keys.length; ++i)
        {
            let current = searchResultButtons[i];
            let currentNode = results[keys[i]];
            current.nodePubKey = currentNode["pub_key"];
            current.innerHTML = currentNode["alias_htmlEscaped"];
            current.style.display = "";
        }

        for (let i = keys.length; i < searchMaxCount; ++i)
        {
            searchResultButtons[i].style.display = "none";
        }
    }
}

function Search(pattern)
{
    if (pattern === "")
        return [];

    let matches = {};

    // default search is faster for short strings
    let count = 0;
    if (pattern.length < 4)
    {
        for (let i = 0; i < nodeSearchData.length; ++i)
        {
            let data = nodeSearchData[i];
            if (!(data[2] & searchMask))
                continue;

            let searchStr = data[1];
            if (searchStr.search(pattern) != -1)
            {
                let node = data[0];

                if (!(node["pub_key"] in matches))
                {
                    matches[node["pub_key"]] = node;
                    if (++count == searchMaxCount)
                        break;
                }
            }
        }

        return matches;
    }

    const patternData = {};
    const patternLength = pattern.length;
    for (let i = 0; i < patternLength; ++i)
    {
        let char = pattern[i];
        let index = patternLength - i - 1;
        patternData[char] = index < 1 ? 1 : index;
    }

    for (let i = 0; i < nodeSearchData.length; ++i)
    {
        let data = nodeSearchData[i];
        if (!(data[2] & searchMask))
            continue;
        
        let searchStr = data[1];
        let textIndex = patternLength - 1;
        let patternIndex = patternLength - 1;

        let matchingCharacters = 0;

        while (textIndex < searchStr.length)
        {
            let char = searchStr[textIndex - matchingCharacters];
            
            if (pattern[patternIndex - matchingCharacters] === char)
            {
                ++matchingCharacters;

                if (matchingCharacters == patternLength)
                {
                    let node = data[0];
    
                    if (!(node["pub_key"] in matches))
                    {
                        matches[node["pub_key"]] = node;
                        if (++count == searchMaxCount)
                            return matches;
                    }

                    break;
                }
            }
            else
            {
                patternIndex = patternLength - 1;
                let skipCount = patternData[char];
                if (!skipCount)
                    skipCount = patternLength;
                
                skipCount -= matchingCharacters;
                matchingCharacters = 0;

                textIndex += skipCount < 1 ? 1 : skipCount;
            }
        }
    }

    return matches;
}

function SearchStop()
{
    searchResultsDiv.className = "search_results_hidden";
}

let connectionCodeToCopy;
let timeoutId = -1;
function CopyConnectionCode(ev)
{
    CopyText(connectionCodeToCopy);

    if (timeoutId !== -1)
        return;

    let button = ev.target;
    timeoutId = window.setTimeout(function()
    {
        timeoutId = -1;
        button.innerHTML = "Copy connection code";
    }, 2000);

    button.innerHTML = "Copied!";
}

function SelectNode(node, doMoveToNode)
{
    if (!node)
    {
        // shold not happen
        return;
    }
    
    if (timeoutId !== -1)
    {
        window.clearInterval(timeoutId);
        timeoutId = -1;
        document.getElementById("copy_code_button").innerHTML = "Copy connection code";
    }

    DeselectNode();

    selectedNode = node;

    let nodeDetailsDiv = document.getElementById("node_details");
    nodeDetailsDiv.className = "node_details_visible";

    let nodeDetailsAlias = document.getElementById("node_details_alias");
    nodeDetailsAlias.innerHTML = node["hasNoAlias"] ? "(not set)" : node["alias_htmlEscaped"];
    
    let nodeDetailsPubkey = document.getElementById("node_details_pubkey");
    nodeDetailsPubkey.innerHTML = node["pub_key"];
    
    let nodeDetailsIP = document.getElementById("node_details_ip");

    let copyConnectionCodeButton = document.getElementById("copy_code_button");
    if (node["addresses"].length != 0)
    {
        nodeDetailsIP.innerHTML = node["addresses"][0]["addr"];
        copyConnectionCodeButton.disabled = false;
        connectionCodeToCopy = node["pub_key"] + "@" + node["addresses"][0]["addr"];
    }
    else
    {
        nodeDetailsIP.innerHTML = "Unknown";
        copyConnectionCodeButton.disabled = true;
    }
    
    let channelCount = Object.keys(node["channels"]).length;
    document.getElementById("node_details_numchannels").innerHTML = channelCount;
    document.getElementById("node_details_capacity").innerHTML = node["capacity"].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " sat";
    
    if (doMoveToNode)
        MoveToNode(node);

    SetNodeUVs(node["renderData"]["order"] * 108, true);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, texBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, nodeUVs, ctx.STATIC_DRAW);
    Changed();
}

function DeselectNode()
{
    if (!selectedNode)
        return;

    let nodeDetailsDiv = document.getElementById("node_details");
    nodeDetailsDiv.className = "node_details_hidden";
    
    SetNodeUVs(selectedNode["renderData"]["order"] * 108, false);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, texBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, nodeUVs, ctx.STATIC_DRAW);
    Changed();

    selectedNode = undefined;
}

function ShowChannelInfo(show = true)
{
    document.getElementById("current_channel_info_overlay").className = show ? "search_options_overlay_visible" : "search_options_overlay_hidden";
    if (!show)
        return;

    let currentChannel = allChannels[this.channelID];
    let node1 = allNodes[currentChannel["node1_pub"]];
    let node2 = allNodes[currentChannel["node2_pub"]];

    document.getElementById("current_channel_id").innerHTML = this.channelID;
    document.getElementById("current_channel_node1").innerHTML = node1["alias_htmlEscaped"];
    document.getElementById("current_channel_node2").innerHTML = node2["alias_htmlEscaped"];
    document.getElementById("current_channel_capacity").innerHTML = currentChannel["capacity"].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " sat";
    document.getElementById("current_channel_lastupdate").innerHTML = new Date(currentChannel["last_update"] * 1000)
                                                                      .toLocaleTimeString(navigator.language, {"year" : "numeric", "month": "short", "day": "2-digit" ,"weekday" : "short"});
}

function ShowChannels(show)
{
    document.getElementById("channels_overlay").className = show ? "search_options_overlay_visible" : "search_options_overlay_hidden";

    if (!selectedNode)
        return;

    let channels = selectedNode["channels"];
    let channelCount = Object.keys(channels).length;

    let channelListDiv = document.getElementById("channels_list");
    let currentCount = channelListDiv.childElementCount;

    if (currentCount < channelCount)
    {
        for (let i = currentCount; i < channelCount; ++i)
        {
            let current = document.createElement("button");
            current.className = "channels_list_element";
            current.onclick = ShowChannelInfo;
            channelListDiv.appendChild(current);
        }
    }

    let idx = 0;

    let selectedNodePubkey = selectedNode["pub_key"];
    for (let ch in channels)
    {
        let current = channelListDiv.children[idx];
        let currentChannel = channels[ch];
        current.innerHTML = ch + "&nbsp;&nbsp;&nbsp;other node: " +
                            allNodes[selectedNodePubkey === currentChannel["node2_pub"] ? currentChannel["node1_pub"] : currentChannel["node2_pub"]]["alias_htmlEscaped"];
        current.channelID = ch;
        current.style.display = "table";
        ++idx;
    }

    for (let i = idx; i < currentCount; ++i)
        channelListDiv.children[i].style.display = "none";
}

window.addEventListener("load", function()
{
    searchResultsDiv = document.getElementById("search_results");
    searchResultButtons = [];

    for (let i = 0; i < searchMaxCount; ++i)
    {
        let current = document.createElement("button");
        current.className = "search_result_element";
        current.onclick = function()
        {
            SelectNode(allNodes[current.nodePubKey], true);
        };

        searchResultButtons.push(current);
        searchResultsDiv.appendChild(current);
    }
});