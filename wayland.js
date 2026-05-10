// wayland.js
// JavaScript Wayland-like Display Server

class WaylandSurface {

    constructor(options = {}) {

        // =====================================
        // Basic
        // =====================================

        this.id =
            crypto.randomUUID();

        this.title =
            options.title
            || "Wayland Window";

        // =====================================
        // Geometry
        // =====================================

        this.x =
            options.x || 0;

        this.y =
            options.y || 0;

        this.width =
            options.width || 640;

        this.height =
            options.height || 480;

        // =====================================
        // Canvas
        // =====================================

        this.canvas =
            document.createElement(
                "canvas"
            );

        this.canvas.width =
            this.width;

        this.canvas.height =
            this.height;

        this.ctx =
            this.canvas
            .getContext("2d");

        // =====================================
        // State
        // =====================================

        this.visible = true;

        this.fullscreen = false;

        this.minimized = false;

        this.maximized = false;

        // =====================================
        // Input
        // =====================================

        this.keyboardFocus =
            false;

        this.pointerFocus =
            false;

        // =====================================
        // Buffers
        // =====================================

        this.buffer = null;

        console.log(
            "WaylandSurface:",
            this.title
        );
    }

    // =====================================
    // Attach Buffer
    // =====================================

    attach(buffer) {

        this.buffer = buffer;
    }

    // =====================================
    // Commit
    // =====================================

    commit() {

        if(!this.buffer) {

            return;
        }

        this.ctx.putImageData(

            this.buffer,

            0,

            0
        );
    }

    // =====================================
    // Resize
    // =====================================

    resize(
        width,
        height
    ) {

        this.width = width;

        this.height = height;

        this.canvas.width =
            width;

        this.canvas.height =
            height;
    }

    // =====================================
    // Move
    // =====================================

    move(x, y) {

        this.x = x;

        this.y = y;
    }

    // =====================================
    // Show
    // =====================================

    show() {

        this.visible = true;
    }

    // =====================================
    // Hide
    // =====================================

    hide() {

        this.visible = false;
    }

    // =====================================
    // Draw Text
    // =====================================

    drawText(
        text,
        x,
        y
    ) {

        this.ctx.fillStyle =
            "white";

        this.ctx.font =
            "16px monospace";

        this.ctx.fillText(

            text,

            x,

            y
        );
    }

    // =====================================
    // Fill
    // =====================================

    fill(color = "black") {

        this.ctx.fillStyle =
            color;

        this.ctx.fillRect(

            0,
            0,

            this.width,

            this.height
        );
    }
}

// =====================================
// Wayland Client
// =====================================

class WaylandClient {

    constructor(server) {

        this.server = server;

        this.surfaces = [];

        console.log(
            "Wayland Client"
        );
    }

    // =====================================
    // Create Surface
    // =====================================

    createSurface(options = {}) {

        const surface =
            new WaylandSurface(
                options
            );

        this.surfaces.push(
            surface
        );

        this.server.addSurface(
            surface
        );

        return surface;
    }
}

// =====================================
// Wayland Compositor
// =====================================

class WaylandCompositor {

    constructor(options = {}) {

        // =====================================
        // Display
        // =====================================

        this.canvas =
            options.canvas
            ||
            document.createElement(
                "canvas"
            );

        this.canvas.width =
            options.width || 1280;

        this.canvas.height =
            options.height || 720;

        this.ctx =
            this.canvas
            .getContext("2d");

        // =====================================
        // Surfaces
        // =====================================

        this.surfaces = [];

        // =====================================
        // Input
        // =====================================

        this.pointer = {

            x: 0,
            y: 0
        };

        this.keyboard = {};

        // =====================================
        // Focus
        // =====================================

        this.focusedSurface =
            null;

        // =====================================
        // Background
        // =====================================

        this.background =
            "#202020";

        // =====================================
        // Running
        // =====================================

        this.running = false;

        console.log(
            "Wayland Compositor Ready"
        );

        this.initInput();
    }

    // =====================================
    // Add Surface
    // =====================================

