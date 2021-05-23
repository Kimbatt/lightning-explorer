
class NodeRenderer implements Renderer
{
    private program: StandardProgram;

    private nodeTexture: WebGLTexture;
    private whiteTexture: WebGLTexture;

    constructor(ctx: WebGLRenderingContext)
    {
        this.program = new StandardProgram(ctx);

        this.nodeTexture = this.program.loadImageToTexture("texture.png");
        this.whiteTexture = this.program.loadImageToTexture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=");
    }

    public render(cameraRenderData: CameraRenderData)
    {
        this.program.render(cameraRenderData);
    }

    public setData(data: LightningGraphData)
    {

    //     const nodeCount = data.nodes.length;

    //     let vertices = new Float32Array(nodeCount * 12 * 9);
    //     let vertexIndex = 0;

    //     let left0 = -1 * coordMultiplier;
    //     let left1 = left0 + (boxSizeX * 2 * windowWidthInverse) * coordMultiplier;

    //     let bottom0 = 1 * coordMultiplier;
    //     let bottom1 = bottom0 - boxSizeY * windowHeightInverse * 2 * coordMultiplier;
    //     let bottom2 = bottom0 - (boxSizeY + boxHeight) * windowHeightInverse * 2 * coordMultiplier;
    //     let bottom3 = bottom0 - (boxSizeY * 2 + boxHeight) * windowHeightInverse * 2 * coordMultiplier;

    //     let widthAddPrecalc = textPaddingX * 2 - boxSizeX * 2;

    //     for (let i = 0; i < count; ++i)
    //     {
    //         let currentNodeTextWidth = allNodesByIndex[i].renderData["textWidth"] + widthAddPrecalc;
    //         let left2 = left0 + (boxSizeX + currentNodeTextWidth) * 2 * windowWidthInverse * coordMultiplier;
    //         let left3 = left0 + (boxSizeX * 2 + currentNodeTextWidth) * 2 * windowWidthInverse * coordMultiplier;

    //         // top left
    //         vertices[vertexIndex++] = left0;
    //         vertices[vertexIndex++] = bottom0;
    //         vertices[vertexIndex++] = left0;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom0;

    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom0;
    //         vertices[vertexIndex++] = left0;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom1;

    //         // top
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom0;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom0;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom1;

    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom0;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom1;

    //         // top right
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom0;
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left3;
    //         vertices[vertexIndex++] = bottom0;

    //         vertices[vertexIndex++] = left3;
    //         vertices[vertexIndex++] = bottom0;
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left3;
    //         vertices[vertexIndex++] = bottom1;

    //         // left
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left0;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left0;
    //         vertices[vertexIndex++] = bottom2;

    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left0;
    //         vertices[vertexIndex++] = bottom2;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom2;

    //         // center
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom2;

    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom2;
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom2;

    //         // right
    //         vertices[vertexIndex++] = left3;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom2;

    //         vertices[vertexIndex++] = left3;
    //         vertices[vertexIndex++] = bottom1;
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom2;
    //         vertices[vertexIndex++] = left3;
    //         vertices[vertexIndex++] = bottom2;

    //         // bottom left
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom2;
    //         vertices[vertexIndex++] = left0;
    //         vertices[vertexIndex++] = bottom2;
    //         vertices[vertexIndex++] = left0;
    //         vertices[vertexIndex++] = bottom3;

    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom2;
    //         vertices[vertexIndex++] = left0;
    //         vertices[vertexIndex++] = bottom3;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom3;

    //         // bottom
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom2;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom2;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom3;

    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom2;
    //         vertices[vertexIndex++] = left1;
    //         vertices[vertexIndex++] = bottom3;
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom3;

    //         // bottom right
    //         vertices[vertexIndex++] = left3;
    //         vertices[vertexIndex++] = bottom2;
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom2;
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom3;

    //         vertices[vertexIndex++] = left3;
    //         vertices[vertexIndex++] = bottom2;
    //         vertices[vertexIndex++] = left2;
    //         vertices[vertexIndex++] = bottom3;
    //         vertices[vertexIndex++] = left3;
    //         vertices[vertexIndex++] = bottom3;
    //     }

    //     //ctx.enableVertexAttribArray(vLoc);
    //     ctx.bindBuffer(ctx.ARRAY_BUFFER, vertexBuffer);
    //     ctx.bufferData(ctx.ARRAY_BUFFER, vertices, ctx.STATIC_DRAW);
    //     //ctx.vertexAttribPointer(vLoc, 2, ctx.FLOAT, false, 0, 0);
    }
}
