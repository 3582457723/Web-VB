// x11.js
// Minimal X11-like Window System

class X11Event {

    constructor(type, data = {}) {

        this.type = type;

        this.timestamp =
            Date.now();

        Object.assign(
            this,
            data
        );
    }
}

// =====================================
// X11 Window
// =====================================

class X11Window {

    constructor(options = {}) {

        // =====================================
        // Basic
        // =====================================

        this.id =
            options.id || 0;

        this.title =
            options.title
            || "X11 Window";

        // =====================================
        // Geometry
        // =====================================

        this.x =
            options.x || 0;

        this.y =
            options.y || 0;

        this.width =
            options.width || 320;

        this.height =
            options.height || 240;

        // =====================================
        // Visibility
        // =====================================

        this.visible = true;

        this.mapped = false;

        // =====================================
        // Event Queue
        // =====================================

        this.events = [];

        // =====================================
        // Drawing Callback
        // =====================================

        this.onDraw =
            options.onDraw
            || null;

        // =====================================
        // Event Callback
        // =====================================

        this.onEvent =
            options.onEvent
            || null;

        // =====================================
        // Backing Store
        // =====================================

        this.buffer =
            document
            .createElement(
                "canvas"
            );

        this.buffer.width =
            this.width;

        this.buffer.height =
            this.height;

        this.ctx =
            this.buffer
            .getContext("2d");

        // =====================================
        // Colors
        // =====================================

        this.background =
            "#202020";

        this.foreground =
            "#FFFFFF";

        // =====================================
        // Parent
        // =====================================

        this.parent =
            null;

        // =====================================
        // Children
        // =====================================

        this.children = [];

        console.log(
            "X11 Window:",
            this.title
        );
    }

    // =====================================
    // Map Window
    // =====================================

    map() {

        this.mapped = true;

        this.sendEvent(

            new X11Event(
                "MapNotify"
            )
        );
    }

    // =====================================
    // Unmap Window
    // =====================================

    unmap() {

        this.mapped = false;

        this.sendEvent(

            new X11Event(
                "UnmapNotify"
            )
        );
    }

    // =====================================
    // Resize
    // =====================================

    resize(w, h) {

        this.width = w;
        this.height = h;

        this.buffer.width = w;
        this.buffer.height = h;

        this.sendEvent(

            new X11Event(

                "ConfigureNotify",

                {
                    width: w,
                    height: h
                }
            )
        );
    }

    // =====================================
    // Move
    // =====================================

    move(x, y) {

        this.x = x;
        this.y = y;

        this.sendEvent(

            new X11Event(

                "MoveNotify",

                { x, y }
            )
        );
    }

    // =====================================
    // Draw
    // =====================================

    draw(framebuffer) {

        if(
            !this.visible ||
            !this.mapped
        ) {

            return;
        }

        framebuffer.render();

        framebuffer.ctx.drawImage(

            this.buffer,

            this.x,

            this.y
        );

        // Client draw
        if(this.onDraw) {

            this.onDraw(this);
        }
    }

    // =====================================
    // Clear
    // =====================================

    clear() {

        this.ctx.fillStyle =
            this.background;

        this.ctx.fillRect(

            0,
            0,

            this.width,
            this.height
        );
    }

    // =====================================
    // Draw Text
    // =====================================

    text(
        x,
        y,
        text,
        color = "#FFFFFF"
    ) {

        this.ctx.fillStyle =
            color;

        this.ctx.font =
            "16px monospace";

        this.ctx.fillText(
            text,
            x,
            y
        );
    }

    // =====================================
    // Rectangle
    // =====================================

    rect(
        x,
        y,
        w,
        h,
        color
    ) {

        this.ctx.fillStyle =
            color;

        this.ctx.fillRect(
            x,
            y,
            w,
            h
        );
    }

    // =====================================
    // Send Event
    // =====================================

    sendEvent(event) {

        this.events.push(event);

        if(this.onEvent) {

            this.onEvent(event);
        }
    }

    // =====================================
    // Poll Event
    // =====================================

    pollEvent() {

        return this.events.shift();
    }

    // =====================================
    // Add Child
    // =====================================

    addChild(win) {

        win.parent = this;

        this.children.push(win);
    }

    // =====================================
    // Destroy
    // =====================================

    destroy() {

        this.visible = false;

        this.sendEvent(

            new X11Event(
                "DestroyNotify"
            )
        );
    }
}

// =====================================
// X11 Server
// =====================================

class X11Server {

