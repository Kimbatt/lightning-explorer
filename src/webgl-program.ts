
function NumberToWebGLSource(num: number)
{
    if (Number.isInteger(num))
    {
        return num.toFixed(1);
    }
    else
    {
        return num.toString();
    }
}

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
attribute vec2 aVertex; // world space
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
