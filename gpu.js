// gpu.js
// Simple JavaScript Virtual GPU
// 64MB VRAM
// VGA-like GPU

class GPU {

    constructor(width = 800, height = 600) {

        // =====================================
        // GPU INFO
        // =====================================

        this.name = "JS Virtual GPU";

        this.vramSize =
            64 * 1024 * 1024; // 64MB

        // =====================================
        // VRAM
        // =====================================

        console.log(
            "Allocating VRAM: 64MB"
        );

        this.vram =
            new Uint8Array(this.vramSize);

        // =====================================
        // SCREEN
        // =====================================

        this.width = width;
        this.height = height;

        this.bpp = 4;

        this.framebufferSize =
            width *
            height *
            this.bpp;

        // =====================================
        // FRAMEBUFFER OFFSET
        // =====================================

        this.framebuffer = 0;

        // =====================================
        // Create Canvas
        // =====================================

        this.canvas =
            document.createElement("canvas");

        this.canvas.width = width;
        this.canvas.height = height;

        document.body.appendChild(
            this.canvas
        );

        this.ctx =
            this.canvas.getContext("2d");

        // =====================================
        // Image Buffer
        // =====================================

        this.imageData =
            this.ctx.createImageData(
                width,
                height
            );

        // =====================================
        // GPU Registers
        // =====================================

        this.registers = {

            mode: 0,

            width: width,

            height: height,

            framebuffer: 0,

            enabled: true
        };

        // =====================================
        // Clear Screen
        // =====================================

        this.clear(0, 0, 0);

        console.log(
            "GPU Ready"
        );
    }

    // =========================================
    // VRAM CHECK
    // =========================================

    checkVRAM(addr, size = 1) {

        if(addr < 0) {

            throw new Error(
                "Negative VRAM address"
            );
        }

        if(addr + size > this.vramSize) {

            throw new Error(
                "VRAM out of bounds"
            );
        }
    }

    // =========================================
    // VRAM READ
    // =========================================

    read8(addr) {

        this.checkVRAM(addr);

        return this.vram[addr];
    }

    read32(addr) {

        this.checkVRAM(addr, 4);

        return (
            this.vram[addr] |
            (this.vram[addr + 1] << 8) |
            (this.vram[addr + 2] << 16) |
            (this.vram[addr + 3] << 24)
        ) >>> 0;
    }

    // =========================================
    // VRAM WRITE
    // =========================================

    write8(addr, value) {

        this.checkVRAM(addr);

        this.vram[addr] =
            value & 0xFF;
    }

    write32(addr, value) {

        this.checkVRAM(addr, 4);

        this.vram[addr] =
            value & 0xFF;

        this.vram[addr + 1] =
            (value >> 8) & 0xFF;

        this.vram[addr + 2] =
            (value >> 16) & 0xFF;

        this.vram[addr + 3] =
            (value >> 24) & 0xFF;
    }

    // =========================================
    // PIXEL
    // =========================================

    setPixel(x, y, r, g, b, a = 255) {

        if(
            x < 0 ||
            y < 0 ||
            x >= this.width ||
            y >= this.height
        ) {
            return;
        }

        const index =
            (y * this.width + x) * 4;

        this.vram[index] = r;
        this.vram[index + 1] = g;
        this.vram[index + 2] = b;
        this.vram[index + 3] = a;
    }

    getPixel(x, y) {

        const index =
            (y * this.width + x) * 4;

        return {

            r: this.vram[index],

            g: this.vram[index + 1],

            b: this.vram[index + 2],

            a: this.vram[index + 3]
        };
    }

    // =========================================
    // CLEAR SCREEN
    // =========================================

    clear(r = 0, g = 0, b = 0) {

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

                this.setPixel(
                    x,
                    y,
                    r,
                    g,
                    b,
                    255
                );
            }
        }
    }

    // =========================================
    // RECTANGLE
    // =========================================

    fillRect(x, y, w, h, r, g, b) {

        for(
            let py = y;
            py < y + h;
            py++
        ) {

            for(
                let px = x;
                px < x + w;
                px++
            ) {

                this.setPixel(
                    px,
                    py,
                    r,
                    g,
                    b
                );
            }
        }
    }

    // =========================================
    // LINE
    // =========================================

    drawLine(x0, y0, x1, y1, r, g, b) {

        let dx =
            Math.abs(x1 - x0);

        let sx =
            x0 < x1 ? 1 : -1;

        let dy =
            -Math.abs(y1 - y0);

        let sy =
            y0 < y1 ? 1 : -1;

        let err =
            dx + dy;

        while(true) {

            this.setPixel(
                x0,
                y0,
                r,
                g,
                b
            );

            if(
                x0 === x1 &&
                y0 === y1
            ) {
                break;
            }

            let e2 = 2 * err;

            if(e2 >= dy) {

                err += dy;
                x0 += sx;
            }

            if(e2 <= dx) {

                err += dx;
                y0 += sy;
            }
        }
    }

    // =========================================
    // RENDER
    // =========================================

    render() {

        this.imageData.data.set(
            this.vram.subarray(
                0,
                this.framebufferSize
            )
        );

        this.ctx.putImageData(
            this.imageData,
            0,
            0
        );
    }

    // =========================================
    // VSYNC
    // =========================================

    startVSync(fps = 60) {

        const interval =
            1000 / fps;

        setInterval(() => {

            this.render();

        }, interval);
    }

    // =========================================
    // INFO
    // =========================================

    info() {

        return {

            gpu: this.name,

            vramMB:
                this.vramSize /
                1024 /
                1024,

            resolution:
                this.width +
                "x" +
                this.height
        };
    }
}

// =============================================
// Example
// =============================================

const gpu = new GPU(800, 600);

// Background

gpu.clear(20, 20, 30);

// Rectangles

gpu.fillRect(
    50,
    50,
    300,
    200,
    255,
    0,
    0
);

gpu.fillRect(
    400,
    100,
    200,
    200,
    0,
    255,
    0
);

// Lines

gpu.drawLine(
    0,
    0,
    799,
    599,
    255,
    255,
    255
);

gpu.drawLine(
    799,
    0,
    0,
    599,
    255,
    255,
    0
);

// Start GPU

gpu.startVSync(60);

console.log(
    gpu.info()
);