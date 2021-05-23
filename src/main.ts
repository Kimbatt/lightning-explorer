
// constants
const baseFontSize = 48;
const coordMultiplier = 0.0625; // reduce this for increased precision

const zoomSpeed = 1.1;
const startingZoom = 0.125 / coordMultiplier;
const maxZoom = startingZoom * 1000, minZoom = startingZoom * 0.001;

const vertexSize = 2;
const colorSize = 4;
const uvSize = 2;

// global camera render data
interface CameraRenderData
{
    windowWidth: number;
    windowHeight: number;
    windowWidthInverse: number;
    windowHeightInverse: number;
    cameraOffsetX: number;
    cameraOffsetY: number;
    zoom: number;
};

// checks
function WebGLThrowError(name: string): never
{
    throw new Error(`WebGL initialize error: cannot create '${name}'`);
}

function CheckMultipleOf<T>(name: string, array: ArrayLike<T>, requiredMultipleOf: number)
{
    if (array.length % requiredMultipleOf !== 0)
    {
        throw new Error(`length of ${name} must be a multiple of ${requiredMultipleOf}`);
    }
}

// WebGL programs
class LinesProgram
{
    // attributes
    private vertexLoc: number;
    private colorLoc: number;

    // uniforms
    private cameraOffsetLoc: WebGLUniformLocation;
    private windowSizeLoc: WebGLUniformLocation;

    // buffers
    private vertexBuffer: WebGLBuffer;
    private colorBuffer: WebGLBuffer;

    private vertexCount = 0;

    private program: WebGLProgram;
    private ctx: WebGLRenderingContext;

    constructor(ctx: WebGLRenderingContext)
    {
        this.ctx = ctx;

        const vertexShaderSource = `
attribute vec2 aVertex; // object space
attribute vec4 aCol;
varying vec4 vColor;
uniform vec3 cameraOffset; // x, y: camera pos, z: zoom
uniform vec2 windowSize;
void main()
{
    gl_Position = vec4((aVertex + cameraOffset.xy) * windowSize * cameraOffset.z, 0.0, 1.0);
    vColor = aCol;
}
        `;

        const fragmentShaderSource = `
precision mediump float;
varying vec4 vColor;
void main()
{
    gl_FragColor = vColor;
}
        `;

        const vertexShader = ctx.createShader(ctx.VERTEX_SHADER) ?? WebGLThrowError("vertex shader");
        const fragmentShader = ctx.createShader(ctx.FRAGMENT_SHADER) ?? WebGLThrowError("fragment shader");

        ctx.shaderSource(vertexShader, vertexShaderSource);
        ctx.shaderSource(fragmentShader, fragmentShaderSource);

        ctx.compileShader(vertexShader);
        ctx.compileShader(fragmentShader);

        this.program = ctx.createProgram() ?? WebGLThrowError("webgl program");
        ctx.attachShader(this.program, vertexShader);
        ctx.attachShader(this.program, fragmentShader);
        ctx.linkProgram(this.program);

        this.vertexBuffer = ctx.createBuffer() ?? WebGLThrowError("vertexBuffer");
        this.colorBuffer = ctx.createBuffer() ?? WebGLThrowError("colorBuffer");

        this.vertexLoc = ctx.getAttribLocation(this.program, "aVertex");
        this.colorLoc = ctx.getAttribLocation(this.program, "aCol");
        this.cameraOffsetLoc = ctx.getUniformLocation(this.program, "cameraOffset") ?? WebGLThrowError("cameraOffset uniform location");
        this.windowSizeLoc = ctx.getUniformLocation(this.program, "windowSize") ?? WebGLThrowError("windowSize uniform location");
    }

