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

let nodeSearchData = {};
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
            current.innerHTML = currentNode["alias"];
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
        for (let searchStr in nodeSearchData)
        {
            if (searchStr.search(pattern) != -1)
            {
                let node = nodeSearchData[searchStr];

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

    for (let searchStr in nodeSearchData)
    {
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
                    let node = nodeSearchData[searchStr];
    
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

function SelectNode(selectedNode, doMoveToNode)
{
    if (!selectedNode)
    {
        // shold not happen
        return;
    }

    let nodeDetailsDiv = document.getElementById("node_details");
    nodeDetailsDiv.className = "node_details_visible";

    let nodeDetailsAlias = document.getElementById("node_details_alias");
    nodeDetailsAlias.innerHTML = selectedNode["hasNoAlias"] ? "(not set)" : selectedNode["alias"];
    
    let nodeDetailsPubkey = document.getElementById("node_details_pubkey");
    nodeDetailsPubkey.innerHTML = selectedNode["pub_key"];
    
    if (selectedNode["addresses"].length != 0)
    {
        let nodeDetailsPubkey = document.getElementById("node_details_ip");
        nodeDetailsPubkey.innerHTML = selectedNode["addresses"][0]["addr"];
    }
    
    if (doMoveToNode)
        MoveToNode(selectedNode);
}

function DeselectNode()
{
    let nodeDetailsDiv = document.getElementById("node_details");
    nodeDetailsDiv.className = "node_details_hidden";
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