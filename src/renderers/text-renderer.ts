
const textPaddingX = 10;
const textPaddingY = 12;

interface TextRenderData
{
    width: number;
    atlasIndex: number;
    indexInAtlas: number;
}

type TextAtlas = StandardRenderData &
{
    offsetBufferData: Float32Array;
}

class TextRenderer implements Renderer
{
    private program: StandardProgram;
    private ctx: WebGLRenderingContext;
    private tctx: CanvasRenderingContext2D;

    public textRenderData: TextRenderData[] = [];
    public textAtlases: StandardRenderData[] = [];

    constructor(ctx: WebGLRenderingContext, textRenderingContext: CanvasRenderingContext2D)
    {
        this.ctx = ctx;
        this.program = new StandardProgram(ctx);
        this.tctx = textRenderingContext;
    }

    public setData(data: LightningGraphData)
    {
        this.renderTextsToTexture(data);
    }

    public render(cameraRenderData: CameraRenderData)
    {
        this.program.renderMultiple(cameraRenderData, this.textAtlases);
    }

    private createTextureFromCanvas(vertexData: number[], uvData: number[], offsetData: number[], colorData: number[]): TextAtlas
    {
        const texture = this.ctx.createTexture() ?? WebGLThrowError("texture");
        this.ctx.bindTexture(this.ctx.TEXTURE_2D, texture);
        this.ctx.texImage2D(this.ctx.TEXTURE_2D, 0, this.ctx.RGBA, this.ctx.RGBA, this.ctx.UNSIGNED_BYTE, this.tctx.canvas);
        this.ctx.generateMipmap(this.ctx.TEXTURE_2D);
        this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_S, this.ctx.CLAMP_TO_EDGE);
        this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_WRAP_T, this.ctx.CLAMP_TO_EDGE);
        this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MAG_FILTER, this.ctx.LINEAR);
        this.ctx.texParameteri(this.ctx.TEXTURE_2D, this.ctx.TEXTURE_MIN_FILTER, this.ctx.LINEAR_MIPMAP_LINEAR);

        const vertexBufferData = new Float32Array(vertexData);
        const uvBufferData = new Float32Array(uvData);
        const offsetBufferData = new Float32Array(offsetData);
        const colorBufferData = new Float32Array(colorData);

        const vertexBuffer = this.ctx.createBuffer() ?? WebGLThrowError("vertexBuffer");
        const uvBuffer = this.ctx.createBuffer() ?? WebGLThrowError("uvBuffer");
        const offsetBuffer = this.ctx.createBuffer() ?? WebGLThrowError("offsetBuffer");
        const colorBuffer = this.ctx.createBuffer() ?? WebGLThrowError("colorBuffer");

        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, vertexBuffer);
        this.ctx.bufferData(this.ctx.ARRAY_BUFFER, vertexBufferData, this.ctx.STATIC_DRAW);

        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, uvBuffer);
        this.ctx.bufferData(this.ctx.ARRAY_BUFFER, uvBufferData, this.ctx.STATIC_DRAW);

        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, offsetBuffer);
        this.ctx.bufferData(this.ctx.ARRAY_BUFFER, offsetBufferData, this.ctx.STATIC_DRAW);

        this.ctx.bindBuffer(this.ctx.ARRAY_BUFFER, colorBuffer);
        this.ctx.bufferData(this.ctx.ARRAY_BUFFER, colorBufferData, this.ctx.STATIC_DRAW);

        return {
            texture,

            vertexBuffer,
            uvBuffer,
            offsetBuffer,
            colorBuffer,

            count: vertexBufferData.length / vertexSize,
            offsetBufferData: offsetBufferData
        };
    }

    private renderTextsToTexture(data: LightningGraphData)
    {
        const maxTextureSize = 2048;
        const maxTextureSizeInverse = 1 / maxTextureSize;

        this.tctx.canvas.width = maxTextureSize;
        this.tctx.canvas.height = maxTextureSize;

        this.tctx.font = baseFontSize + "px Verdana";
        this.tctx.textBaseline = "bottom";

        // TEMP
        this.tctx.fillStyle = "white";
        this.tctx.fillRect(0, 0, maxTextureSize, maxTextureSize);

        let atlasIndex = 0;
        let indexInAtlas = 0;

        const padding = 4;
        const stepX = padding;
        const stepY = baseFontSize + padding;

        let offsetX = 0;
        const startingOffsetY = maxTextureSize - padding;
        let offsetY = startingOffsetY;

        const vertexSizeMultiplier = 0.01;

        const vertexData: number[] = [];
        const uvData: number[] = [];
        const offsetData: number[] = [];
        const colorData: number[] = [];

        for (let i = 0; i < data.nodes.length; ++i)
        {
            const node = data.nodes[i];
            const alias = node.alias === null || node.alias === "" ? node.pubKey.substr(0, 20) : node.alias;

            const textWidth = this.tctx.measureText(alias).width;

            this.textRenderData.push({
                width: textWidth,
                atlasIndex,
                indexInAtlas
            });

            if (offsetX + textWidth + stepX > maxTextureSize)
            {
                // row is full
                offsetX = 0;
                offsetY -= stepY;
            }

            if (offsetY - stepY < 0)
            {
                // canvas is full, create a texture
                this.textAtlases.push(this.createTextureFromCanvas(vertexData, uvData, offsetData, colorData));

                // TEMP
                this.tctx.fillStyle = "white";
                this.tctx.fillRect(0, 0, maxTextureSize, maxTextureSize);
                // this.tctx.clearRect(0, 0, maxTextureSize, maxTextureSize);

                vertexData.length = 0;
                uvData.length = 0;
                offsetData.length = 0;

                offsetY = startingOffsetY;

                ++atlasIndex;
                indexInAtlas = 0;
            }

            this.tctx.fillStyle = "black";
            this.tctx.fillText(alias, offsetX, offsetY);

            const sizeX = textWidth + padding;
            const sizeY = stepY + padding;
            const right = sizeX * 0.5 * vertexSizeMultiplier;
            const top = sizeY * 0.5 * vertexSizeMultiplier;
            const left = -right;
            const bottom = -top;

            vertexData.push(left);
            vertexData.push(bottom);
            vertexData.push(right);
            vertexData.push(bottom);
            vertexData.push(left);
            vertexData.push(top);

            vertexData.push(right);
            vertexData.push(bottom);
            vertexData.push(right);
            vertexData.push(top);
            vertexData.push(left);
            vertexData.push(top);

            const uvLeft = offsetX * maxTextureSizeInverse;
            const uvBottom = (offsetY - sizeY) * maxTextureSizeInverse;
            const uvRight = (offsetX + textWidth) * maxTextureSizeInverse;
            const uvTop = offsetY * maxTextureSizeInverse;

            uvData.push(uvLeft);
            uvData.push(uvTop);
            uvData.push(uvRight);
            uvData.push(uvTop);
            uvData.push(uvLeft);
            uvData.push(uvBottom);

            uvData.push(uvRight);
            uvData.push(uvTop);
            uvData.push(uvRight);
            uvData.push(uvBottom);
            uvData.push(uvLeft);
            uvData.push(uvBottom);

            // 6 vertices * 4 color components
            for (let i = 0; i < 24; ++i)
            {
                colorData.push(1);
            }

            for (let i = 0; i < 6; ++i)
            {
                offsetData.push(node.positionX);
                offsetData.push(node.positionY);
            }

            offsetX += textWidth + stepX;
            ++indexInAtlas;
        }

        if (vertexData.length !== 0)
        {
            // last one
            this.textAtlases.push(this.createTextureFromCanvas(vertexData, uvData, offsetData, colorData));
        }
    }

}