    public setData(vertices: Float32Array, colors: Float32Array)
    {
        CheckMultipleOf("vertices", vertices, vertexSize);
        CheckMultipleOf("colors", colors, colorSize);

        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.vertexBuffer);
        this.ctx.bufferData(this.ctx.ARRAY_BUFFER, vertices, this.ctx.STATIC_DRAW);

        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.colorBuffer);
        this.ctx.bufferData(this.ctx.ARRAY_BUFFER, colors, this.ctx.STATIC_DRAW);

        this.vertexCount = vertices.length / vertexSize;
    }

    public render(renderData: CameraRenderData)
    {
        this.ctx.useProgram(this.program);

        this.ctx.uniform3f(this.cameraOffsetLoc, renderData.cameraOffsetX * 2, renderData.cameraOffsetY * 2, renderData.zoom);
        this.ctx.uniform2f(this.windowSizeLoc, renderData.windowWidthInverse, renderData.windowHeightInverse);

        this.ctx.enableVertexAttribArray(this.vertexLoc);
        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.vertexBuffer);
        this.ctx.vertexAttribPointer(this.vertexLoc, vertexSize, this.ctx.FLOAT, false, 0, 0);

        this.ctx.enableVertexAttribArray(this.colorLoc);
        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, this.colorBuffer);
        this.ctx.vertexAttribPointer(this.colorLoc, colorSize, this.ctx.FLOAT, false, 0, 0);

        this.ctx.drawArrays(this.ctx.TRIANGLES, 0, this.vertexCount);
    }
}

class StandardProgram
{
    // attributes
    private vertexLoc: number;
    private uvLoc: number;
    private offsetLoc: number;
    private colorLoc: number;

    // uniforms
    private cameraOffsetLoc: WebGLUniformLocation;
    private windowSizeLoc: WebGLUniformLocation;

    private program: WebGLProgram;
    private ctx: WebGLRenderingContext;

    // buffers
    private vertexBuffer: WebGLBuffer;
    private uvBuffer: WebGLBuffer;
    private offsetBuffer: WebGLBuffer;
    private colorBuffer: WebGLBuffer;

    // textures
    private texture: WebGLTexture;
    private whiteTexture: WebGLTexture;

    constructor(ctx: WebGLRenderingContext)
    {
        this.ctx = ctx;

        const vertexShaderSource = `
attribute vec2 aVertex; // object space
attribute vec2 aUV;
attribute vec2 aVertexOffset;
attribute vec4 aCol;
varying vec2 vUV;
varying vec4 vColor;
uniform vec3 cameraOffset; // x, y: camera pos, z: zoom
uniform vec2 windowSize;
void main()
{
    gl_Position = vec4((aVertex + (aVertexOffset + cameraOffset.xy) * windowSize) * cameraOffset.z, 0.0, 1.0);
    vUV = aUV;
    vColor = aCol;
}
        `;

        const fragmentShaderSource = `
precision mediump float;
varying vec2 vUV;
varying vec4 vColor;
uniform sampler2D sampler0;
void main()
{
    gl_FragColor = texture2D(sampler0, vUV, -0.8) * vColor;
}
        `;

        const vertexShader = ctx.createShader(ctx.VERTEX_SHADER) ?? WebGLThrowError("vertex shader");
        const fragmentShader = ctx.createShader(ctx.FRAGMENT_SHADER) ?? WebGLThrowError("fragment shader");

        ctx.shaderSource(vertexShader, vertexShaderSource);
        ctx.shaderSource(fragmentShader, fragmentShaderSource);

        ctx.compileShader(vertexShader);
        ctx.compileShader(fragmentShader);

        this.program = ctx.createProgram() ?? WebGLThrowError("webgl program");
        ctx.attachShader(this.program, vertexShader);
        ctx.attachShader(this.program, fragmentShader);
        ctx.linkProgram(this.program);

        this.vertexBuffer = ctx.createBuffer() ?? WebGLThrowError("vertexBuffer");
        this.uvBuffer = ctx.createBuffer() ?? WebGLThrowError("uvBuffer");
        this.offsetBuffer = ctx.createBuffer() ?? WebGLThrowError("offsetBuffer");
        this.colorBuffer = ctx.createBuffer() ?? WebGLThrowError("colorBuffer");

        this.vertexLoc = ctx.getAttribLocation(this.program, "aVertex");
        this.uvLoc = ctx.getAttribLocation(this.program, "aUV");
        this.offsetLoc = ctx.getAttribLocation(this.program, "aVertexOffset");
        this.colorLoc = ctx.getAttribLocation(this.program, "aCol");

        this.cameraOffsetLoc = ctx.getUniformLocation(this.program, "cameraOffset") ?? WebGLThrowError("cameraOffset uniform location");
        this.windowSizeLoc = ctx.getUniformLocation(this.program, "windowSize") ?? WebGLThrowError("windowSize uniform location");

        this.texture = ctx.createTexture()!;
        this.whiteTexture = ctx.createTexture()!;

        function LoadImage(src: string, targetTexture: WebGLTexture, minFilter?: number, magFilter?: number)
        {
            const image = new Image();
            image.src = src;
            image.onload = () =>
            {
                ctx.bindTexture(ctx.TEXTURE_2D, targetTexture);
                ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
                ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
                ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, magFilter ?? ctx.LINEAR);
                ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, minFilter ?? ctx.LINEAR);
                ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, image);
            };
        }

        LoadImage("texture.png", this.texture);
        LoadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", this.whiteTexture);
    }
}


