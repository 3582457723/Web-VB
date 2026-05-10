// compositor.js
// GPU Window Compositor + Effects Engine

class CompositorWindow {

    constructor(windowRef) {

        // =====================================
        // Original Window
        // =====================================

        this.window =
            windowRef;

        // =====================================
        // Visual State
        // =====================================

        this.opacity = 1.0;

        this.visible = true;

        this.blur = false;

        this.shadow = true;

        this.rounded = true;

        // =====================================
        // Animation
        // =====================================

        this.animating = false;

        this.animationTime = 0;

        this.targetX =
            windowRef.x;

        this.targetY =
            windowRef.y;

        // =====================================
        // Transform
        // =====================================

        this.scale = 1.0;

        this.rotation = 0;

        // =====================================
        // Effects
        // =====================================

        this.glow = false;

        this.transparent = false;

        console.log(
            "Compositor Window:",
            windowRef.title
        );
    }
}

// =====================================
// Compositor
// =====================================

class Compositor {

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
        // X11
        // =====================================

        this.x11 =
            options.x11;

        // =====================================
        // Composited Windows
        // =====================================

        this.windows = [];

        // =====================================
        // Desktop Effects
        // =====================================

        this.enableBlur = true;

        this.enableShadow = true;

        this.enableAnimations = true;

        this.enableTransparency = true;

        // =====================================
        // Desktop
        // =====================================

        this.wallpaper =
            null;

        // =====================================
        // FPS
        // =====================================

        this.fps = 0;

        this.frames = 0;

        this.lastFPS =
            performance.now();

        // =====================================
        // VSync
        // =====================================

        this.vsync = true;

        // =====================================
        // Register Existing Windows
        // =====================================

        this.syncWindows();

