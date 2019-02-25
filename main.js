
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("webgl");

const textCanvas = document.createElement("canvas");
const tctx = textCanvas.getContext("2d");
//document.getElementsByTagName("body")[0].appendChild(textCanvas);
//textCanvas.style = "border: 2px solid red; z-index: 1;";
const baseFontSize = 48;

const coordMultiplier = 1; // reduce this for increased precision

let windowWidth, windowHeight, windowWidthInverse, windowHeightInverse;
let prevWindowWidth = 0, prevWindowHeight = 0;
function Resized()
{
    prevWindowWidth = windowWidth;
    prevWindowHeight = windowHeight;
    windowWidth = document.documentElement.clientWidth;
    windowHeight = document.documentElement.clientHeight;
    windowWidthInverse = 1 / windowWidth;
    windowHeightInverse = 1 / windowHeight;
    canvas.width = windowWidth;
    canvas.height = windowHeight;
    ctx.viewport(0, 0, windowWidth, windowHeight);

    //textCanvas.width = windowWidth;
    //textCanvas.height = windowHeight;

    if (webglInitialized)
    {
        FuckingWindowWasFuckingResizedSoFuckingRecalculateTheFuckingVertices();
        FuckingWindowWasFuckingResizedSoFuckingRecalculateTheFuckingVerticesOfTheFuckingLines();
        FuckingWindowWasFuckingResizedSoFuckingRecalculateTheFuckingVerticesOfTheFuckingTexts();
    }
    
    Changed();
}

function PageLoaded()
{
    if (window.location.protocol === "file:")
    {
        let script = document.createElement("script");
        script.onload = function()
        {
            tempNodes = __nodes["nodes"];
            tempChannels = __nodes["edges"];
    
            Resized();
            CalculateNodeData();
            CalculateNodePositions();
            RenderTexts();
            CalculateLines();
            WebglInit();
            let loadingOverlayStyle = document.getElementById("loading_overlay").style;
            loadingOverlayStyle.opacity = "0";
    
            window.setTimeout(function()
            {
                loadingOverlayStyle.display = "none";
            }, 300);
        };
        script.src = "graph.js";
        document.getElementsByTagName("body")[0].appendChild(script);
    }
    else
    {
        let request  = new XMLHttpRequest();
        
        let textDiv = document.getElementById("loading_text2");
        request.onprogress = function(ev)
        {
            textDiv.innerHTML = (ev.loaded / 1048576).toFixed(1) + "MB loaded";
        };

        let errorFunction = function()
        {
            let loadingText = document.getElementById("loading_text");
            loadingText.innerHTML = "Error";
            textDiv.innerHTML = "See console for details";
        };

        request.onload = function(ev)
        {
            if (ev.target.readyState != 4 || (ev.target.status != 200 && ev.target.status != 0))
            {
                errorFunction();
                return;
            }

            window.requestAnimationFrame(function()
            {
                textDiv.innerHTML = "Processing data...";
                window.requestAnimationFrame(function()
                {
                    let responseData = JSON.parse(ev.target.responseText);

                    tempNodes = responseData["nodes"];
                    tempChannels = responseData["edges"];
                    Resized();
                    CalculateNodeData();
                    CalculateNodePositions();
                    RenderTexts();
                    CalculateLines();
                    WebglInit();
                    let loadingOverlayStyle = document.getElementById("loading_overlay").style;
                    loadingOverlayStyle.opacity = "0";

                    window.setTimeout(function()
                    {
                        loadingOverlayStyle.display = "none";
                    }, 300);
                });
            });
        };

        request.onerror = errorFunction;

        request.open("GET", "https://rompert.com/networkgraphv2", true);
        request.send();
    }
}

window.addEventListener("resize", Resized);
window.addEventListener("load", PageLoaded);

let isCameraDragging = false;
let dragged = false; // <-- true if the camera was actually moved
let isNodeDragging = false;
let interactLocked = false;
let draggedNode = undefined;
let nodeDragStartX = 0, nodeDragStartY = 0;
canvas.addEventListener("mousedown", function(ev)
{
    ev.preventDefault();

    if (interactLocked)
        return;
    
    if (ev.button === 2)
        isCameraDragging = true;
    else if (ev.button === 0)
    {
        let clickedNode = GetNodeFromMousePos(ev.clientX, ev.clientY);
        if (clickedNode)
        {
            SelectNode(clickedNode, false);
            isNodeDragging = true;
            draggedNode = clickedNode;
            nodeDragStartX = clickedNode["renderData"]["posX"];
            nodeDragStartY = clickedNode["renderData"]["posY"];
        }
        else
        {
            DeselectNode();
        }
    }

});
window.addEventListener("mouseup", function(ev)
{
    if (interactLocked)
        return;
    
    if (ev.button === 2)
    {
        isCameraDragging = false;

        //if (!dragged)
        //{
        //    let clickedNode = GetNodeFromMousePos(ev.clientX, ev.clientY);
        //    if (clickedNode)
        //        console.log("clicked node: " + clickedNode["alias"]);
        //}

        dragged = false;
    }
    else if (ev.button === 0)
    {
        if (isNodeDragging)
            EndDraggingNode(draggedNode);
    }
});
window.addEventListener("mousemove", function(ev)
{
    if (interactLocked)
        return;

    if (isCameraDragging)
    {
        dragged = true;
        CameraDrag(ev.movementX, ev.movementY);
    }
    else if (isNodeDragging)
        DragNode(draggedNode, ev.movementX, ev.movementY);
});
canvas.addEventListener("wheel", function(ev)
{
    if (interactLocked)
        return;
    
    // positive: zoom out, negative: zoom in
    let prevZoom = zoom;
    if (ev.deltaY > 0)
        zoom *= 0.9523809523809523; // equivalent to /= 1.05;
    else
        zoom *= 1.05;

    if (zoom > maxZoom)
        zoom = maxZoom;
    else if (zoom < minZoom)
        zoom = minZoom;
    
    cameraOffsetX += (windowWidth * 0.5 - ev.clientX) * (1 / prevZoom - 1 / zoom);
    cameraOffsetY += (windowHeight * 0.5 - ev.clientY) * (1 / zoom - 1 / prevZoom);

    ctx.uniform3f(cameraOffsetLoc, cameraOffsetX * 2, cameraOffsetY * 2, zoom);
    Changed();
});

let cameraOffsetX = 0, cameraOffsetY = 0;
function CameraDrag(dx, dy)
{
    cameraOffsetX += dx / zoom;
    cameraOffsetY -= dy / zoom;
    
    ctx.uniform3f(cameraOffsetLoc, cameraOffsetX * 2, cameraOffsetY * 2, zoom);
    Changed();
}