// Renderers
interface Renderer
{
    render(cameraRenderData: CameraRenderData): void;
}

class NodeRenderer implements Renderer
{
    private program: StandardProgram;

    constructor(program: StandardProgram)
    {
        this.program = program;
    }

    render(cameraRenderData: CameraRenderData)
    {

    }
}

class TextRenderer implements Renderer
{
    private program: StandardProgram;

    constructor(program: StandardProgram)
    {
        this.program = program;
    }

    render(cameraRenderData: CameraRenderData)
    {

    }
}

class LineRenderer implements Renderer
{
    private program: LinesProgram;

    constructor(program: LinesProgram)
    {
        this.program = program;
        this.program.setData(
            new Float32Array([0.0, 0.0, 1000.0, 0.0, 0.0, 1000.0]),
            new Float32Array([
                1.0, 0.0, 0.0, 1.0,
                0.0, 1.0, 0.0, 1.0,
                0.0, 0.0, 1.0, 1.0
            ])
        );
    }

    render(cameraRenderData: CameraRenderData)
    {
        this.program.render(cameraRenderData);
    }
}


// mouse events
function InitMouseEvents(canvas: HTMLCanvasElement, cameraRenderData: CameraRenderData)
{
    let shouldRender = false;

    let isCameraDragging = false;
    let dragged = false; // true if the camera was actually moved while dragging
    canvas.addEventListener("mousedown", function(ev)
    {
        if (ev.button === 2)
        {
            // right click
            isCameraDragging = true;
        }
    }, { passive: true });
    window.addEventListener("mouseup", function(ev)
    {
        if (ev.button === 2)
        {
            isCameraDragging = false;
            dragged = false;
        }
    }, { passive: true });

    let mouseDeltaX = 0, mouseDeltaY = 0;
    window.addEventListener("mousemove", function(ev)
    {
        mouseDeltaX += ev.movementX;
        mouseDeltaY += ev.movementY;
    }, { passive: true });

    const zoomFactorInverse = 1.0 / zoomSpeed;
    canvas.addEventListener("wheel", function(ev)
    {
        // positive: zoom out, negative: zoom in
        const prevZoom = cameraRenderData.zoom;
        if (ev.deltaY > 0)
        {
            cameraRenderData.zoom *= zoomFactorInverse;
        }
        else
        {
            cameraRenderData.zoom *= zoomSpeed;
        }

        if (cameraRenderData.zoom > maxZoom)
        {
            cameraRenderData.zoom = maxZoom;
        }
        else if (cameraRenderData.zoom < minZoom)
        {
            cameraRenderData.zoom = minZoom;
        }

        // zoom at the current mouse position
        cameraRenderData.cameraOffsetX += (cameraRenderData.windowWidth * 0.5 - ev.clientX) * (1 / prevZoom - 1 / cameraRenderData.zoom);
        cameraRenderData.cameraOffsetY += (cameraRenderData.windowHeight * 0.5 - ev.clientY) * (1 / cameraRenderData.zoom - 1 / prevZoom);

        shouldRender = true;
    }, { passive: true });

    // this function is here because some browsers fire the mousemove event more frequently than the maximum framerate
    // so we just store the mouse movements, and only render once per frame
    (function CheckMouseMovement()
    {
        window.requestAnimationFrame(CheckMouseMovement);

        if (mouseDeltaX == 0 && mouseDeltaY == 0)
            return;

        if (isCameraDragging)
        {
            dragged = true;
            shouldRender = true;

            cameraRenderData.cameraOffsetX += mouseDeltaX / cameraRenderData.zoom;
            cameraRenderData.cameraOffsetY -= mouseDeltaY / cameraRenderData.zoom;
        }

        mouseDeltaX = 0;
        mouseDeltaY = 0;
    })();

    return () => shouldRender;
}



