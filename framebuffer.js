// framebuffer.js
// Virtual GPU Framebuffer Driver

class FrameBuffer {

    constructor(options = {}) {

        // =====================================
        // Canvas
        // =====================================

        this.canvas =
            options.canvas;

        this.ctx =
            this.canvas
            .getContext("2d");

        // =====================================
        // Resolution
        // =====================================

        this.width =
            options.width || 1024;

        this.height =
            options.height || 768;

        // =====================================
        // VRAM
        // =====================================

        this.vram =
            new Uint32Array(

                this.width
                * this.height
            );

        // =====================================
        // ImageData
        // =====================================

        this.imageData =
            this.ctx
            .createImageData(

                this.width,
                this.height
            );

        // =====================================
        // Cursor
        // =====================================

        this.mouseX = 0;
        this.mouseY = 0;

        this.showCursor =
            true;

        // =====================================
        // Frame Counter
        // =====================================

        this.frame = 0;

        // =====================================
        // FPS
        // =====================================

        this.lastFPSUpdate =
            performance.now();

        this.fps = 0;

        this.framesThisSecond = 0;

        // =====================================
        // Double Buffer
        // =====================================

        this.backbuffer =
            new Uint32Array(

                this.width
                * this.height
            );

        // =====================================
        // Resize Canvas
        // =====================================

        this.canvas.width =
            this.width;

        this.canvas.height =
            this.height;

        // =====================================
        // Clear Screen
        // =====================================

        this.clear(0x000000);

        console.log(
            "Framebuffer Ready"
        );
    }

    // =====================================
    // Convert Color
    // =====================================

    rgb(
        r,
        g,
        b,
        a = 255
    ) {

        return (
            (a << 24)
            |
            (b << 16)
            |
            (g << 8)
            |
            r
        ) >>> 0;
    }

    // =====================================
    // Clear
    // =====================================

    clear(color = 0x000000) {

        this.backbuffer.fill(color);

        this.render();
    }

    // =====================================
    // Put Pixel
    // =====================================

    putPixel(
        x,
        y,
        color
    ) {

        if(
            x < 0 ||
            y < 0 ||
            x >= this.width ||
            y >= this.height
        ) {

            return;
        }

        const index =
            y * this.width + x;

        this.backbuffer[index] =
            color;
    }

    // =====================================
    // Get Pixel
    // =====================================

    getPixel(x, y) {

        if(
            x < 0 ||
            y < 0 ||
            x >= this.width ||
            y >= this.height
        ) {

            return 0;
        }

        return this.backbuffer[
            y * this.width + x
        ];
    }

    // =====================================
    // Draw Rectangle
    // =====================================

    rect(
        x,
        y,
        w,
        h,
        color
    ) {

        for(
            let yy = y;
            yy < y + h;
            yy++
        ) {

            for(
                let xx = x;
                xx < x + w;
                xx++
            ) {

                this.putPixel(
                    xx,
                    yy,
                    color
                );
            }
        }
    }

    // =====================================
    // Draw Line
    // =====================================

    line(
        x0,
        y0,
        x1,
        y1,
        color
    ) {

        const dx =
            Math.abs(x1 - x0);

        const dy =
            Math.abs(y1 - y0);

        const sx =
            x0 < x1 ? 1 : -1;

        const sy =
            y0 < y1 ? 1 : -1;

        let err =
            dx - dy;

        while(true) {

            this.putPixel(
                x0,
                y0,
                color
            );

            if(
                x0 === x1 &&
                y0 === y1
            ) {

                break;
            }

            const e2 =
                err * 2;

            if(e2 > -dy) {

                err -= dy;

                x0 += sx;
            }

            if(e2 < dx) {

                err += dx;

                y0 += sy;
            }
        }
    }

    // =====================================
    // Draw Circle
    // =====================================

    circle(
        cx,
        cy,
        radius,
        color
    ) {

        for(
            let y = -radius;
            y <= radius;
            y++
        ) {

            for(
                let x = -radius;
                x <= radius;
                x++
            ) {

                if(
                    x*x + y*y
                    <=
                    radius*radius
                ) {

                    this.putPixel(

                        cx + x,

                        cy + y,

                        color
                    );
                }
            }
        }
    }

    // =====================================
    // Draw Text
    // =====================================

