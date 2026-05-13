// drm.js
// Direct Rendering Manager
// Linux GPU/Display subsystem emulator

class DRM {

    constructor(

        gpu,
        framebuffer,
        pci,
        irq
    ) {

        this.gpu = gpu;

        this.framebuffer =
            framebuffer;

        this.pci = pci;

        this.irq = irq;

        // =====================================
        // DRM State
        // =====================================

        this.initialized = false;

        this.driver = "webvbdrm";

        this.version = {

            major: 1,
            minor: 0,
            patch: 0
        };

        // =====================================
        // Displays
        // =====================================

        this.connectors = [];

        this.encoders = [];

        this.crtcs = [];

        this.planes = [];

        this.framebuffers = [];

        // =====================================
        // GPU Memory
        // =====================================

        this.vramSize =
            64 * 1024 * 1024;

        this.vramUsed = 0;

        // =====================================
        // Modes
        // =====================================

        this.defaultMode = {

            width: 1024,
            height: 768,
            refresh: 60
        };

        // =====================================
        // PCI Device
        // =====================================

        this.vendorID = 0x1234;
        this.deviceID = 0x1111;

        console.log(
            "DRM Ready"
        );
    }

    // =====================================
    // Initialize
    // =====================================

    init() {

        // =====================================
        // PCI GPU
        // =====================================

        if(this.pci) {

            this.pci.registerDevice({

                vendorID:
                    this.vendorID,

                deviceID:
                    this.deviceID,

                classCode:
                    0x03,

                subclass:
                    0x00,

                name:
                    "WebVB GPU"
            });
        }

        // =====================================
        // Default connector
        // =====================================

        this.createConnector(
            "Virtual-HDMI-A-1"
        );

        // =====================================
        // Default CRTC
        // =====================================

        this.createCRTC();

        // =====================================
        // Default plane
        // =====================================

        this.createPlane();

        // =====================================
        // Boot framebuffer
        // =====================================

        this.createFramebuffer(

            this.defaultMode.width,

            this.defaultMode.height
        );

        this.initialized = true;

        console.log(
            "[DRM INIT]"
        );
    }

    // =====================================
    // Connector
    // =====================================

    createConnector(name) {

        const connector = {

            id:
                this.connectors.length
                + 1,

            name,

            connected:
                true,

            modes: [

                {
                    width: 640,
                    height: 480,
                    refresh: 60
                },

                {
                    width: 800,
                    height: 600,
                    refresh: 60
                },

                {
                    width: 1024,
                    height: 768,
                    refresh: 60
                },

                {
                    width: 1280,
                    height: 720,
                    refresh: 60
                },

                {
                    width: 1920,
                    height: 1080,
                    refresh: 60
                }
            ]
        };

        this.connectors.push(
            connector
        );

        console.log(

            `[DRM CONNECTOR]
${name}`
        );

        return connector;
    }

    // =====================================
    // CRTC
    // =====================================

    createCRTC() {

        const crtc = {

            id:
                this.crtcs.length
                + 1,

            enabled:
                true,

            mode:
                this.defaultMode,

            framebuffer:
                null
        };

        this.crtcs.push(
            crtc
        );

        console.log(
            "[DRM CRTC]"
        );

        return crtc;
    }

    // =====================================
    // Plane
    // =====================================

    createPlane() {

        const plane = {

            id:
                this.planes.length
                + 1,

            type:
                "primary",

            framebuffer:
                null,

            x: 0,
            y: 0
        };

        this.planes.push(
            plane
        );

        console.log(
            "[DRM PLANE]"
        );

        return plane;
    }

    // =====================================
    // Framebuffer
    // =====================================

    createFramebuffer(

        width,
        height,
        bpp = 32
    ) {

        const size =

            width
            *
            height
            *
            (bpp / 8);

        if(
            this.vramUsed + size
            >
            this.vramSize
        ) {

            throw new Error(
                "Out of VRAM"
            );
        }

        const fb = {

            id:
                this.framebuffers.length
                + 1,

            width,
            height,
            bpp,

            pitch:
                width
                *
                (bpp / 8),

            size,

            data:
                new Uint8Array(
                    size
                )
        };

        this.framebuffers.push(
            fb
        );

        this.vramUsed += size;

        console.log(

            `[DRM FB]
${width}x${height}
${size} bytes`
        );

        return fb;
    }

    // =====================================
    // Set Mode
    // =====================================

