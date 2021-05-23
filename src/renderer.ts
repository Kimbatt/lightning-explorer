
const lineSegmentCount = 2;
const lineThickness = 3 * coordMultiplier;
const lineHalfThickness = lineThickness / 2;
const lineAlpha = 1;
const nodeBorderSizeX = 16;
const nodeBorderSizeY = 16;
const nodeBoxHeight = 30;

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

    public render(cameraRenderData: CameraRenderData)
    {

    }

    private createNode()
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

    public render(cameraRenderData: CameraRenderData)
    {

    }
}

class LineRenderer implements Renderer
{
    private program: LinesProgram;

    constructor(program: LinesProgram)
    {
        this.program = program;
    }

    public setData(data: LightningGraphData)
    {
        // 6 vertices per segment
        const verticesPerHalfLine = 6 * lineSegmentCount;
        const verticesPerLine = 2 * verticesPerHalfLine;
        const vertexCount = data.uniqueChannelCount * verticesPerLine;
        const vertexBuffer = new Float32Array(vertexCount * vertexSize);
        const colorBuffer = new Float32Array(vertexCount * colorSize);

        let vertexBufferIndex = 0;
        let colorBufferIndex = 0;

        const v1 = new Vector2();
        const v2 = new Vector2();

        const direction = new Vector2();
        const perpendicular = new Vector2();

        const cornerBottomLeft = new Vector2();
        const cornerBottomRight = new Vector2();
        const cornerTopLeft = new Vector2();
        const cornerTopRight = new Vector2();

        const tmpVec1 = new Vector2();
        const tmpVec2 = new Vector2();
        const tmpVec3 = new Vector2();
        const tmpVec4 = new Vector2();

        for (const node of data.nodes)
        {
            for (const neighbor of node.neighbors)
            {
                // add vertices in world space

                const node1 = node;
                const node2 = neighbor;

                v1.set(node1.positionX, node1.positionY);
                v2.set(node2.positionX, node2.positionY);

                // `direction` is going from `v1` to `v2`
                direction.subVectors(v2, v1);

                // `perpendicular` is perpendicular to `direction`, and its length is `lineHalfThickness`
                perpendicular.set(direction.y, -direction.x).divScalar(direction.length()).mulScalar(lineHalfThickness);

                tmpVec1.copy(perpendicular).mulScalar(lineHalfThickness);
                cornerBottomLeft.subVectors(v1, tmpVec1);
                cornerBottomRight.addVectors(v1, tmpVec1);
                cornerTopLeft.copy(cornerBottomLeft).add(direction);
                cornerTopRight.copy(cornerBottomRight).add(direction);

                function AddVertices(startT: number, endT: number)
                {
                    const prev1 = tmpVec1.copy(cornerBottomLeft);
                    const prev2 = tmpVec2.copy(cornerBottomRight);

                    for (let i = 1; i <= lineSegmentCount; ++i)
                    {
                        const t = Lerp(startT, endT, i / lineSegmentCount);

                        const current1 = Vector2.lerp(cornerBottomLeft, cornerTopLeft, t, tmpVec3);
                        const current2 = Vector2.lerp(cornerBottomRight, cornerTopRight, t, tmpVec4);

                        /*

                        3   5
                      2 +---+
                        |\  |
                        | \ |
                        |  \|
                        +---+ 4
                        0   1

                        */

                        vertexBuffer[vertexBufferIndex++] = prev1.x;
                        vertexBuffer[vertexBufferIndex++] = prev1.y;
                        vertexBuffer[vertexBufferIndex++] = prev2.x;
                        vertexBuffer[vertexBufferIndex++] = prev2.y;
                        vertexBuffer[vertexBufferIndex++] = current1.x;
                        vertexBuffer[vertexBufferIndex++] = current1.y;

                        vertexBuffer[vertexBufferIndex++] = current1.x;
                        vertexBuffer[vertexBufferIndex++] = current1.y;
                        vertexBuffer[vertexBufferIndex++] = prev2.x;
                        vertexBuffer[vertexBufferIndex++] = prev2.y;
                        vertexBuffer[vertexBufferIndex++] = current2.x;
                        vertexBuffer[vertexBufferIndex++] = current2.y;

                        prev1.copy(current1);
                        prev2.copy(current2);
                    }
                }

                AddVertices(0.0, 0.5); // bottom half
                AddVertices(0.5, 1.0); // top half

                function AddColor(color: number)
                {
                    const r = ((color >>> 16) & 0xff) / 255.0;
                    const g = ((color >>> 8) & 0xff) / 255.0;
                    const b = (color & 0xff) / 255.0;

                    for (let i = 0; i < verticesPerHalfLine; ++i)
                    {
                        colorBuffer[colorBufferIndex++] = r;
                        colorBuffer[colorBufferIndex++] = g;
                        colorBuffer[colorBufferIndex++] = b;
                        colorBuffer[colorBufferIndex++] = lineAlpha;
                    }
                }

                AddColor(node2.color);
                AddColor(node1.color);
            }
        }

        this.program.setData(vertexBuffer, colorBuffer);
    }

    public render(cameraRenderData: CameraRenderData)
    {
        this.program.render(cameraRenderData);
    }
}
