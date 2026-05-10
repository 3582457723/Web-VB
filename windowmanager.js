// windowmanager.js
// JavaScript GUI Window Manager

class Window {

    constructor(options = {}) {

        // =====================================
        // Basic
        // =====================================

        this.id =
            options.id || 0;

        this.title =
            options.title
            || "Window";

        // =====================================
        // Position
        // =====================================

        this.x =
            options.x || 100;

        this.y =
            options.y || 100;

        // =====================================
        // Size
        // =====================================

        this.width =
            options.width || 400;

        this.height =
            options.height || 300;

        // =====================================
        // State
        // =====================================

        this.visible = true;

        this.minimized = false;

        this.maximized = false;

        this.focused = false;

        // =====================================
        // Appearance
        // =====================================

        this.background =
            options.background
            || "#202020";

        this.titlebarColor =
            options.titlebarColor
            || "#404040";

        // =====================================
        // Content
        // =====================================

        this.content =
            options.content || "";

        this.canvas =
            document.createElement(
                "canvas"
            );

        this.ctx =
            this.canvas
            .getContext("2d");

        this.canvas.width =
            this.width;

        this.canvas.height =
            this.height;

        // =====================================
        // Events
        // =====================================

        this.onClose =
            options.onClose
            || (() => {});

        this.onDraw =
            options.onDraw
            || null;

        // =====================================
        // Dragging
        // =====================================

        this.dragging = false;

        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        console.log(
            "Window Created:",
            this.title
        );
    }

    // =====================================
    // Draw Window
    // =====================================

    draw(framebuffer) {

        if(
            !this.visible ||
            this.minimized
        ) {

            return;
        }

        // =====================================
        // Window Body
        // =====================================

        framebuffer.rect(

            this.x,
            this.y,

            this.width,
            this.height,

            framebuffer.rgb(
                32,
                32,
                32
            )
        );

        // =====================================
        // Title Bar
        // =====================================

        const tbColor =
            this.focused
            ? framebuffer.rgb(
                0,
                120,
                255
            )
            : framebuffer.rgb(
                64,
                64,
                64
            );

        framebuffer.rect(

            this.x,
            this.y,

            this.width,
            28,

            tbColor
        );

        // =====================================
        // Border
        // =====================================

        this.border(
            framebuffer
        );

        framebuffer.render();

        // =====================================
        // Title
        // =====================================

        framebuffer.text(

            this.x + 10,

            this.y + 20,

            this.title,

            "#FFFFFF"
        );

        // =====================================
        // Buttons
        // =====================================

        this.drawButtons(
            framebuffer
        );

        // =====================================
        // Content
        // =====================================

        if(this.onDraw) {

            this.onDraw(
                framebuffer,
                this
            );

        } else {

            framebuffer.text(

                this.x + 10,

                this.y + 50,

                this.content,

                "#FFFFFF"
            );
        }
    }

    // =====================================
    // Border
    // =====================================

    border(framebuffer) {

        const color =
            framebuffer.rgb(
                120,
                120,
                120
            );

        // Top
        framebuffer.line(

            this.x,
            this.y,

            this.x + this.width,
            this.y,

            color
        );

        // Bottom
        framebuffer.line(

            this.x,
            this.y + this.height,

            this.x + this.width,
            this.y + this.height,

            color
        );

        // Left
        framebuffer.line(

            this.x,
            this.y,

            this.x,
            this.y + this.height,

            color
        );

        // Right
        framebuffer.line(

            this.x + this.width,
            this.y,

            this.x + this.width,
            this.y + this.height,

            color
        );
    }

    // =====================================
    // Draw Buttons
    // =====================================

    drawButtons(framebuffer) {

        // Close
        framebuffer.rect(

            this.x + this.width - 30,

            this.y + 6,

            16,
            16,

            framebuffer.rgb(
                255,
                0,
                0
            )
        );

        // Minimize
        framebuffer.rect(

            this.x + this.width - 55,

            this.y + 6,

            16,
            16,

            framebuffer.rgb(
                255,
                255,
                0
            )
        );
    }

    // =====================================
    // Hit Test
    // =====================================

    contains(x, y) {

        return (

            x >= this.x &&
            y >= this.y &&

            x <= this.x + this.width &&
            y <= this.y + this.height
        );
    }

    // =====================================
    // Titlebar Hit
    // =====================================

    titlebarHit(x, y) {

        return (

            x >= this.x &&
            y >= this.y &&

            x <= this.x + this.width &&
            y <= this.y + 28
        );
    }

    // =====================================
    // Close Button
    // =====================================

    closeHit(x, y) {

        return (

            x >=
            this.x + this.width - 30 &&

            y >=
            this.y + 6 &&

            x <=
            this.x + this.width - 14 &&

            y <=
            this.y + 22
        );
    }

    // =====================================
    // Minimize Button
    // =====================================

    minimizeHit(x, y) {

        return (

            x >=
            this.x + this.width - 55 &&

            y >=
            this.y + 6 &&

            x <=
            this.x + this.width - 39 &&

            y <=
            this.y + 22
        );
    }

    // =====================================
    // Move
    // =====================================

    move(x, y) {

        this.x = x;
        this.y = y;
    }

    // =====================================
    // Resize
    // =====================================