function DragNode(node, dx, dy)
{
    let nodeRenderData = node["renderData"];
    // update box position
    let startIndex = nodeRenderData["order"] * 108;

    let prevX = nodeRenderData["posX"], prevY = nodeRenderData["posY"];

    let posX = prevX + dx / zoom;
    let posY = prevY + dy / zoom;

    nodeRenderData["posX"] = posX;
    nodeRenderData["posY"] = posY;

    posX *= 2;
    posY *= -2;

    for (let i = 0; i < 54; ++i)
    {
        vertexOffsets[startIndex++] = posX;
        vertexOffsets[startIndex++] = posY;
    }
    
    ctx.bindBuffer(ctx.ARRAY_BUFFER, offsetBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, vertexOffsets, ctx.STATIC_DRAW);

    // update text position
    let currentOffsetX = posX;
    let currentOffsetY = posY - (baseFontSize * 2 + textPaddingY * 2 + 30) * coordMultiplier;

    let startIndex2 = nodeRenderData["atlasIndex"];
    let textOffsetBufferData = textAtlases[nodeRenderData["atlasID"]]["offsetBufferData"];
    for (let i = 0; i < 6; ++i)
    {
        textOffsetBufferData[startIndex2++] = currentOffsetX;
        textOffsetBufferData[startIndex2++] = currentOffsetY;
    }

    ctx.bindBuffer(ctx.ARRAY_BUFFER, textAtlases[nodeRenderData["atlasID"]]["offsetBuffer"]);
    ctx.bufferData(ctx.ARRAY_BUFFER, textOffsetBufferData, ctx.STATIC_DRAW);
    
    // update lines (channels)
    FuckingWindowWasFuckingResizedSoFuckingRecalculateTheFuckingVerticesOfTheFuckingLines(node);

    Changed();
}

function EndDraggingNode(node)
{
    isNodeDragging = false;
    draggedNode = undefined;

    if (!node)
        return;

    // update grid if needed
    let nodeRenderData = node["renderData"];
    let prevX = nodeDragStartX, prevY = nodeDragStartY;

    let posX = nodeRenderData["posX"], posY = nodeRenderData["posY"];

    let prevEndPosX = prevX + boxSizeX * 2 * coordMultiplier + nodeRenderData["textWidth"];
    let prevEndPosY = prevY + (boxSizeY * 2 + boxHeight) * coordMultiplier;

    let newEndPosX = posX + boxSizeX * 2 * coordMultiplier + nodeRenderData["textWidth"];
    let newEndPosY = posY + (boxSizeY * 2 + boxHeight) * coordMultiplier;

    let prevGridStartX = (prevX >> gridSize),
        prevGridStartY = (prevY >> gridSize),
        prevGridEndX = (prevEndPosX >> gridSize),
        prevGridEndY = (prevEndPosY >> gridSize);
    
    let newGridStartX = (posX >> gridSize),
        newGridStartY = (posY >> gridSize),
        newGridEndX = (newEndPosX >> gridSize),
        newGridEndY = (newEndPosY >> gridSize);
    
    if (prevGridStartX != newGridStartX || prevGridStartY != newGridStartY || prevGridEndX != newGridEndX || prevGridEndY != newGridEndY)
    {
        let nodePubKey = node["pub_key"];
        for (let x = prevGridStartX; x <= prevGridEndX; ++x)
        {
            for (let y = prevGridStartY; y <= prevGridEndY; ++y)
            {
                let gridKey = x + " " + y;

                let currentGridElements = grid[gridKey];

                if (currentGridElements)
                    delete currentGridElements[nodePubKey];
            }
        }
        
        for (let x = newGridStartX; x <= newGridEndX; ++x)
        {
            for (let y = newGridStartY; y <= newGridEndY; ++y)
            {
                let gridKey = x + " " + y;

                let currentGridElements = grid[gridKey];
                if (currentGridElements === undefined)
                {
                    currentGridElements = {};
                    grid[gridKey] = currentGridElements;
                }

                currentGridElements[nodePubKey] = node;
            }
        }
    }
}

function MoveToNode(node)
{
    isCameraDragging = false;
    EndDraggingNode();
    interactLocked = true;

    let startZoom = zoom;
    let targetZoom = 1 / coordMultiplier;

    let targetPosX = node["renderData"]["posX"] + (-windowWidth * 0.5 + node["renderData"]["textWidth"] * 0.5 + textPaddingX) * coordMultiplier;
    let targetPosY = node["renderData"]["posY"] + (-windowHeight * 0.5 + (boxSizeY + boxHeight * 0.5)) * coordMultiplier;
    let startPosX = -cameraOffsetX, startPosY = cameraOffsetY;
    
    const steps = 50;
    let currentStepMove = 0;
    let currentStepZoom = -1;

    const coordThreshold = 0.1 / coordMultiplier;
    if (Math.abs(targetPosX - startPosX) < coordThreshold && Math.abs(targetPosY - startPosY) < coordThreshold)
        currentStepMove = steps + 1;

    if (Math.abs(startZoom - targetZoom) < 0.01)
        currentStepZoom = steps + 1;

    function Update()
    {
        if (currentStepMove <= steps)
        {
            let percent = currentStepMove / steps;
            let t = Math.sin((percent - 0.5) * Math.PI) * 0.5 + 0.5;
            
            cameraOffsetX = -(startPosX + (targetPosX - startPosX) * t);
            cameraOffsetY = startPosY + (targetPosY - startPosY) * t;

            if (++currentStepMove == 40)
            {
                if (currentStepZoom == -1)
                    currentStepZoom = 0;
            }
        }

        if (currentStepZoom != -1 && currentStepZoom <= steps)
        {
            let percent = currentStepZoom / steps;
            let t = Math.sin((percent - 0.5) * Math.PI) * 0.5 + 0.5;
            
            zoom = startZoom + (targetZoom - startZoom) * t;

            ++currentStepZoom;
        }

        if (currentStepZoom > steps && currentStepMove > steps)
            interactLocked = false;
        else
            window.requestAnimationFrame(Update);
        
        ctx.uniform3f(cameraOffsetLoc, cameraOffsetX * 2, cameraOffsetY * 2, zoom);
        Changed();
    }

    Update();
}

function GetNodeFromMousePos(x, y)
{
    let startX = (windowWidth * 0.5 - windowWidth * 0.5 / (zoom * coordMultiplier));
    let endX = (windowWidth * 0.5 + windowWidth * 0.5 / (zoom * coordMultiplier));
    let percentX = x / windowWidth;
    let posX = ((endX - startX) * percentX + startX) * coordMultiplier - cameraOffsetX;

    let startY = (windowHeight * 0.5 - windowHeight * 0.5 / (zoom * coordMultiplier));
    let endY = (windowHeight * 0.5 + windowHeight * 0.5 / (zoom * coordMultiplier));
    let percentY = y / windowHeight;
    let posY = ((endY - startY) * percentY + startY) * coordMultiplier + cameraOffsetY;

    let gridX = posX >> gridSize, gridY = posY >> gridSize;
    let currentGridElements = grid[gridX + " " + gridY];
    if (currentGridElements !== undefined)
    {
        for (let node in currentGridElements)
        {
            let currentNodeData = currentGridElements[node]["renderData"];
            
            let startPosX = currentNodeData["posX"], startPosY = currentNodeData["posY"];
            let endPosX = startPosX + (textPaddingX * 2 + currentNodeData["textWidth"]) * coordMultiplier;
            let endPosY = startPosY + (boxSizeY * 2 + boxHeight) * coordMultiplier;
            
            if (startPosY < posY && endPosY > posY && startPosX < posX && endPosX > posX)
                return currentGridElements[node];
        }
    }

    return null;
}

