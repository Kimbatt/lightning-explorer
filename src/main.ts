
// constants
const baseFontSize = 48;
const coordMultiplier = 0.0625; // reduce this for increased precision

const zoomSpeed = 1.1;
const startingZoom = 0.25 / coordMultiplier * 100;
const maxZoom = startingZoom * 1000, minZoom = startingZoom * 0.001;

const vertexSize = 2;
const colorSize = 4;
const uvSize = 2;

// camera render data
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

window.addEventListener("load", async () =>
{
    const canvas = <HTMLCanvasElement>document.getElementById("canvas");
    const ctx = canvas.getContext("webgl")!;

    const textCanvas = document.createElement("canvas");
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


    const { nodeRenderer, textRenderer, lineRenderer } = (() =>
    {
        // WebGL init

        ctx.enable(ctx.BLEND);
        ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA);

        // TODO: enable this in the final version
        // there should be no need to do backface culling,
        // since everything is 2d, and every triangle is rendered anyways
        // ctx.disable(ctx.CULL_FACE);
        ctx.enable(ctx.CULL_FACE);
        ctx.cullFace(ctx.BACK);

        ctx.clearColor(0.2, 0.2, 0.2, 1);

        return {
            nodeRenderer: new NodeRenderer(ctx),
            textRenderer: new TextRenderer(ctx, tctx),
            lineRenderer: new LineRenderer(ctx)
        };
    })();

    const [nodeData] = await Promise.all([LoadNodeData(), nodeRenderer.loadTexture()]);

    lineRenderer.setData(nodeData);
    textRenderer.setData(nodeData);
    nodeRenderer.setData(nodeData, textRenderer.textRenderData);

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

        lineRenderer.render(cameraRenderData);
        nodeRenderer.render(cameraRenderData);
        textRenderer.render(cameraRenderData);
    }

    RenderLoop();
});
