
const lineSegmentCount = 2;
const lineThickness = 3 * coordMultiplier;
const lineHalfThickness = lineThickness / 2;
const lineAlpha = 1;
const nodeBorderSizeX = 16;
const nodeBorderSizeY = 16;
const nodeBoxHeight = 30;

interface Renderer
{
    setData(data: LightningGraphData): void;
    render(cameraRenderData: CameraRenderData): void;
}