    text(
        x,
        y,
        text,
        color = "#FFFFFF",
        font = "16px monospace"
    ) {

        this.render();

        this.ctx.font =
            font;

        this.ctx.fillStyle =
            color;

        this.ctx.fillText(
            text,
            x,
            y
        );
    }

    // =====================================
    // Draw Image
    // =====================================

    drawImage(
        image,
        x,
        y,
        w,
        h
    ) {

        this.render();

        this.ctx.drawImage(

            image,

            x,
            y,

            w || image.width,

            h || image.height
        );
    }

    // =====================================
    // Fill Gradient
    // =====================================

    gradient() {

        for(
            let y = 0;
            y < this.height;
            y++
        ) {

            for(
                let x = 0;
                x < this.width;
                x++
            ) {

                const r =
                    (x / this.width)
                    * 255;

                const g =
                    (y / this.height)
                    * 255;

                const b = 128;

                this.putPixel(

                    x,
                    y,

                    this.rgb(
                        r,
                        g,
                        b
                    )
                );
            }
        }
    }

    // =====================================
    // Draw Cursor
    // =====================================

    drawCursor() {

        if(
            !this.showCursor
        ) {

            return;
        }

        const color =
            this.rgb(
                255,
                255,
                255
            );

        // Arrow
        for(
            let i = 0;
            i < 10;
            i++
        ) {

            this.putPixel(

                this.mouseX,

                this.mouseY + i,

                color
            );

            this.putPixel(

                this.mouseX + i,

                this.mouseY,

                color
            );
        }
    }

    // =====================================
    // Present Framebuffer
    // =====================================

    render() {

        const data =
            this.imageData.data;

        for(
            let i = 0;
            i < this.backbuffer.length;
            i++
        ) {

            const pixel =
                this.backbuffer[i];

            const offset =
                i * 4;

            data[offset] =
                pixel & 0xFF;

            data[offset + 1] =
                (pixel >> 8)
                & 0xFF;

            data[offset + 2] =
                (pixel >> 16)
                & 0xFF;

            data[offset + 3] =
                (pixel >> 24)
                & 0xFF;
        }

        this.ctx.putImageData(

            this.imageData,

            0,
            0
        );

        this.drawCursor();

        this.frame++;

        this.framesThisSecond++;

        const now =
            performance.now();

        if(
            now -
            this.lastFPSUpdate
            >= 1000
        ) {

            this.fps =
                this.framesThisSecond;

            this.framesThisSecond =
                0;

            this.lastFPSUpdate =
                now;
        }
    }

    // =====================================
    // Start Render Loop
    // =====================================

    start() {

        const loop = () => {

            this.render();

            requestAnimationFrame(
                loop
            );
        };

        loop();
    }

    // =====================================
    // Mouse Move
    // =====================================

    moveMouse(x, y) {

        this.mouseX = x;
        this.mouseY = y;
    }

    // =====================================
    // Resize
    // =====================================

    resize(
        width,
        height
    ) {

        this.width =
            width;

        this.height =
            height;

        this.canvas.width =
            width;

        this.canvas.height =
            height;

        this.vram =
            new Uint32Array(

                width
                * height
            );

        this.backbuffer =
            new Uint32Array(

                width
                * height
            );

        this.imageData =
            this.ctx
            .createImageData(

                width,
                height
            );

        this.clear();
    }

    // =====================================
    // Demo
    // =====================================

    demo() {

        this.gradient();

        this.rect(

            100,
            100,

            300,
            200,

            this.rgb(
                0,
                120,
                255
            )
        );

        this.circle(

            500,
            300,

            80,

            this.rgb(
                255,
                0,
                0
            )
        );

        this.line(

            0,
            0,

            this.width,
            this.height,

            this.rgb(
                0,
                255,
                0
            )
        );

        this.render();

        this.text(

            20,
            40,

            "JavaScript Linux Framebuffer",

            "#FFFFFF",

            "24px monospace"
        );
    }

    // =====================================
    // FPS
    // =====================================

    getFPS() {

        return this.fps;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            width:
                this.width,

            height:
                this.height,

            vram:
                (
                    this.backbuffer
                    .length
                    * 4
                    / 1024
                    / 1024
                )
                .toFixed(2)
                + " MB",

            fps:
                this.fps
        };
    }
}