const allNodes = {};
const allNodesByIndex = [];
const allChannels = {};
const allChannelsByIndex = [];
let allNodesSortedByChannelCount;
let tempNodes, tempChannels;
let allNodeCount = 0;
let allChannelCount = 0;
function CalculateNodeData()
{
    tctx.font = baseFontSize + "px Verdana";
    for (let i = 0; i < tempNodes.length; ++i)
    {
        let currentNode = tempNodes[i];
        let pubkey = currentNode["pub_key"];

        if (pubkey !== undefined && pubkey !== "")
        {
            allNodes[pubkey] = currentNode;
            currentNode["channels"] = {};
            allNodesByIndex.push(currentNode);

            currentNode.renderData = {};
            currentNode.renderData["order"] = allNodeCount;

            if (currentNode["alias"] === "")
            {
                currentNode["alias"] = pubkey.substr(0, 12);
                currentNode["hasNoAlias"] = true;
            }

            nodeSearchData[currentNode["alias"].toLowerCase()] = currentNode;

            // enabling this will allow searching for pubkeys and addresses

            //nodeSearchData[pubkey] = currentNode;
            //
            //let addresses = currentNode["addresses"];
            //if (addresses)
            //{
            //    for (let j = 0; j < addresses.length; ++j)
            //        nodeSearchData[addresses[j]["addr"]] = currentNode;
            //}

            currentNode.renderData["textWidth"] = tctx.measureText(currentNode["alias"]).width;
            ++allNodeCount;
        }
    };

    for (let i = 0; i < tempChannels.length; ++i)
    {
        let currentChannel = tempChannels[i];
        let channelId = currentChannel["channel_id"];
        let node1 = currentChannel["node1_pub"];
        let node2 = currentChannel["node2_pub"];

        if (channelId !== undefined && channelId !== "" &&
            node1 !== undefined && node1 !== "" &&
            node2 !== undefined && node2 !== "" &&
            allNodes.hasOwnProperty(node1) && allNodes.hasOwnProperty(node2))
        {
            allNodes[node1].channels[channelId] = currentChannel;
            allNodes[node2].channels[channelId] = currentChannel;
            allChannels[channelId] = currentChannel;

            allChannelsByIndex[allChannelCount] = currentChannel;
            currentChannel["order"] = allChannelCount;
            ++allChannelCount;
        }
    }

    for (let i = 0; i < allNodeCount; ++i)
    {
        let currentNode = allNodesByIndex[i];
        currentNode["channelCount"] = Object.keys(currentNode.channels).length;
    }

    allNodesSortedByChannelCount = allNodesByIndex.slice();
    allNodesSortedByChannelCount.sort(function(a, b)
    {
        return b["channelCount"] - a["channelCount"];
    });
};

const grid = {};
const gridSize = 4; // 2^gridSize
function CalculateNodePositions()
{
    const coils = 100;
    const step = allNodeCount * 50 / (coils * 2 * Math.PI);
    const maxDist = 2000;
    const distanceMultiplier = 0.5;

    let theta = maxDist / step;

    for (let i = 0; i < allNodeCount; ++i)
    {
        let currentNode = allNodesSortedByChannelCount[i];

        let dist = step * theta;
        let around = theta;
        let posX = Math.cos(around) * dist * distanceMultiplier, posY = Math.sin(around) * dist * distanceMultiplier;

        theta += maxDist / dist;

        let renderData = currentNode["renderData"];
        renderData["posX"] = posX;
        renderData["posY"] = posY;

        let endPosX = posX + (boxSizeX * 2 + renderData["textWidth"]) * coordMultiplier;
        let endPosY = posY + (boxSizeY * 2 + boxHeight) * coordMultiplier;

        let gridStartX = (posX >> gridSize),
            gridStartY = (posY >> gridSize),
            gridEndX = (endPosX >> gridSize),
            gridEndY = (endPosY >> gridSize);

        for (let x = gridStartX; x <= gridEndX; ++x)
        {
            for (let y = gridStartY; y <= gridEndY; ++y)
            {
                let gridKey = x + " " + y;

                let currentGridElements = grid[gridKey];
                if (currentGridElements === undefined)
                {
                    currentGridElements = {};
                    grid[gridKey] = currentGridElements;
                }

                currentGridElements[currentNode["pub_key"]] = currentNode;
            }
        }
    }
}

function CalculateNodePositions2()
{
    const circleSize = 40000 * coordMultiplier;
    for (let i = 0; i < allNodeCount; ++i)
    {
        let currentNode = allNodesByIndex[i];

        currentNode.renderData["posX"] = Math.cos(i / allNodeCount * Math.PI * 2) * circleSize;
        currentNode.renderData["posY"] = Math.sin(i / allNodeCount * Math.PI * 2) * circleSize;
    }

    const target = 5000 * coordMultiplier;

    for (let c = 0; c < 20; ++c)
    {
        let newPositions = new Array(allNodeCount);
        for (let i = 0; i < allNodeCount; ++i)
        {
            let currentNode = allNodesByIndex[i];
            let currentPubkey = currentNode["pub_key"];

            let dx = 0, dy = 0;
            let posX = currentNode["renderData"]["posX"], posY = currentNode["renderData"]["posY"];
            for (let channel in currentNode.channels)
            {
                let ch = currentNode.channels[channel];
                let otherNode = allNodes[(ch["node1_pub"] == currentPubkey) ? ch["node2_pub"] : ch["node1_pub"]];
                
                let ox = otherNode["renderData"]["posX"], oy = otherNode["renderData"]["posY"];

                let distX = ox - posX, distY = oy - posY;
                let angle = Math.atan2(distY, distX);
                let x1 = Math.cos(angle) * target, y1 = Math.sin(angle) * target;

                let diffX = distX - x1, diffY = distY - y1;
                
                dx += diffX;
                dy += diffY;
            }

            dx *= 0.002;
            dy *= 0.002;

            newPositions[i] = [posX + dx, posY + dy];
        }

        for (let i = 0; i < allNodeCount; ++i)
        {
            let coord = newPositions[i];
            let currentNode = allNodesByIndex[i];
            currentNode["renderData"]["posX"] = coord[0];
            currentNode["renderData"]["posY"] = coord[1];
        }
    }

    for (let i = 0; i < allNodeCount; ++i)
    {
        let currentNode = allNodesByIndex[i];
        let renderData = currentNode["renderData"];
        let posX = renderData["posX"], posY = renderData["posY"];

        let endPosX = posX + (boxSizeX * 2 + renderData["textWidth"]) * coordMultiplier;
        let endPosY = posY + (boxSizeY * 2 + boxHeight) * coordMultiplier;

        let gridStartX = (posX >> gridSize),
            gridStartY = (posY >> gridSize),
            gridEndX = (endPosX >> gridSize),
            gridEndY = (endPosY >> gridSize);

        for (let x = gridStartX; x <= gridEndX; ++x)
        {
            for (let y = gridStartY; y <= gridEndY; ++y)
            {
                let gridKey = x + " " + y;

                let currentGridElements = grid[gridKey];
                if (currentGridElements === undefined)
                {
                    currentGridElements = {};
                    grid[gridKey] = currentGridElements;
                }

                currentGridElements[currentNode["pub_key"]] = currentNode;
            }
        }
    }
}

