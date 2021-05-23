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
        searchResultsDiv.className = "search-results-hidden";
        return;
    }
    else
        searchResultsDiv.className = "search-results-visible";

    let results = Search(pattern);
    let keys = Object.keys(results);

    if (keys.length == 0)
    {
        let current = searchResultButtons[0];
        current.innerText = "No results";
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
            current.innerText = currentNode["alias"];
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
    searchResultsDiv.className = "search-results-hidden";
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
        button.innerText = "Copy connection code";
    }, 2000);

    button.innerText = "Copied!";
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
        document.getElementById("copy-code-button").innerText = "Copy connection code";
    }

    DeselectNode();

    selectedNode = node;

    let nodeDetailsDiv = document.getElementById("node-details");
    nodeDetailsDiv.className = "node-details-visible";

    let nodeDetailsAlias = document.getElementById("node-details-alias");
    nodeDetailsAlias.innerText = node["hasNoAlias"] ? "(not set)" : node["alias"];

    let nodeDetailsPubkey = document.getElementById("node-details-pubkey");
    nodeDetailsPubkey.innerText = node["pub_key"];

    let nodeDetailsIP = document.getElementById("node-details-ip");

    let copyConnectionCodeButton = document.getElementById("copy-code-button");
    if (node["addresses"].length != 0)
    {
        nodeDetailsIP.innerText = node["addresses"][0]["addr"];
        copyConnectionCodeButton.disabled = false;
        connectionCodeToCopy = node["pub_key"] + "@" + node["addresses"][0]["addr"];
    }
    else
    {
        nodeDetailsIP.innerText = "Unknown";
        copyConnectionCodeButton.disabled = true;
    }

    let channelCount = Object.keys(node["channels"]).length;
    document.getElementById("node-details-numchannels").innerText = channelCount;
    document.getElementById("node-details-capacity").innerText = node["capacity"].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " sat";

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

    let nodeDetailsDiv = document.getElementById("node-details");
    nodeDetailsDiv.className = "node-details-hidden";

    SetNodeUVs(selectedNode["renderData"]["order"] * 108, false);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, texBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, nodeUVs, ctx.STATIC_DRAW);
    Changed();

    selectedNode = undefined;
}

function JumpToNodeFromChannels(element)
{
    document.getElementById("current-channel-info-overlay").className = "search-options-overlay-hidden";
    document.getElementById("channels-overlay").className = "search-options-overlay-hidden";
    SelectNode(allNodes[element.nodeID], true);
}

function ShowChannelInfo(show = true)
{
    document.getElementById("current-channel-info-overlay").className = show ? "search-options-overlay-visible" : "search-options-overlay-hidden";
    if (!show)
        return;

    let currentChannel = allChannels[this.channelID];
    let node1 = allNodes[currentChannel["node1_pub"]];
    let node2 = allNodes[currentChannel["node2_pub"]];

    document.getElementById("current-channel-id").innerText = this.channelID;

    let node1Element = document.getElementById("current-channel-node1");
    node1Element.innerText = node1["alias"];
    node1Element.nodeID = currentChannel["node1_pub"];

    let node2Element = document.getElementById("current-channel-node2");
    node2Element.innerText = node2["alias"];
    node2Element.nodeID = currentChannel["node2_pub"];

    document.getElementById("current-channel-capacity").innerText = currentChannel["capacity"].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " sat";
    document.getElementById("current-channel-lastupdate").innerText = new Date(currentChannel["last-update"] * 1000)
                                                                      .toLocaleTimeString(navigator.language, {"year" : "numeric", "month": "short", "day": "2-digit" ,"weekday" : "short"});
}

function ShowChannels(show)
{
    document.getElementById("channels-overlay").className = show ? "search-options-overlay-visible" : "search-options-overlay-hidden";

    if (!selectedNode || !show)
        return;

    let channels = selectedNode["channels"];
    let channelCount = Object.keys(channels).length;

    let channelListDiv = document.getElementById("channels-list");
    let currentCount = channelListDiv.childElementCount;

    if (currentCount < channelCount)
    {
        for (let i = currentCount; i < channelCount; ++i)
        {
            let current = document.createElement("button");
            current.className = "channels-list-element";
            current.onclick = ShowChannelInfo;

            let idDiv = document.createElement("div");
            idDiv.className = "channels-list-element-id";
            current.appendChild(idDiv);

            let nameDiv = document.createElement("div");
            nameDiv.className = "channels-list-element-name";
            current.appendChild(nameDiv);

            channelListDiv.appendChild(current);
        }
    }

    let idx = 0;

    let selectedNodePubkey = selectedNode["pub_key"];
    for (let ch in channels)
    {
        let current = channelListDiv.children[idx];
        let currentChannel = channels[ch];

        let idDiv = current.children[0];
        let nameDiv = current.children[1];
        idDiv.innerText = ch;
        nameDiv.innerText = allNodes[selectedNodePubkey === currentChannel["node2_pub"] ? currentChannel["node1_pub"] : currentChannel["node2_pub"]]["alias"];
        current.channelID = ch;
        current.style.display = "table";
        ++idx;
    }

    for (let i = idx; i < currentCount; ++i)
        channelListDiv.children[i].style.display = "none";
}

window.addEventListener("load", function()
{
    searchResultsDiv = document.getElementById("search-results");
    searchResultButtons = [];

    for (let i = 0; i < searchMaxCount; ++i)
    {
        let current = document.createElement("button");
        current.className = "search-result-element";
        current.onclick = function()
        {
            SelectNode(allNodes[current.nodePubKey], true);
        };

        searchResultButtons.push(current);
        searchResultsDiv.appendChild(current);
    }
});