    addSurface(surface) {

        this.surfaces.push(
            surface
        );

        this.focusedSurface =
            surface;

        console.log(
            "Surface Added:",
            surface.title
        );
    }

    // =====================================
    // Remove Surface
    // =====================================

    removeSurface(id) {

        this.surfaces =
            this.surfaces.filter(

                s => s.id !== id
            );
    }

    // =====================================
    // Render
    // =====================================

    render() {

        // Background
        this.ctx.fillStyle =
            this.background;

        this.ctx.fillRect(

            0,
            0,

            this.canvas.width,

            this.canvas.height
        );

        // Draw Surfaces
        for(
            const s
            of this.surfaces
        ) {

            if(!s.visible) {

                continue;
            }

            this.ctx.drawImage(

                s.canvas,

                s.x,

                s.y
            );

            // Border
            this.ctx.strokeStyle =
                (
                    s ===
                    this.focusedSurface
                )
                ?
                "#00ff00"
                :
                "#666";

            this.ctx.strokeRect(

                s.x,
                s.y,

                s.width,
                s.height
            );

            // Title
            this.ctx.fillStyle =
                "white";

            this.ctx.font =
                "14px sans-serif";

            this.ctx.fillText(

                s.title,

                s.x + 5,

                s.y - 5
            );
        }

        // Cursor
        this.drawCursor();
    }

    // =====================================
    // Cursor
    // =====================================

    drawCursor() {

        this.ctx.fillStyle =
            "white";

        this.ctx.beginPath();

        this.ctx.arc(

            this.pointer.x,

            this.pointer.y,

            4,

            0,

            Math.PI * 2
        );

        this.ctx.fill();
    }

    // =====================================
    // Focus
    // =====================================

    focus(surface) {

        this.focusedSurface =
            surface;

        // Bring to front
        this.surfaces =
            this.surfaces.filter(

                s => s !== surface
            );

        this.surfaces.push(
            surface
        );
    }

    // =====================================
    // Input
    // =====================================

    initInput() {

        // Mouse
        window.addEventListener(

            "mousemove",

            e => {

                this.pointer.x =
                    e.clientX;

                this.pointer.y =
                    e.clientY;
            }
        );

        // Click
        window.addEventListener(

            "mousedown",

            e => {

                for(
                    let i =
                    this.surfaces.length - 1;

                    i >= 0;

                    i--
                ) {

                    const s =
                        this.surfaces[i];

                    if(

                        this.pointer.x
                        >= s.x

                        &&

                        this.pointer.x
                        <= s.x + s.width

                        &&

                        this.pointer.y
                        >= s.y

                        &&

                        this.pointer.y
                        <= s.y + s.height
                    ) {

                        this.focus(s);

                        break;
                    }
                }
            }
        );

        // Keyboard
        window.addEventListener(

            "keydown",

            e => {

                this.keyboard[
                    e.key
                ] = true;

                if(
                    this.focusedSurface
                ) {

                    console.log(

                        `[WAYLAND] Key:`,
                        e.key
                    );
                }
            }
        );

        window.addEventListener(

            "keyup",

            e => {

                this.keyboard[
                    e.key
                ] = false;
            }
        );
    }

    // =====================================
    // Start
    // =====================================

    start() {

        this.running = true;

        const loop = () => {

            if(!this.running) {

                return;
            }

            this.render();

            requestAnimationFrame(
                loop
            );
        };

        loop();

        console.log(
            "Wayland Started"
        );
    }

    // =====================================
    // Stop
    // =====================================

    stop() {

        this.running = false;
    }

    // =====================================
    // Create Client
    // =====================================

    createClient() {

        return new WaylandClient(
            this
        );
    }

    // =====================================
    // Screenshot
    // =====================================

    screenshot() {

        return this.canvas
        .toDataURL();
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            surfaces:
                this.surfaces.length,

            focused:
                this.focusedSurface
                ?.title,

            resolution:
                `${this.canvas.width}x${this.canvas.height}`
        };
    }
}