const lineData = {};
function CalculateLines()
{
    let vertexBufferData = new Float32Array(allChannelCount * 24);
    let texBufferData = new Float32Array(allChannelCount * 24);
    let colorBufferData = new Float32Array(allChannelCount * 48);

    let index = 0;
    for (let i = 0; i < allChannelCount; ++i)
    {
        for (let j = 0; j < 24; ++j)
            vertexBufferData[index + j] = 0;

        texBufferData[index] = 1;
        texBufferData[index + 1] = 0;
        texBufferData[index + 2] = 0;
        texBufferData[index + 3] = 1;
        texBufferData[index + 4] = 0;
        texBufferData[index + 5] = 0;
    
        texBufferData[index + 6] = 1;
        texBufferData[index + 7] = 0;
        texBufferData[index + 8] = 1;
        texBufferData[index + 9] = 1;
        texBufferData[index + 10] = 0;
        texBufferData[index + 11] = 1;
        
        texBufferData[index + 12] = 1;
        texBufferData[index + 13] = 0;
        texBufferData[index + 14] = 0;
        texBufferData[index + 15] = 1;
        texBufferData[index + 16] = 0;
        texBufferData[index + 17] = 0;
    
        texBufferData[index + 18] = 1;
        texBufferData[index + 19] = 0;
        texBufferData[index + 20] = 1;
        texBufferData[index + 21] = 1;
        texBufferData[index + 22] = 0;
        texBufferData[index + 23] = 1;

        index += 24;
    }

    CalculateLineColors(colorBufferData);

    let offsetBufferData = new Float32Array(allChannelCount * 24);

    let vertexBuffer = ctx.createBuffer();
    let texBuffer = ctx.createBuffer();
    let offsetBuffer = ctx.createBuffer();
    let colorBuffer = ctx.createBuffer();

    lineData.vertexBuffer = vertexBuffer;
    lineData.texBuffer = texBuffer;
    lineData.offsetBuffer = offsetBuffer;
    lineData.colorBuffer = colorBuffer;
    lineData.vertexCount = allChannelCount * 12;

    lineData.offsetBufferData = offsetBufferData;

    ctx.bindBuffer(ctx.ARRAY_BUFFER, vertexBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, vertexBufferData, ctx.STATIC_DRAW);

    ctx.bindBuffer(ctx.ARRAY_BUFFER, texBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, texBufferData, ctx.STATIC_DRAW);

    ctx.bindBuffer(ctx.ARRAY_BUFFER, colorBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, colorBufferData, ctx.STATIC_DRAW);

    // it wasn't actually resized here
    FuckingWindowWasFuckingResizedSoFuckingRecalculateTheFuckingVerticesOfTheFuckingLines();
}

const lineAlpha = 1;
function CalculateLineColors(colorBufferData)
{
    let colorBufferIndex = 0;
    for (let i = 0; i < allChannelCount; ++i)
    {
        let currentChannel = allChannelsByIndex[i];

        let color1 = allNodes[currentChannel["node1_pub"]]["color"];
        let color2 = allNodes[currentChannel["node2_pub"]]["color"];

        let r1 = Number.parseInt(color1.substr(1, 2), 16) / 255;
        let g1 = Number.parseInt(color1.substr(3, 2), 16) / 255;
        let b1 = Number.parseInt(color1.substr(5, 2), 16) / 255;

        let r2 = Number.parseInt(color2.substr(1, 2), 16) / 255;
        let g2 = Number.parseInt(color2.substr(3, 2), 16) / 255;
        let b2 = Number.parseInt(color2.substr(5, 2), 16) / 255;

        for (let j = 0; j < 6; ++j)
        {
            colorBufferData[colorBufferIndex++] = r1;
            colorBufferData[colorBufferIndex++] = g1;
            colorBufferData[colorBufferIndex++] = b1;
            colorBufferData[colorBufferIndex++] = lineAlpha;
        }
        
        for (let j = 0; j < 6; ++j)
        {
            colorBufferData[colorBufferIndex++] = r2;
            colorBufferData[colorBufferIndex++] = g2;
            colorBufferData[colorBufferIndex++] = b2;
            colorBufferData[colorBufferIndex++] = lineAlpha;
        }
    }
}

const lineWidth = 2 * coordMultiplier;
function FuckingWindowWasFuckingResizedSoFuckingRecalculateTheFuckingVerticesOfTheFuckingLines(updateOnlyThisNode)
{
    let offsetBufferData = lineData.offsetBufferData;
    let addY = (boxSizeY * 2 + boxHeight) * coordMultiplier;
    
    let currentlyUpdatedChannels = updateOnlyThisNode ? updateOnlyThisNode["channels"] : allChannels;

    for (let ch in currentlyUpdatedChannels)
    {
        let currentChannel = allChannels[ch];

        let node1 = allNodes[currentChannel["node1_pub"]];
        let node2 = allNodes[currentChannel["node2_pub"]];
        
        let vertexIndex = currentChannel["order"] * 24;

        let renderData1 = node1["renderData"], renderData2 = node2["renderData"];

        let startPosX1 = renderData1["posX"], startPosY1 = renderData1["posY"];
        let endPosX1 = startPosX1 + (boxSizeX * 2 + renderData1["textWidth"]) * coordMultiplier;
        let endPosY1 = startPosY1 + addY;

        let posX1 = (endPosX1 - startPosX1) * 0.5 + startPosX1;
        let posY1 = (endPosY1 - startPosY1) * 0.5 + startPosY1;
        
        let startPosX2 = renderData2["posX"], startPosY2 = renderData2["posY"];
        let endPosX2 = startPosX2 + (boxSizeX * 2 + renderData2["textWidth"]) * coordMultiplier;
        let endPosY2 = startPosY2 + addY;

        let posX2 = (endPosX2 - startPosX2) * 0.5 + startPosX2;
        let posY2 = (endPosY2 - startPosY2) * 0.5 + startPosY2;
        
        let angle = Math.atan2(posY2 - posY1, posX2 - posX1);

        let sin = Math.sin(angle), cos = Math.cos(angle);
        // bottom right
        let x1 = (posX1 + lineWidth * sin) * 2 - windowWidth * coordMultiplier;
        let y1 = (posY1 - lineWidth * cos) * -2 + windowHeight * coordMultiplier;
        
        // top right
        let x3 = (posX2 + lineWidth * sin) * 2 - windowWidth * coordMultiplier;
        let y3 = (posY2 - lineWidth * cos) * -2 + windowHeight * coordMultiplier;
        
        // bottom left
        let x2 = (posX1 - lineWidth * sin) * 2 - windowWidth * coordMultiplier;
        let y2 = (posY1 + lineWidth * cos) * -2 + windowHeight * coordMultiplier;
        
        // top left
        let x4 = (posX2 - lineWidth * sin) * 2 - windowWidth * coordMultiplier;
        let y4 = (posY2 + lineWidth * cos) * -2 + windowHeight * coordMultiplier;

        // bottom middle
        let x5 = x1 + (x3 - x1) * 0.5;
        let y5 = y1 + (y3 - y1) * 0.5;

        // top middle
        let x6 = x2 + (x4 - x2) * 0.5;
        let y6 = y2 + (y4 - y2) * 0.5;

        offsetBufferData[vertexIndex++] = x1;
        offsetBufferData[vertexIndex++] = y1;
        offsetBufferData[vertexIndex++] = x6;
        offsetBufferData[vertexIndex++] = y6;
        offsetBufferData[vertexIndex++] = x2;
        offsetBufferData[vertexIndex++] = y2;
        
        offsetBufferData[vertexIndex++] = x1;
        offsetBufferData[vertexIndex++] = y1;
        offsetBufferData[vertexIndex++] = x5;
        offsetBufferData[vertexIndex++] = y5;
        offsetBufferData[vertexIndex++] = x6;
        offsetBufferData[vertexIndex++] = y6;
        
        offsetBufferData[vertexIndex++] = x5;
        offsetBufferData[vertexIndex++] = y5;
        offsetBufferData[vertexIndex++] = x4;
        offsetBufferData[vertexIndex++] = y4;
        offsetBufferData[vertexIndex++] = x6;
        offsetBufferData[vertexIndex++] = y6;
        
        offsetBufferData[vertexIndex++] = x5;
        offsetBufferData[vertexIndex++] = y5;
        offsetBufferData[vertexIndex++] = x3;
        offsetBufferData[vertexIndex++] = y3;
        offsetBufferData[vertexIndex++] = x4;
        offsetBufferData[vertexIndex++] = y4;
    }
    
    ctx.bindBuffer(ctx.ARRAY_BUFFER, lineData.offsetBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, offsetBufferData, ctx.STATIC_DRAW);
}