// Lightning graph interfaces
interface LightningNode
{
    index: number;
    lastUpdate: number;
    pubKey: string;
    color: string;
    positionX: number;
    positionY: number;
    alias: string | null;
    addresses: string[];
    channels: LightningChannel[];
    neighbors: Set<LightningNode>;
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

        let color = "#";
        for (let i = 0; i < 3; ++i)
        {
            color += ReadByteAsHex();
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
    for (let i = 0; i < channelCount; ++i)
    {
        const channel = channels[i] = {
            channelId: ReadUint64AsString(),
            lastUpdate: ReadUint64(),
            capacity: ReadUint32(),
            node1: nodes[ReadUint32()],
            node2: nodes[ReadUint32()]
        };

        const { node1, node2 } = channel;
        node1.channels.push(channel);
        node2.channels.push(channel);

        node1.neighbors.add(node2);
        node2.neighbors.add(node1);
    }

    return {
        lastUpdate,
        nodes,
        channels
    };
}

window.addEventListener("load", async () =>
{
    const canvas = <HTMLCanvasElement>document.getElementById("canvas");
    const ctx = canvas.getContext("webgl")!;

    const textCanvas = <HTMLCanvasElement>document.createElement("canvas");
    const tctx = textCanvas.getContext("2d")!;

    document.getElementById("loading-overlay")!.style.display = "none";

    const cameraRenderData: CameraRenderData = {
        windowWidth: 1,
        windowHeight: 1,
        windowWidthInverse: 1,
        windowHeightInverse: 1,
        cameraOffsetX: 0,
        cameraOffsetY: 0,
        zoom: startingZoom
    };

    const nodeData = await LoadNodeData();

    const { standard, text, lines } = (() =>
    {
        // WebGL init

        ctx.enable(ctx.BLEND);
        ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA);

        ctx.enable(ctx.CULL_FACE);
        ctx.cullFace(ctx.BACK);

        ctx.clearColor(0.2, 0.2, 0.2, 1);

        return {
            standard: new NodeRenderer(new StandardProgram(ctx)),
            text: new TextRenderer(new StandardProgram(ctx)),
            lines: new LineRenderer(new LinesProgram(ctx))
        };
    })();

    let shouldRender = true;

    function WindowResized()
    {
        cameraRenderData.windowWidth = window.innerWidth;
        cameraRenderData.windowHeight = window.innerHeight;
        cameraRenderData.windowWidthInverse = 1 / cameraRenderData.windowWidth;
        cameraRenderData.windowHeightInverse = 1 / cameraRenderData.windowHeight;
        canvas.width = cameraRenderData.windowWidth;
        canvas.height = cameraRenderData.windowHeight;
        ctx.viewport(0, 0, cameraRenderData.windowWidth, cameraRenderData.windowHeight);

        shouldRender = true;
    }

    window.addEventListener("resize", WindowResized);

    const ShouldRenderBecauseOfMouseEvents = InitMouseEvents(canvas, cameraRenderData);
    WindowResized();

    function RenderLoop()
    {
        window.requestAnimationFrame(RenderLoop);

        shouldRender = shouldRender || ShouldRenderBecauseOfMouseEvents();
        if (!shouldRender)
        {
            return;
        }

        shouldRender = false;

        lines.render(cameraRenderData);
        standard.render(cameraRenderData);
        text.render(cameraRenderData);
    }

    RenderLoop();
});