    setMode(

        width,
        height,
        refresh = 60
    ) {

        const crtc =
            this.crtcs[0];

        crtc.mode = {

            width,
            height,
            refresh
        };

        console.log(

            `[DRM MODE]
${width}x${height}@${refresh}`
        );

        return true;
    }

    // =====================================
    // Page Flip
    // =====================================

    pageFlip(fbID) {

        const fb =
            this.framebuffers.find(

                x => x.id === fbID
            );

        if(!fb) {

            return false;
        }

        const crtc =
            this.crtcs[0];

        crtc.framebuffer = fb;

        // =====================================
        // Draw to screen
        // =====================================

        if(
            this.framebuffer
        ) {

            this.framebuffer.blit(

                fb.data,

                fb.width,

                fb.height
            );
        }

        // =====================================
        // VBlank IRQ
        // =====================================

        this.vblank();

        console.log(

            `[PAGE FLIP]
fb=${fbID}`
        );

        return true;
    }

    // =====================================
    // VBlank
    // =====================================

    vblank() {

        if(this.irq) {

            this.irq.raiseIRQ(
                16
            );
        }

        console.log(
            "[VBLANK]"
        );
    }

    // =====================================
    // Draw Pixel
    // =====================================

    pixel(

        fbID,
        x,
        y,
        r,
        g,
        b,
        a = 255
    ) {

        const fb =
            this.framebuffers.find(

                x2 => x2.id === fbID
            );

        if(!fb) {

            return;
        }

        if(
            x < 0
            ||
            y < 0
            ||
            x >= fb.width
            ||
            y >= fb.height
        ) {

            return;
        }

        const off =

            (
                y
                *
                fb.width
                +
                x
            )
            * 4;

        fb.data[off] =
            r;

        fb.data[off + 1] =
            g;

        fb.data[off + 2] =
            b;

        fb.data[off + 3] =
            a;
    }

    // =====================================
    // Fill
    // =====================================

    fill(

        fbID,
        r,
        g,
        b,
        a = 255
    ) {

        const fb =
            this.framebuffers.find(

                x => x.id === fbID
            );

        if(!fb) {

            return;
        }

        for(
            let i = 0;
            i < fb.data.length;
            i += 4
        ) {

            fb.data[i] = r;
            fb.data[i + 1] = g;
            fb.data[i + 2] = b;
            fb.data[i + 3] = a;
        }

        console.log(
            "[DRM FILL]"
        );
    }

    // =====================================
    // Linux /dev/dri/card0
    // =====================================

    ioctl(request, arg) {

        switch(request) {

            // =====================================
            // DRM_IOCTL_VERSION
            // =====================================

            case 0x00:

                return {

                    driver:
                        this.driver,

                    version:
                        this.version
                };

            // =====================================
            // DRM_IOCTL_MODE_GETRESOURCES
            // =====================================

            case 0xA0:

                return {

                    connectors:
                        this.connectors,

                    crtcs:
                        this.crtcs,

                    planes:
                        this.planes
                };

            // =====================================
            // DRM_IOCTL_MODE_CREATE_DUMB
            // =====================================

            case 0xB2:

                return this.createFramebuffer(

                    arg.width,

                    arg.height,

                    arg.bpp
                );
        }

        console.warn(

            `[DRM IOCTL]
0x${request.toString(16)}`
        );

        return null;
    }

    // =====================================
    // Linux fbdev compatibility
    // =====================================

    fbdev() {

        const fb =
            this.framebuffers[0];

        return {

            width:
                fb.width,

            height:
                fb.height,

            bpp:
                fb.bpp,

            pitch:
                fb.pitch,

            buffer:
                fb.data
        };
    }

    // =====================================
    // Cursor
    // =====================================

    setCursor(x, y) {

        console.log(

            `[CURSOR]
${x},${y}`
        );
    }

    // =====================================
    // GPU Reset
    // =====================================

    reset() {

        this.vramUsed = 0;

        this.framebuffers = [];

        console.log(
            "[GPU RESET]"
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            driver:
                this.driver,

            version:
                this.version,

            vram:
                this.vramSize,

            used:
                this.vramUsed,

            connectors:
                this.connectors.length,

            crtcs:
                this.crtcs.length,

            planes:
                this.planes.length,

            framebuffers:
                this.framebuffers.length
        };
    }

    // =====================================
    // Dump
    // =====================================

    dump() {

        return {

            initialized:
                this.initialized,

            connectors:
                this.connectors,

            crtcs:
                this.crtcs,

            planes:
                this.planes,

            fbCount:
                this.framebuffers.length
        };
    }
}