function DrawLines()
{
    ctx.enableVertexAttribArray(vLoc);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, lineData.vertexBuffer);
    ctx.vertexAttribPointer(vLoc, 2, ctx.FLOAT, false, 0, 0);

    ctx.enableVertexAttribArray(tLoc);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, lineData.texBuffer);
    ctx.vertexAttribPointer(tLoc, 2, ctx.FLOAT, false, 0, 0);

    ctx.enableVertexAttribArray(offsetLoc);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, lineData.offsetBuffer);
    ctx.vertexAttribPointer(offsetLoc, 2, ctx.FLOAT, false, 0, 0);
    
    ctx.enableVertexAttribArray(colorLoc);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, lineData.colorBuffer);
    ctx.vertexAttribPointer(colorLoc, 4, ctx.FLOAT, false, 0, 0);
    
    ctx.bindTexture(ctx.TEXTURE_2D, whiteTexture);

    ctx.drawArrays(ctx.TRIANGLES, 0, lineData.vertexCount);
}

let changed = false;
let webglInitialized = false;
function Changed()
{
    if (changed)
        return;
    
    if (!webglInitialized)
    {
        window.requestAnimationFrame(Changed);
        return;
    }

    changed = true;
    Draw();
}

function Draw()
{
    if (!changed)
        return;

    changed = false;
    ctx.clear(ctx.COLOR_BUFFER_BIT);

    DrawLines();
    DrawNodes();
    DrawTexts();
}

function DrawNodes()
{
    ctx.enableVertexAttribArray(vLoc);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, vertexBuffer);
    ctx.vertexAttribPointer(vLoc, 2, ctx.FLOAT, false, 0, 0);

    ctx.enableVertexAttribArray(tLoc);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, texBuffer);
    ctx.vertexAttribPointer(tLoc, 2, ctx.FLOAT, false, 0, 0);

    ctx.enableVertexAttribArray(offsetLoc);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, offsetBuffer);
    ctx.vertexAttribPointer(offsetLoc, 2, ctx.FLOAT, false, 0, 0);
    
    ctx.enableVertexAttribArray(colorLoc);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, colorBuffer);
    ctx.vertexAttribPointer(colorLoc, 4, ctx.FLOAT, false, 0, 0);
    
    ctx.bindTexture(ctx.TEXTURE_2D, texture);

    ctx.drawArrays(ctx.TRIANGLES, 0, allNodeCount * 6 * 9);
}

let textPaddingX = 10, textPaddingY = 12;
function DrawTexts()
{
    for (let i = 0; i < textAtlasCount; ++i)
    {
        let currentData = textAtlases[i];

        ctx.enableVertexAttribArray(vLoc);
        ctx.bindBuffer(ctx.ARRAY_BUFFER, currentData["vertexBuffer"]);
        ctx.vertexAttribPointer(vLoc, 2, ctx.FLOAT, false, 0, 0);

        ctx.enableVertexAttribArray(tLoc);
        ctx.bindBuffer(ctx.ARRAY_BUFFER, currentData["uvBuffer"]);
        ctx.vertexAttribPointer(tLoc, 2, ctx.FLOAT, false, 0, 0);
        
        ctx.enableVertexAttribArray(offsetLoc);
        ctx.bindBuffer(ctx.ARRAY_BUFFER, currentData["offsetBuffer"]);
        ctx.vertexAttribPointer(offsetLoc, 2, ctx.FLOAT, false, 0, 0);
        
        ctx.enableVertexAttribArray(colorLoc);
        ctx.bindBuffer(ctx.ARRAY_BUFFER, currentData["colorBuffer"]);
        ctx.vertexAttribPointer(colorLoc, 4, ctx.FLOAT, false, 0, 0);

        ctx.bindTexture(ctx.TEXTURE_2D, currentData["texture"]);

        ctx.drawArrays(ctx.TRIANGLES, 0, currentData["count"]);
    }
}

/*
function DrawTexts_old()
{
    tctx.clearRect(0, 0, windowWidth, windowHeight);
    tctx.fillStyle = "black";
    tctx.textBaseline = "top";
    tctx.font = (zoom * 24) + "px Verdana";

    // precalculate some values
    let addX = windowWidth * (1 - zoom) * 0.5 + zoom * textPaddingX;
    let addY = windowHeight * (1 - zoom) * 0.5 + zoom * textPaddingY;

    for (node in allNodes)
    {
        let currentNode = allNodes[node];
        let posx = (currentNode.renderData["posX"] + cameraOffsetX) * zoom + addX;
        let posy = (currentNode.renderData["posY"] - cameraOffsetY) * zoom + addY;
        //let posx = currentNode["posX"] * 0.5 + cameraOffsetX * zoom;
        //let posy = currentNode["posY"] * 0.5 - cameraOffsetY * zoom;

        let currentAlias = currentNode["alias"];
        currentNode["textWidth"] = tctx.measureText(currentAlias).width;
        tctx.fillText(currentAlias, posx, posy);
    }
}
*/

let textAtlases = [];
let textAtlasCount = 0;

function CreateTextureFromCanvas(vertexData, uvData, offsetData, colorData)
{
    let ret = {};

    let currentTexture = ctx.createTexture();
    ctx.bindTexture(ctx.TEXTURE_2D, currentTexture);
    ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, textCanvas);
    ctx.generateMipmap(ctx.TEXTURE_2D);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR_MIPMAP_LINEAR);

    let vertexBufferData = new Float32Array(vertexData);
    let uvBufferData = new Float32Array(uvData);
    let offsetBufferData = new Float32Array(offsetData);
    let colorBufferData = new Float32Array(colorData);

    let currentVertexBuffer = ctx.createBuffer();
    let currentUVBuffer = ctx.createBuffer();
    let currentOffsetBuffer = ctx.createBuffer();
    let currentColorBuffer = ctx.createBuffer();
    
    ctx.bindBuffer(ctx.ARRAY_BUFFER, currentVertexBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, vertexBufferData, ctx.STATIC_DRAW);
    
    ctx.bindBuffer(ctx.ARRAY_BUFFER, currentUVBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, uvBufferData, ctx.STATIC_DRAW);

    ctx.bindBuffer(ctx.ARRAY_BUFFER, currentOffsetBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, offsetBufferData, ctx.STATIC_DRAW);

    ctx.bindBuffer(ctx.ARRAY_BUFFER, currentColorBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, colorBufferData, ctx.STATIC_DRAW);

    ++textAtlasCount;

    ret["texture"] = currentTexture;
    ret["vertexBuffer"] = currentVertexBuffer;
    ret["uvBuffer"] = currentUVBuffer;
    ret["offsetBuffer"] = currentOffsetBuffer;
    ret["colorBuffer"] = currentColorBuffer;
    ret["count"] = vertexData.length >> 1;

    ret["vertexBufferData"] = vertexBufferData;
    ret["uvBufferData"] = uvBufferData;
    ret["offsetBufferData"] = offsetBufferData;
    ret["colorBufferData"] = colorBufferData;

    return ret;
}

