
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

    return function()
    {
        const should = shouldRender;
        shouldRender = false;
        return should;
    };
}