    resize(w, h) {

        this.width = w;
        this.height = h;

        this.canvas.width = w;
        this.canvas.height = h;
    }

    // =====================================
    // Close
    // =====================================

    close() {

        this.visible = false;

        this.onClose();
    }

    // =====================================
    // Minimize
    // =====================================

    minimize() {

        this.minimized =
            !this.minimized;
    }

    // =====================================
    // Maximize
    // =====================================

    maximize(screenW, screenH) {

        this.x = 0;
        this.y = 0;

        this.width =
            screenW;

        this.height =
            screenH;

        this.maximized =
            true;
    }
}

// =====================================
// Window Manager
// =====================================

class WindowManager {

    constructor(options = {}) {

        // =====================================
        // Framebuffer
        // =====================================

        this.framebuffer =
            options.framebuffer;

        // =====================================
        // Windows
        // =====================================

        this.windows = [];

        // =====================================
        // Focused Window
        // =====================================

        this.focused = null;

        // =====================================
        // Desktop
        // =====================================

        this.wallpaper =
            framebuffer => {

                framebuffer.gradient();
            };

        // =====================================
        // Window Counter
        // =====================================

        this.nextID = 1;

        // =====================================
        // Mouse
        // =====================================

        this.mouseX = 0;
        this.mouseY = 0;

        // =====================================
        // Dragging
        // =====================================

        this.dragWindow = null;

        // =====================================
        // Init
        // =====================================

        this.installMouse();

        console.log(
            "Window Manager Ready"
        );
    }

    // =====================================
    // Create Window
    // =====================================

    createWindow(options = {}) {

        const win =
            new Window({

                ...options,

                id:
                    this.nextID++
            });

        this.windows.push(win);

        this.focus(win);

        return win;
    }

    // =====================================
    // Focus Window
    // =====================================

    focus(win) {

        for(
            const w
            of this.windows
        ) {

            w.focused = false;
        }

        win.focused = true;

        this.focused = win;

        // Bring front
        this.windows =
            this.windows.filter(

                w => w !== win
            );

        this.windows.push(win);
    }

    // =====================================
    // Draw Desktop
    // =====================================

    draw() {

        // Wallpaper
        this.wallpaper(
            this.framebuffer
        );

        // Windows
        for(
            const win
            of this.windows
        ) {

            win.draw(
                this.framebuffer
            );
        }

        // Mouse
        this.framebuffer
        .drawCursor();

        this.framebuffer
        .render();
    }

    // =====================================
    // Remove Closed
    // =====================================

    cleanup() {

        this.windows =
            this.windows.filter(

                w => w.visible
            );
    }

    // =====================================
    // Mouse Events
    // =====================================

    installMouse() {

        const canvas =
            this.framebuffer
            .canvas;

        canvas.addEventListener(

            "mousemove",

            e => {

                const rect =
                    canvas
                    .getBoundingClientRect();

                this.mouseX =
                    e.clientX - rect.left;

                this.mouseY =
                    e.clientY - rect.top;

                this.framebuffer
                .moveMouse(

                    this.mouseX,

                    this.mouseY
                );

                // Drag
                if(
                    this.dragWindow
                ) {

                    this.dragWindow
                    .move(

                        this.mouseX
                        -
                        this.dragWindow
                        .dragOffsetX,

                        this.mouseY
                        -
                        this.dragWindow
                        .dragOffsetY
                    );
                }
            }
        );

        canvas.addEventListener(

            "mousedown",

            () => {

                for(
                    let i =
                        this.windows
                        .length - 1;

                    i >= 0;

                    i--
                ) {

                    const win =
                        this.windows[i];

                    if(
                        win.contains(

                            this.mouseX,

                            this.mouseY
                        )
                    ) {

                        this.focus(win);

                        // Close
                        if(

                            win.closeHit(

                                this.mouseX,

                                this.mouseY
                            )
                        ) {

                            win.close();

                            return;
                        }

                        // Minimize
                        if(

                            win.minimizeHit(

                                this.mouseX,

                                this.mouseY
                            )
                        ) {

                            win.minimize();

                            return;
                        }

                        // Drag
                        if(

                            win.titlebarHit(

                                this.mouseX,

                                this.mouseY
                            )
                        ) {

                            this.dragWindow =
                                win;

                            win.dragOffsetX =

                                this.mouseX
                                - win.x;

                            win.dragOffsetY =

                                this.mouseY
                                - win.y;
                        }

                        return;
                    }
                }
            }
        );

        window.addEventListener(

            "mouseup",

            () => {

                this.dragWindow =
                    null;
            }
        );
    }

    // =====================================
    // Start
    // =====================================

    start() {

        const loop = () => {

            this.cleanup();

            this.draw();

            requestAnimationFrame(
                loop
            );
        };

        loop();
    }

    // =====================================
    // Desktop Icon
    // =====================================

    icon(
        x,
        y,
        name
    ) {

        this.framebuffer.rect(

            x,
            y,

            48,
            48,

            this.framebuffer.rgb(
                0,
                120,
                255
            )
        );

        this.framebuffer.text(

            x,
            y + 64,

            name,

            "#FFFFFF"
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            windows:
                this.windows.length,

            focused:
                this.focused
                ? this.focused.title
                : null
        };
    }
}