const maxTextureSize = 2048;
function RenderTexts()
{
    let maxTextureSizeInverse = 1 / maxTextureSize;

    textCanvas.width = maxTextureSize;
    textCanvas.height = maxTextureSize;

    tctx.font = baseFontSize + "px Verdana";
    tctx.textBaseline = "top";
    let offsetX = 0;
    let distX = 10;
    let distY = baseFontSize * 0.75;
    let height = baseFontSize + distY;
    let offsetY = distY;

    let vertexData = [];
    let uvData = [];
    let offsetData = [];
    let colorData = [];
    
    let left = (textPaddingX * windowWidthInverse * 2 - 1) * coordMultiplier;
    let bottom = 1 * coordMultiplier;
    
    for (let i = 0; i < allNodeCount; ++i)
    {
        let currentNode = allNodesByIndex[i];
        let currentText = currentNode["alias"];
        let textPosition = {};
        currentNode["renderData"]["textPosition"] = textPosition;

        let width = tctx.measureText(currentText).width;
        textPosition["w"] = width;
        textPosition["h"] = height;

        if (offsetX + width + distX > maxTextureSize) // row is full
        {
            offsetX = 0;
            offsetY += height;
        }

        if (offsetY + height > maxTextureSize) // canvas is full, create a texture
        {
            textAtlases.push(CreateTextureFromCanvas(vertexData, uvData, offsetData, colorData));

            tctx.clearRect(0, 0, maxTextureSize, maxTextureSize);

            vertexData = [];
            uvData = [];
            offsetData = [];

            offsetY = distY;
        }

        textPosition["x"] = offsetX;
        textPosition["y"] = offsetY - distY * 0.5;

        tctx.fillText(currentText, offsetX, offsetY);

        let top = (height * windowHeightInverse * 2 + 1) * coordMultiplier;
        let right = ((width + textPaddingX) * windowWidthInverse * 2 - 1) * coordMultiplier;

        vertexData.push(left);
        vertexData.push(bottom);
        vertexData.push(right);
        vertexData.push(bottom);
        vertexData.push(left);
        vertexData.push(top);
        
        vertexData.push(right);
        vertexData.push(bottom);
        vertexData.push(left);
        vertexData.push(top);
        vertexData.push(right);
        vertexData.push(top);

        let uvLeft = offsetX * maxTextureSizeInverse;
        let uvBottom = (offsetY - distY * 0.5) * maxTextureSizeInverse;
        let uvRight = (offsetX + width) * maxTextureSizeInverse;
        let uvTop = (offsetY + baseFontSize + distY * 0.5) * maxTextureSizeInverse;

        uvData.push(uvLeft);
        uvData.push(uvTop);
        uvData.push(uvRight);
        uvData.push(uvTop);
        uvData.push(uvLeft);
        uvData.push(uvBottom);
            
        uvData.push(uvRight);
        uvData.push(uvTop);
        uvData.push(uvLeft);
        uvData.push(uvBottom);
        uvData.push(uvRight);
        uvData.push(uvBottom);

        let currentOffsetX = currentNode["renderData"]["posX"] * 2;
        let currentOffsetY = -currentNode["renderData"]["posY"] * 2 - (baseFontSize * 2 + textPaddingY * 2 + 30) * coordMultiplier;
        for (let j = 0; j < 6; ++j)
        {
            offsetData.push(currentOffsetX);
            offsetData.push(currentOffsetY);
        }

        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);
        colorData.push(1);

        currentNode["renderData"]["atlasID"] = textAtlasCount;
        currentNode["renderData"]["atlasIndex"] = vertexData.length - 12;

        offsetX += width + distX;
    }

    textAtlases.push(CreateTextureFromCanvas(vertexData, uvData, offsetData, colorData));
}

function FuckingWindowWasFuckingResizedSoFuckingRecalculateTheFuckingVerticesOfTheFuckingTexts()
{
    let distY = baseFontSize * 0.75;
    let height = baseFontSize + distY;

    let left = (textPaddingX * windowWidthInverse * 2 - 1) * coordMultiplier;
    let bottom = 1 * coordMultiplier;
    
    let index = 0;
    for (let i = 0; i < textAtlasCount; ++i)
    {
        let currentAtlas = textAtlases[i];
        let currentAtlasNodeCount = currentAtlas.count / 6;
        let vertexData = [];

        for (let j = 0; j < currentAtlasNodeCount; ++j)
        {
            let width = allNodesByIndex[index]["renderData"]["textPosition"]["w"];
            ++index;

            let top = (height * windowHeightInverse * 2 + 1) * coordMultiplier;
            let right = ((width + textPaddingX) * windowWidthInverse * 2 - 1) * coordMultiplier;

            vertexData.push(left);
            vertexData.push(bottom);
            vertexData.push(right);
            vertexData.push(bottom);
            vertexData.push(left);
            vertexData.push(top);
            
            vertexData.push(right);
            vertexData.push(bottom);
            vertexData.push(left);
            vertexData.push(top);
            vertexData.push(right);
            vertexData.push(top);
        }

        let vertexBufferData = new Float32Array(vertexData);
    
        ctx.bindBuffer(ctx.ARRAY_BUFFER, currentAtlas["vertexBuffer"]);
        ctx.bufferData(ctx.ARRAY_BUFFER, vertexBufferData, ctx.STATIC_DRAW);
    }
}

function Loaded()
{
    InitWebglData();
    
    for (let i = 0; i < allNodeCount; ++i)
    {
        let currentNode = allNodesByIndex[i];
        SetPosition(currentNode.renderData["order"], currentNode.renderData["posX"], currentNode.renderData["posY"]);
    }

    FinalizeSetPosition();

    //TestRandomize();

    Draw();
}


function TestRandomize()
{
    for (let j = 0; j < allNodeCount; ++j)
    {
        let startIndex = j * 108;
        let x = Math.random() * 1000 * 2;
        let y = Math.random() * -500 * 2;
        for (let i = 0; i < 54; ++i)
        {
            vertexOffsets[startIndex++] = x;
            vertexOffsets[startIndex++] = y;
        }
    }

    ctx.enableVertexAttribArray(offsetLoc);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, offsetBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, vertexOffsets, ctx.STATIC_DRAW);
    ctx.vertexAttribPointer(offsetLoc, 2, ctx.FLOAT, false, 0, 0);

    Changed();
}

function SetPosition(index, x, y)
{
    let startIndex = index * 108;
    let currentNode = allNodesByIndex[index];
    let textOffsetBufferData = textAtlases[currentNode["renderData"]["atlasID"]]["offsetBufferData"];

    let posX = x * 2;
    let posY = -y * 2;

    for (let i = 0; i < 54; ++i)
    {
        vertexOffsets[startIndex++] = posX;
        vertexOffsets[startIndex++] = posY;
    }

    let currentOffsetX = x * 2;
    let currentOffsetY = -y * 2 - (baseFontSize * 2 + textPaddingY * 2 + 30) * coordMultiplier;

    let startIndex2 = currentNode["renderData"]["atlasIndex"];
    for (let i = 0; i < 6; ++i)
    {
        textOffsetBufferData[startIndex2++] = currentOffsetX;
        textOffsetBufferData[startIndex2++] = currentOffsetY;
    }
}

