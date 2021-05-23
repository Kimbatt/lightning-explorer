
interface LightningNode
{
    index: number;
    lastUpdate: number;
    pubKey: string;
    color: number; // 24 bits, top 8 bits: red, middle 8 bits: green, bottom 8 bits: blue
    positionX: number;
    positionY: number;
    alias: string | null;
    addresses: string[];
    channels: LightningChannel[];
    neighbors: Set<LightningNode>; // each pair of nodes is present only once in the entire graph, the neighbor is only added here if it has a higher index
}

interface LightningChannel
{
    channelId: string;
    lastUpdate: number;
    capacity: number;
    node1: LightningNode;
    node2: LightningNode;
}

interface LightningGraphData
{
    lastUpdate: number;
    nodes: LightningNode[];
    channels: LightningChannel[];
    uniqueChannelCount: number;
}

async function LoadNodeData(): Promise<LightningGraphData>
{
    const data = await fetch("graph.bin");

    // 4 bytes: total size of the data
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

    const arrayBuffer = await data.arrayBuffer();
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);

    let offset = 0;

    function ReadUint64()
    {
        const value = Number(view.getBigUint64(offset, true));
        offset += 8;
        return value;
    }

    function ReadUint64AsString()
    {
        const value = view.getBigUint64(offset, true);
        offset += 8;
        return value.toString();
    }

    function ReadUint32()
    {
        const value = view.getUint32(offset, true);
        offset += 4;
        return value;
    }

    function ReadFloat32()
    {
        const value = view.getFloat32(offset, true);
        offset += 4;
        return value;
    }

    function ReadByte()
    {
        const value = view.getUint8(offset);
        offset += 1;
        return value;
    }

    const textDecoder = new TextDecoder();
    function ReadString()
    {
        const length = ReadByte();
        const str = textDecoder.decode(bytes.subarray(offset, offset + length));
        offset += length;
        return str;
    }

    function ReadByteAsHex()
    {
        return ReadByte().toString(16).padStart(2, "0");
    }

    const totalSize = ReadUint32();
    if (totalSize !== bytes.length)
    {
        throw new Error(`Incorrect amount of data received: expected ${totalSize} bytes, but only received ${bytes.length} bytes`);
    }

    const lastUpdate = ReadUint64();
    const nodeCount = ReadUint32();

    const nodes = new Array<LightningNode>(nodeCount);
    for (let i = 0; i < nodeCount; ++i)
    {
        const nodeLastUpdate = ReadUint64();

        let nodePubKey = "";
        for (let i = 0; i < 32; ++i)
        {
            nodePubKey += ReadByteAsHex();
        }

        nodePubKey = ReadByteAsHex() + nodePubKey;

        let color = 0;
        for (let i = 0; i < 3; ++i)
        {
            color <<= 8;
            color = color | ReadByte();
        }

        const positionX = ReadFloat32();
        const positionY = ReadFloat32();

        const alias = ReadString();

        const addressCount = ReadByte();
        const addresses: string[] = [];
        for (let j = 0; j < addressCount; ++j)
        {
            addresses.push(ReadString());
        }

        while (offset % 4 !== 0)
        {
            // padding
            ++offset;
        }

        nodes[i] = {
            index: i,
            lastUpdate: nodeLastUpdate,
            pubKey: nodePubKey,
            color,
            positionX,
            positionY,
            alias: alias === "" ? null : alias,
            addresses,
            channels: [],
            neighbors: new Set<LightningNode>()
        };
    }

    const channelCount = ReadUint32();
    const channels = new Array<LightningChannel>(channelCount);
    let uniqueChannelCount = 0;
    for (let i = 0; i < channelCount; ++i)
    {
        const channel = channels[i] = {
            channelId: ReadUint64AsString(),
            lastUpdate: ReadUint64(),
            capacity: ReadUint32(),
            node1: nodes[ReadUint32()],
            node2: nodes[ReadUint32()]
        };

        const { node1, node2 } = (() =>
        {
            // swap nodes if needed, so that node2's index is higher than node1's
            const { node1, node2 } = channel;
            return node1.index < node2.index ? { node1: node1, node2: node2 } : { node1: node2, node2: node1 };
        })();

        node1.channels.push(channel);
        node2.channels.push(channel);

        if (!node1.neighbors.has(node2))
        {
            node1.neighbors.add(node2);
            ++uniqueChannelCount;
        }
    }

    return {
        lastUpdate,
        nodes,
        channels,
        uniqueChannelCount
    };
}
