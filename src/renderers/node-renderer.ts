
class NodeRenderer
{
    private program: StandardProgram;

    private nodeTexture: WebGLTexture | null = null;

    constructor(ctx: WebGLRenderingContext)
    {
        this.program = new StandardProgram(ctx);
    }

    public async loadTexture()
    {
        if (this.nodeTexture === null)
        {
            this.nodeTexture = await this.program.loadImageToTexture("texture.png");
        }
    }

    public render(cameraRenderData: CameraRenderData)
    {
        this.program.render(cameraRenderData, this.nodeTexture);
    }

    public setData(data: LightningGraphData, textRenderData: TextRenderData[])
    {
        const nodeCount = data.nodes.length;

        // 6 vertices per "square", 9 "squares" in a 3x3 grid
        const vertices = new Float32Array(nodeCount * vertexSize * 6 * 9);
        let vertexIndex = 0;
        const uvs = new Float32Array(nodeCount * uvSize * 6 * 9);
        let uvIndex = 0;
        const offsets = new Float32Array(nodeCount * vertexSize * 6 * 9);
        let offsetIndex = 0;
        const offsetCountPerNode = 2 * 6 * 9; // 2 - offset size

        /*

          left0                left2
            +---+----------------+---+ bottom3
            |   |                |   |
    bottom2 +---+----------------+---+
            |   |                |   |
            |   |      text      |   |
            |   |                |   |
            +---+----------------+---+ bottom1
            |   |                |   |
    bottom0 +---+----------------+---+
          left1                left3

        */

        for (let i = 0; i < data.nodes.length; ++i)
        {
            const node = data.nodes[i];
            const textData = textRenderData[i];

            const left0 = -textData.halfSizeX - nodeBorderSizeX;
            const left1 = -textData.halfSizeX;
            const left2 = textData.halfSizeX;
            const left3 = textData.halfSizeX + nodeBorderSizeX;

            const bottom3 = -textData.halfSizeY - nodeBorderSizeY;
            const bottom2 = -textData.halfSizeY;
            const bottom1 = textData.halfSizeY;
            const bottom0 = textData.halfSizeY + nodeBorderSizeY;

            // top left
            vertices[vertexIndex++] = left0;
            vertices[vertexIndex++] = bottom0;
            vertices[vertexIndex++] = left0;
            vertices[vertexIndex++] = bottom1;
            vertices[vertexIndex++] = left1;
            vertices[vertexIndex++] = bottom0;

            vertices[vertexIndex++] = left1;
            vertices[vertexIndex++] = bottom0;
            vertices[vertexIndex++] = left0;
            vertices[vertexIndex++] = bottom1;
            vertices[vertexIndex++] = left1;
            vertices[vertexIndex++] = bottom1;

            // top
            vertices[vertexIndex++] = left2;
            vertices[vertexIndex++] = bottom0;
            vertices[vertexIndex++] = left1;
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
            vertices[vertexIndex++] = left2;
            vertices[vertexIndex++] = bottom1;
            vertices[vertexIndex++] = left3;
            vertices[vertexIndex++] = bottom0;

            vertices[vertexIndex++] = left3;
            vertices[vertexIndex++] = bottom0;
            vertices[vertexIndex++] = left2;
            vertices[vertexIndex++] = bottom1;
            vertices[vertexIndex++] = left3;
            vertices[vertexIndex++] = bottom1;

            // left
            vertices[vertexIndex++] = left1;
            vertices[vertexIndex++] = bottom1;
            vertices[vertexIndex++] = left0;
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
            vertices[vertexIndex++] = left2;
            vertices[vertexIndex++] = bottom1;
            vertices[vertexIndex++] = left1;
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
            vertices[vertexIndex++] = left3;
            vertices[vertexIndex++] = bottom1;
            vertices[vertexIndex++] = left2;
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
            vertices[vertexIndex++] = left1;
            vertices[vertexIndex++] = bottom2;
            vertices[vertexIndex++] = left0;
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
            vertices[vertexIndex++] = left2;
            vertices[vertexIndex++] = bottom2;
            vertices[vertexIndex++] = left1;
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
            vertices[vertexIndex++] = left3;
            vertices[vertexIndex++] = bottom2;
            vertices[vertexIndex++] = left2;
            vertices[vertexIndex++] = bottom2;
            vertices[vertexIndex++] = left2;
            vertices[vertexIndex++] = bottom3;

            vertices[vertexIndex++] = left3;
            vertices[vertexIndex++] = bottom2;
            vertices[vertexIndex++] = left2;
            vertices[vertexIndex++] = bottom3;
            vertices[vertexIndex++] = left3;
            vertices[vertexIndex++] = bottom3;

            uvIndex = this.setNodeUVs(uvs, uvIndex, false);

            for (let j = 0; j < offsetCountPerNode; ++j)
            {
                offsets[offsetIndex++] = node.positionX;
                offsets[offsetIndex++] = node.positionY;
            }
        }

        this.program.setData(vertices, uvs, offsets);
    }

    private setNodeUVs(nodeUVs: Float32Array, uvIndex: number, isHighlighted: boolean)
    {
        const offsetX = isHighlighted ? 0.5 : 0;
        const uvLeft = 0 + offsetX;
        const uvRight = 0.25 + offsetX;
        const uvBottom = 1;
        const uvTop = 0;

        // top left
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvTop;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvTop;
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvBottom;

        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvTop;
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;

        // top
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvTop;
        nodeUVs[uvIndex++] = uvRight + 0.01;
        nodeUVs[uvIndex++] = uvTop;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;

        nodeUVs[uvIndex++] = uvRight + 0.01;
        nodeUVs[uvIndex++] = uvTop;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvRight + 0.01;
        nodeUVs[uvIndex++] = uvBottom;

        // top right
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvTop;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvTop;

        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvTop;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvBottom;

        // left
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom - 0.01;
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvBottom - 0.01;
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvBottom;

        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom - 0.01;
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;

        // center
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom - 0.01;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvRight + 0.01;
        nodeUVs[uvIndex++] = uvBottom - 0.01;

        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom - 0.01;
        nodeUVs[uvIndex++] = uvRight + 0.01;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;

        // right
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvBottom - 0.01;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom - 0.01;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;

        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvBottom - 0.01;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvBottom;

        // bottom left
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvTop;

        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvTop;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvTop;

        // bottom
        nodeUVs[uvIndex++] = uvRight + 0.01;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvTop;

        nodeUVs[uvIndex++] = uvRight + 0.01;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvTop;
        nodeUVs[uvIndex++] = uvRight + 0.01;
        nodeUVs[uvIndex++] = uvTop;

        // bottom right
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvTop;

        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvBottom;
        nodeUVs[uvIndex++] = uvRight;
        nodeUVs[uvIndex++] = uvTop;
        nodeUVs[uvIndex++] = uvLeft;
        nodeUVs[uvIndex++] = uvTop;

        return uvIndex;
    }
}