function FinalizeSetPosition()
{
    //ctx.enableVertexAttribArray(offsetLoc);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, offsetBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, vertexOffsets, ctx.STATIC_DRAW);
    //ctx.vertexAttribPointer(offsetLoc, 2, ctx.FLOAT, false, 0, 0);

    for (let i = 0; i < textAtlasCount; ++i)
    {
        let currentData = textAtlases[i];
        
        ctx.bindBuffer(ctx.ARRAY_BUFFER, currentData["offsetBuffer"]);
        ctx.bufferData(ctx.ARRAY_BUFFER, currentData["offsetBufferData"], ctx.STATIC_DRAW);
    }

    Changed();
}

const boxSizeX = 16, boxSizeY = 16, boxHeight = 30;
function FuckingWindowWasFuckingResizedSoFuckingRecalculateTheFuckingVertices()
{
    let count = allNodeCount;
    let vertices = new Float32Array(count * 12 * 9);
    let vertexIndex = 0;

    let left0 = -1 * coordMultiplier;
    let left1 = left0 + (boxSizeX * 2 * windowWidthInverse) * coordMultiplier;
    
    let bottom0 = 1 * coordMultiplier;
    let bottom1 = bottom0 - boxSizeY * windowHeightInverse * 2 * coordMultiplier;
    let bottom2 = bottom0 - (boxSizeY + boxHeight) * windowHeightInverse * 2 * coordMultiplier;
    let bottom3 = bottom0 - (boxSizeY * 2 + boxHeight) * windowHeightInverse * 2 * coordMultiplier;

    let widthAddPrecalc = textPaddingX * 2 - boxSizeX * 2;
    
    for (let i = 0; i < count; ++i)
    {
        let currentNodeTextWidth = allNodesByIndex[i].renderData["textWidth"] + widthAddPrecalc;
        let left2 = left0 + (boxSizeX + currentNodeTextWidth) * 2 * windowWidthInverse * coordMultiplier;
        let left3 = left0 + (boxSizeX * 2 + currentNodeTextWidth) * 2 * windowWidthInverse * coordMultiplier;

        // top left
        vertices[vertexIndex++] = left0;
        vertices[vertexIndex++] = bottom0;
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom0;
        vertices[vertexIndex++] = left0;
        vertices[vertexIndex++] = bottom1;
        
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom0;
        vertices[vertexIndex++] = left0;
        vertices[vertexIndex++] = bottom1;
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom1;

        // top
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom0;
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom0;
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom1;
        
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom0;
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom1;
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom1;

        // top right
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom0;
        vertices[vertexIndex++] = left3;
        vertices[vertexIndex++] = bottom0;
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom1;
        
        vertices[vertexIndex++] = left3;
        vertices[vertexIndex++] = bottom0;
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom1;
        vertices[vertexIndex++] = left3;
        vertices[vertexIndex++] = bottom1;

        // left
        vertices[vertexIndex++] = left0;
        vertices[vertexIndex++] = bottom1;
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom1;
        vertices[vertexIndex++] = left0;
        vertices[vertexIndex++] = bottom2;
        
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom1;
        vertices[vertexIndex++] = left0;
        vertices[vertexIndex++] = bottom2;
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom2;

        // center
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom1;
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom1;
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom2;
        
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom1;
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom2;
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom2;

        // right
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom1;
        vertices[vertexIndex++] = left3;
        vertices[vertexIndex++] = bottom1;
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom2;
        
        vertices[vertexIndex++] = left3;
        vertices[vertexIndex++] = bottom1;
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom2;
        vertices[vertexIndex++] = left3;
        vertices[vertexIndex++] = bottom2;

        // bottom left
        vertices[vertexIndex++] = left0;
        vertices[vertexIndex++] = bottom2;
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom2;
        vertices[vertexIndex++] = left0;
        vertices[vertexIndex++] = bottom3;
        
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom2;
        vertices[vertexIndex++] = left0;
        vertices[vertexIndex++] = bottom3;
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom3;

        // bottom
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom2;
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom2;
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom3;
        
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom2;
        vertices[vertexIndex++] = left1;
        vertices[vertexIndex++] = bottom3;
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom3;

        // bottom right
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom2;
        vertices[vertexIndex++] = left3;
        vertices[vertexIndex++] = bottom2;
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom3;
        
        vertices[vertexIndex++] = left3;
        vertices[vertexIndex++] = bottom2;
        vertices[vertexIndex++] = left2;
        vertices[vertexIndex++] = bottom3;
        vertices[vertexIndex++] = left3;
        vertices[vertexIndex++] = bottom3;
    }

    ctx.enableVertexAttribArray(vLoc);
    ctx.bindBuffer(ctx.ARRAY_BUFFER, vertexBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, vertices, ctx.STATIC_DRAW);
    ctx.vertexAttribPointer(vLoc, 2, ctx.FLOAT, false, 0, 0);
    
    ctx.uniform2f(windowSizeLoc, windowWidthInverse, windowHeightInverse);
}

let zoom = 0.125 / coordMultiplier;
const maxZoom = zoom * 1000, minZoom = zoom * 0.001;