        console.log(
            "Compositor Ready"
        );
    }

    // =====================================
    // Sync Windows
    // =====================================

    syncWindows() {

        if(
            !this.windowManager
        ) {

            return;
        }

        for(
            const win
            of this.windowManager
            .windows
        ) {

            if(
                !this.windows.find(

                    w =>
                    w.window === win
                )
            ) {

                this.windows.push(

                    new CompositorWindow(
                        win
                    )
                );
            }
        }
    }

    // =====================================
    // Draw Desktop
    // =====================================

    drawDesktop() {

        if(this.wallpaper) {

            this.framebuffer
            .drawImage(

                this.wallpaper,

                0,
                0,

                this.framebuffer
                .width,

                this.framebuffer
                .height
            );

        } else {

            this.framebuffer
            .gradient();
        }
    }

    // =====================================
    // Shadow
    // =====================================

    drawShadow(cw) {

        if(
            !cw.shadow ||
            !this.enableShadow
        ) {

            return;
        }

        const w =
            cw.window;

        for(
            let i = 0;
            i < 12;
            i++
        ) {

            const alpha =
                40 - i * 3;

            this.framebuffer
            .rect(

                w.x - i,

                w.y - i,

                w.width + i * 2,

                w.height + i * 2,

                this.framebuffer.rgb(

                    0,
                    0,
                    0,

                    alpha
                )
            );
        }
    }

    // =====================================
    // Rounded Corners
    // =====================================

    roundedRect(
        x,
        y,
        w,
        h,
        radius,
        color
    ) {

        // Top
        this.framebuffer.rect(

            x + radius,
            y,

            w - radius * 2,
            h,

            color
        );

        // Left
        this.framebuffer.rect(

            x,
            y + radius,

            radius,
            h - radius * 2,

            color
        );

        // Right
        this.framebuffer.rect(

            x + w - radius,
            y + radius,

            radius,
            h - radius * 2,

            color
        );

        // Circles
        this.framebuffer.circle(

            x + radius,

            y + radius,

            radius,

            color
        );

        this.framebuffer.circle(

            x + w - radius,

            y + radius,

            radius,

            color
        );

        this.framebuffer.circle(

            x + radius,

            y + h - radius,

            radius,

            color
        );

        this.framebuffer.circle(

            x + w - radius,

            y + h - radius,

            radius,

            color
        );
    }

    // =====================================
    // Blur Effect
    // =====================================

    blurRegion(
        x,
        y,
        w,
        h
    ) {

        if(
            !this.enableBlur
        ) {

            return;
        }

        for(
            let yy = y;
            yy < y + h;
            yy += 2
        ) {

            for(
                let xx = x;
                xx < x + w;
                xx += 2
            ) {

                const pixel =
                    this.framebuffer
                    .getPixel(
                        xx,
                        yy
                    );

                this.framebuffer
                .putPixel(

                    xx,
                    yy,

                    pixel >>> 1
                );
            }
        }
    }

    // =====================================
    // Draw Window
    // =====================================

    drawWindow(cw) {

        if(
            !cw.visible ||
            !cw.window.visible
        ) {

            return;
        }

        const w =
            cw.window;

        // =====================================
        // Shadow
        // =====================================

        this.drawShadow(cw);

        // =====================================
        // Blur
        // =====================================

        if(cw.blur) {

            this.blurRegion(

                w.x,
                w.y,

                w.width,
                w.height
            );
        }

        // =====================================
        // Body
        // =====================================

        const bg =
            this.framebuffer.rgb(

                32,
                32,
                32,

                cw.transparent
                    ? 120
                    : 255
            );

        if(cw.rounded) {

            this.roundedRect(

                w.x,
                w.y,

                w.width,
                w.height,

                8,

                bg
            );

        } else {

            this.framebuffer
            .rect(

                w.x,
                w.y,

                w.width,
                w.height,

                bg
            );
        }

        // =====================================
        // Titlebar
        // =====================================

        this.framebuffer
        .rect(

            w.x,
            w.y,

            w.width,
            28,

            this.framebuffer.rgb(

                w.focused
                    ? 0
                    : 70,

                w.focused
                    ? 120
                    : 70,

                w.focused
                    ? 255
                    : 70
            )
        );

        // =====================================
        // Glow
        // =====================================

        if(cw.glow) {

            for(
                let i = 0;
                i < 8;
                i++
            ) {

                this.framebuffer
                .rect(

                    w.x - i,
                    w.y - i,

                    w.width + i * 2,
                    w.height + i * 2,

                    this.framebuffer.rgb(

                        0,
                        120,
                        255,
                        20
                    )
                );
            }
        }

        // =====================================
        // Title
        // =====================================

        this.framebuffer
        .render();

        this.framebuffer
        .text(

            w.x + 10,

            w.y + 18,

            w.title,

            "#FFFFFF"
        );

        // =====================================
        // Custom Draw
        // =====================================

        if(w.onDraw) {

            w.onDraw(
                this.framebuffer,
                w
            );
        }
    }

    // =====================================
    // Animate
    // =====================================

    animate(cw) {

        if(
            !this.enableAnimations
        ) {

            return;
        }

        const speed = 0.12;

        cw.window.x +=

            (
                cw.targetX
                - cw.window.x
            )
            * speed;

        cw.window.y +=

            (
                cw.targetY
                - cw.window.y
            )
            * speed;
    }

    // =====================================
    // Render
    // =====================================

    render() {

        this.syncWindows();

        // =====================================
        // Desktop
        // =====================================

        this.drawDesktop();

        // =====================================
        // Windows
        // =====================================

        for(
            const cw
            of this.windows
        ) {

            this.animate(cw);

            this.drawWindow(cw);
        }

        // =====================================
        // Cursor
        // =====================================

        this.framebuffer
        .drawCursor();

        this.framebuffer
        .render();

        // =====================================
        // FPS
        // =====================================

        this.frames++;

        const now =
            performance.now();

        if(
            now - this.lastFPS
            >= 1000
        ) {

            this.fps =
                this.frames;

            this.frames = 0;

            this.lastFPS =
                now;
        }
    }

    // =====================================
    // Start
    // =====================================

    start() {

        const loop = () => {

            this.render();

            if(this.vsync) {

                requestAnimationFrame(
                    loop
                );

            } else {

                setTimeout(
                    loop,
                    16
                );
            }
        };

        loop();
    }

    // =====================================
    // Find Window
    // =====================================

    get(title) {

        return this.windows.find(

            w =>
            w.window.title
            === title
        );
    }

    // =====================================
    // Enable Blur
    // =====================================

    blur(title, enabled = true) {

        const win =
            this.get(title);

        if(win) {

            win.blur =
                enabled;
        }
    }

    // =====================================
    // Enable Glow
    // =====================================

    glow(title, enabled = true) {

        const win =
            this.get(title);

        if(win) {

            win.glow =
                enabled;
        }
    }

    // =====================================
    // Transparency
    // =====================================

    transparent(
        title,
        enabled = true
    ) {

        const win =
            this.get(title);

        if(win) {

            win.transparent =
                enabled;
        }
    }

    // =====================================
    // Wallpaper
    // =====================================

    setWallpaper(image) {

        this.wallpaper =
            image;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            windows:
                this.windows.length,

            fps:
                this.fps,

            effects: {

                blur:
                    this.enableBlur,

                shadow:
                    this.enableShadow,

                transparency:
                    this.enableTransparency,

                animations:
                    this.enableAnimations
            }
        };
    }
}