    constructor(options = {}) {

        // =====================================
        // Framebuffer
        // =====================================

        this.framebuffer =
            options.framebuffer;

        // =====================================
        // Window Manager
        // =====================================

        this.windowManager =
            options.windowManager;

        // =====================================
        // Windows
        // =====================================

        this.windows = [];

        // =====================================
        // Root Window
        // =====================================

        this.root =
            new X11Window({

                id: 0,

                title:
                    "Root Window",

                x: 0,
                y: 0,

                width:
                    this.framebuffer
                    .width,

                height:
                    this.framebuffer
                    .height
            });

        this.root.map();

        // =====================================
        // Window ID Counter
        // =====================================

        this.nextID = 1;

        // =====================================
        // Clients
        // =====================================

        this.clients = [];

        // =====================================
        // Keyboard State
        // =====================================

        this.keys = {};

        // =====================================
        // Mouse
        // =====================================

        this.mouseX = 0;
        this.mouseY = 0;

        // =====================================
        // Install Input
        // =====================================

        this.installInput();

        console.log(
            "X11 Server Ready"
        );
    }

    // =====================================
    // Create Window
    // =====================================

    createWindow(options = {}) {

        const win =
            new X11Window({

                ...options,

                id:
                    this.nextID++
            });

        this.windows.push(win);

        return win;
    }

    // =====================================
    // Destroy Window
    // =====================================

    destroyWindow(id) {

        const win =
            this.windows.find(

                w => w.id === id
            );

        if(!win) {

            return false;
        }

        win.destroy();

        this.windows =
            this.windows.filter(

                w => w.id !== id
            );

        return true;
    }

    // =====================================
    // Map Window
    // =====================================

    mapWindow(id) {

        const win =
            this.getWindow(id);

        if(win) {

            win.map();
        }
    }

    // =====================================
    // Get Window
    // =====================================

    getWindow(id) {

        return this.windows.find(

            w => w.id === id
        );
    }

    // =====================================
    // Draw
    // =====================================

    draw() {

        // Clear desktop
        this.framebuffer
        .gradient();

        // Draw windows
        for(
            const win
            of this.windows
        ) {

            win.draw(
                this.framebuffer
            );
        }

        // Mouse Cursor
        this.framebuffer
        .drawCursor();

        this.framebuffer
        .render();
    }

    // =====================================
    // Event Broadcast
    // =====================================

    broadcast(event) {

        for(
            const win
            of this.windows
        ) {

            win.sendEvent(event);
        }
    }

    // =====================================
    // Install Input
    // =====================================

    installInput() {

        // =====================================
        // Keyboard
        // =====================================

        window.addEventListener(

            "keydown",

            e => {

                this.keys[e.key] =
                    true;

                this.broadcast(

                    new X11Event(

                        "KeyPress",

                        {
                            key:
                                e.key
                        }
                    )
                );
            }
        );

        window.addEventListener(

            "keyup",

            e => {

                this.keys[e.key] =
                    false;

                this.broadcast(

                    new X11Event(

                        "KeyRelease",

                        {
                            key:
                                e.key
                        }
                    )
                );
            }
        );

        // =====================================
        // Mouse
        // =====================================

        this.framebuffer
        .canvas
        .addEventListener(

            "mousemove",

            e => {

                const rect =
                    this.framebuffer
                    .canvas
                    .getBoundingClientRect();

                this.mouseX =
                    e.clientX
                    - rect.left;

                this.mouseY =
                    e.clientY
                    - rect.top;

                this.framebuffer
                .moveMouse(

                    this.mouseX,

                    this.mouseY
                );

                this.broadcast(

                    new X11Event(

                        "MotionNotify",

                        {
                            x:
                                this.mouseX,

                            y:
                                this.mouseY
                        }
                    )
                );
            }
        );

        this.framebuffer
        .canvas
        .addEventListener(

            "mousedown",

            () => {

                this.broadcast(

                    new X11Event(

                        "ButtonPress",

                        {
                            x:
                                this.mouseX,

                            y:
                                this.mouseY
                        }
                    )
                );
            }
        );

        this.framebuffer
        .canvas
        .addEventListener(

            "mouseup",

            () => {

                this.broadcast(

                    new X11Event(

                        "ButtonRelease",

                        {
                            x:
                                this.mouseX,

                            y:
                                this.mouseY
                        }
                    )
                );
            }
        );
    }

    // =====================================
    // Create Client
    // =====================================

    createClient(name) {

        const client = {

            id:
                this.clients.length
                + 1,

            name,

            connected: true
        };

        this.clients.push(client);

        console.log(
            "X11 Client:",
            name
        );

        return client;
    }

    // =====================================
    // Start
    // =====================================

    start() {

        const loop = () => {

            this.draw();

            requestAnimationFrame(
                loop
            );
        };

        loop();
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            windows:
                this.windows.length,

            clients:
                this.clients.length,

            resolution:
                `${this.framebuffer.width}x${this.framebuffer.height}`
        };
    }
}