let vertexOffsets;
function InitWebglData()
{
    let count = allNodeCount;
    let uvs = new Float32Array(count * 12 * 9);
    let colors = new Float32Array(count * 24 * 9);
    vertexOffsets = new Float32Array(count * 12 * 9);

    let uvIndex = 0;
    let vertexOffsetIndices = 0;
    let colorIndex = 0;

    for (let i = 0; i < count; ++i)
    {
        for (let j = 0; j < 108; ++j)
            vertexOffsets[vertexOffsetIndices++] = 0;

        let uvLeft = 0, uvRight = 0.25, uvBottom = 1, uvTop = 0;
        // top left
        uvs[uvIndex++] = uvLeft;
        uvs[uvIndex++] = uvTop;
        uvs[uvIndex++] = uvRight;
        uvs[uvIndex++] = uvTop;
        uvs[uvIndex++] = uvLeft;
        uvs[uvIndex++] = uvBottom;
        
        uvs[uvIndex++] = uvRight;
        uvs[uvIndex++] = uvTop;
        uvs[uvIndex++] = uvLeft;
        uvs[uvIndex++] = uvBottom;
        uvs[uvIndex++] = uvRight;
        uvs[uvIndex++] = uvBottom;
        
        // top
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 0;
        uvs[uvIndex++] = 0.26;
        uvs[uvIndex++] = 0;
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 1;
        
        uvs[uvIndex++] = 0.26;
        uvs[uvIndex++] = 0;
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 1;
        uvs[uvIndex++] = 0.26;
        uvs[uvIndex++] = 1;
        
        // top right
        uvs[uvIndex++] = uvRight;
        uvs[uvIndex++] = uvTop;
        uvs[uvIndex++] = uvLeft;
        uvs[uvIndex++] = uvTop;
        uvs[uvIndex++] = uvRight;
        uvs[uvIndex++] = uvBottom;
        
        uvs[uvIndex++] = uvLeft;
        uvs[uvIndex++] = uvTop;
        uvs[uvIndex++] = uvRight;
        uvs[uvIndex++] = uvBottom;
        uvs[uvIndex++] = uvLeft;
        uvs[uvIndex++] = uvBottom;

        // left
        uvs[uvIndex++] = 0;
        uvs[uvIndex++] = 0.99;
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 0.99;
        uvs[uvIndex++] = 0;
        uvs[uvIndex++] = 1;
        
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 0.99;
        uvs[uvIndex++] = 0;
        uvs[uvIndex++] = 1;
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 1;

        // center
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 0.99;
        uvs[uvIndex++] = 0.26;
        uvs[uvIndex++] = 0.99;
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 1;
        
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 0.99;
        uvs[uvIndex++] = 0.26;
        uvs[uvIndex++] = 1;
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 1;

        // right
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 0.9;
        uvs[uvIndex++] = 0;
        uvs[uvIndex++] = 0.9;
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 1;
        
        uvs[uvIndex++] = 0;
        uvs[uvIndex++] = 0.9;
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 1;
        uvs[uvIndex++] = 0;
        uvs[uvIndex++] = 1;

        // bottom left
        uvs[uvIndex++] = uvLeft;
        uvs[uvIndex++] = uvBottom;
        uvs[uvIndex++] = uvRight;
        uvs[uvIndex++] = uvBottom
        uvs[uvIndex++] = uvLeft;
        uvs[uvIndex++] = uvTop;
        
        uvs[uvIndex++] = uvRight;
        uvs[uvIndex++] = uvBottom;
        uvs[uvIndex++] = uvLeft;
        uvs[uvIndex++] = uvTop;
        uvs[uvIndex++] = uvRight;
        uvs[uvIndex++] = uvTop;
        
        // bottom
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 1;
        uvs[uvIndex++] = 0.26;
        uvs[uvIndex++] = 1;
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 0;
        
        uvs[uvIndex++] = 0.26;
        uvs[uvIndex++] = 1;
        uvs[uvIndex++] = 0.25;
        uvs[uvIndex++] = 0;
        uvs[uvIndex++] = 0.26;
        uvs[uvIndex++] = 0;

        // bottom right
        uvs[uvIndex++] = uvRight;
        uvs[uvIndex++] = uvBottom;
        uvs[uvIndex++] = uvLeft;
        uvs[uvIndex++] = uvBottom;
        uvs[uvIndex++] = uvRight;
        uvs[uvIndex++] = uvTop;
        
        uvs[uvIndex++] = uvLeft;
        uvs[uvIndex++] = uvBottom;
        uvs[uvIndex++] = uvRight;
        uvs[uvIndex++] = uvTop;
        uvs[uvIndex++] = uvLeft;
        uvs[uvIndex++] = uvTop;

        for (let j = 0; j < 216; j += 4)
        {
            colors[colorIndex++] = 1;
            colors[colorIndex++] = 1;
            colors[colorIndex++] = 1;
            colors[colorIndex++] = 1;
        }
    }

    ctx.bindBuffer(ctx.ARRAY_BUFFER, texBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, uvs, ctx.STATIC_DRAW);

    ctx.bindBuffer(ctx.ARRAY_BUFFER, offsetBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, vertexOffsets, ctx.STATIC_DRAW);
    
    ctx.bindBuffer(ctx.ARRAY_BUFFER, colorBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, colors, ctx.STATIC_DRAW);

    // actually it wasn't resized here
    FuckingWindowWasFuckingResizedSoFuckingRecalculateTheFuckingVertices();

    webglInitialized = true;
}

let vertexBuffer, texBuffer;
let vLoc, tLoc;
let offsetBuffer, offsetLoc;
let colorBuffer, colorLoc;
let texture, whiteTexture;
let cameraOffsetLoc, windowSizeLoc;
let program;
function WebglInit()
{
    const vertexShader = `
    attribute vec2 aVertex;
    attribute vec2 aUV;
    attribute vec2 vertexOffset;
    attribute vec4 col;
    varying vec2 vTex;
    varying vec4 color;
    uniform vec3 cameraOffset; // x, y: camera pos, z: zoom
    uniform vec2 windowSize;
    void main()
    {
        gl_Position = vec4((aVertex + (vertexOffset + cameraOffset.xy) * windowSize) * cameraOffset.z, 0.0, 1.0);
        vTex = aUV;
        color = col;
    }
    `;

    const fragmentShader = `
    precision mediump float;
    varying vec2 vTex;
    varying vec4 color;
    uniform sampler2D sampler0;
    void main()
    {
        gl_FragColor = texture2D(sampler0, vTex, -0.8) * color;
    }
    `;

    ctx.enable(ctx.BLEND);
    ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA);

    const vertShaderObj = ctx.createShader(ctx.VERTEX_SHADER);
    const fragShaderObj = ctx.createShader(ctx.FRAGMENT_SHADER);
    ctx.shaderSource(vertShaderObj, vertexShader);
    ctx.shaderSource(fragShaderObj, fragmentShader);
    ctx.compileShader(vertShaderObj);
    ctx.compileShader(fragShaderObj);

    program = ctx.createProgram();
    ctx.attachShader(program, vertShaderObj);
    ctx.attachShader(program, fragShaderObj);

    ctx.linkProgram(program);
    ctx.useProgram(program);

    vertexBuffer = ctx.createBuffer();
    texBuffer = ctx.createBuffer();
    offsetBuffer = ctx.createBuffer();
    colorBuffer = ctx.createBuffer();

    vLoc = ctx.getAttribLocation(program, "aVertex");
    tLoc = ctx.getAttribLocation(program, "aUV");
    offsetLoc = ctx.getAttribLocation(program, "vertexOffset");
    colorLoc = ctx.getAttribLocation(program, "col");

    cameraOffsetLoc = ctx.getUniformLocation(program, "cameraOffset");
    ctx.uniform3f(cameraOffsetLoc, cameraOffsetX * 2, cameraOffsetY * 2, zoom);
    
    windowSizeLoc = ctx.getUniformLocation(program, "windowSize");


    let texImage = new Image();
    let whiteImage = new Image();

    let currentImageCount = 0;
    let targetImageCount = 2;

    function ImageLoaded()
    {
        if (++currentImageCount != targetImageCount)
            return;
        
        texture = ctx.createTexture();
        ctx.bindTexture(ctx.TEXTURE_2D, texture);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
        ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, texImage);

        whiteTexture = ctx.createTexture();
        ctx.bindTexture(ctx.TEXTURE_2D, whiteTexture);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST);
        ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);
        ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, whiteImage);

        Loaded();
    }

    texImage.onload = ImageLoaded;
    texImage.src = "data:image/png;base64,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";

    whiteImage.onload = ImageLoaded;
    whiteImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
    
}

function Intersect(p1x1, p1y1, p1x2, p1y2, p2x1, p2y1, p2x2, p2y2)
{
    let a1 = p1y2 - p1y1;
    let b1 = p1x1 - p1x2;

    let c1 = (p1x2 * p1y1) - (p1x1 * p1y2);

    let d1 = (a1 * p2x1) + (b1 * p2y1) + c1;
    let d2 = (a1 * p2x2) + (b1 * p2y2) + c1;

    if (d1 < 0 == d2 < 0)
        return false;
        
    a1 = p2y2 - p2y1;
    b1 = p2x1 - p2x2;

    c1 = (p2x2 * p2y1) - (p2x1 * p2y2);

    d1 = (a1 * p1x1) + (b1 * p1y1) + c1;
    d2 = (a1 * p1x2) + (b1 * p1y2) + c1;

    if (d1 < 0 == d2 < 0)
        return false;

    return true;
}
/*
function PointInsideRectangle(p1x1, p1y1, p1x2, p1y2,
                              r2x1, r2y1, r2x2, r2y2,
                              r3x1, r3y1, r3x2, r3y2,
                              r4x1, r4y1, r4x2, r4y2,
                              r5x1, r5y1, r5x2, r5y2)
{

}*/
