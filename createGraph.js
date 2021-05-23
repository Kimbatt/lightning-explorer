// lncli describegraph > graph.json

const child_process = require("child_process");
const fs = require("fs");

console.log("Getting graph data from LND...");

const graphJSON =
    fs.readFileSync("graph.json").toString("utf-8")
    // child_process.execSync("lncli describegraph", { maxBuffer: 1024 * 1024 * 1024 }).toString("utf8");

console.log("Processing graph...");

const graph = JSON.parse(graphJSON);

/** @type {number[]} */
const resultBinaryData = [];

const tempUint32Array = new Uint32Array(2);
const view = new DataView(tempUint32Array.buffer);
function WriteUint64(num)
{
    view.setBigUint64(0, BigInt(num), true);

    for (let i = 0; i < 8; ++i)
    {
        resultBinaryData.push(view.getUint8(i));
    }
}

function WriteUint32(num)
{
    view.setUint32(0, num, true);

    for (let i = 0; i < 4; ++i)
    {
        resultBinaryData.push(view.getUint8(i));
    }
}

function WriteFloat32(num)
{
    view.setFloat32(0, num, true);

    for (let i = 0; i < 4; ++i)
    {
        resultBinaryData.push(view.getUint8(i));
    }
}

function WriteByte(num)
{
    view.setUint8(0, num, true);
    resultBinaryData.push(view.getUint8(0));
}

const textEncoder = new TextEncoder();
function WriteString(str)
{
    // 255 bytes max
    const bytes = textEncoder.encode(str).subarray(0, 256);
    WriteByte(bytes.length);
    bytes.forEach(WriteByte);
}

// 4 bytes: total size (set at the end)
// 8 bytes: last update of the graph (timestamp)
// 4 bytes: node count
// for node count:
//     8 bytes:             last update
//     32 bytes:            pub_key (without version)
//     1 byte:              pub_key version
//     3 bytes:             color
//     4 bytes:             position x
//     4 bytes:             position y
//     1 byte:              alias length (255 bytes max)
//     alias length bytes:  alias string utf-8 bytes
//     1 byte:              address count
//     for address count:
//         1 byte:              address length
//         address count bytes: address string utf-8 bytes
//     0-3 bytes padding
//
//
// 4 bytes: edge count
// for edge count:
//     8 bytes:  channel id
//     8 bytes:  last update
//     4 bytes:  capacity
//     4 bytes: node 1 index
//     4 bytes: node 2 index

WriteUint32(0);

function CalculateNodePosition(index)
{
    const spacing = 2;
    const angle = index / 10;
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return {
        x: c * angle * spacing,
        y: s * angle * spacing
    };
}


WriteUint64(new Date().getTime());

const nodes = graph["nodes"];
const nodeToIndex = new Map();
WriteUint32(nodes.length);

let index = 0;
for (const node of nodes)
{
    nodeToIndex.set(node["pub_key"], index++);

    WriteUint64(node["last_update"]);

    for (let i = 0; i < 32; ++i)
    {
        WriteByte(Number.parseInt(node["pub_key"].substr(2 + i * 2, 2), 16));
    }

    WriteByte(Number.parseInt(node["pub_key"].substr(0, 2), 16));

    for (let i = 0; i < 3; ++i)
    {
        WriteByte(Number.parseInt(node["color"].substr(1 + i * 2, 2), 16));
    }

    const { x, y } = CalculateNodePosition(index);
    WriteFloat32(x);
    WriteFloat32(y);

    WriteString(node["alias"]);

    WriteByte(node["addresses"].length);
    for (const address of node["addresses"])
    {
        WriteString(address["addr"]);
    }

    while (resultBinaryData.length % 4 !== 0)
    {
        // padding
        WriteByte(0);
    }
}

const edges = graph["edges"];
WriteUint32(edges.length);

for (const edge of edges)
{
    WriteUint64(BigInt(edge["channel_id"]));
    WriteUint64(edge["last_update"]);
    WriteUint32(edge["capacity"]);

    const node1Index = nodeToIndex.get(edge["node1_pub"]);
    const node2Index = nodeToIndex.get(edge["node2_pub"]);

    if (node1Index === undefined || node2Index === undefined)
    {
        throw new Error(`Edge ${edge["channel_id"]} references node ${node1Index === undefined ? edge["node1_pub"] : edge["node2_pub"]}, but that node does not exist`);
    }

    WriteUint32(node1Index);
    WriteUint32(node2Index);
}

// write size
{
    view.setUint32(0, resultBinaryData.length, true);

    for (let i = 0; i < 4; ++i)
    {
        resultBinaryData[i] = view.getUint8(i);
    }
}

fs.writeFileSync(process.argv[2] || "graph.bin", Buffer.from(new Uint8Array(resultBinaryData)));

console.log("Done");
