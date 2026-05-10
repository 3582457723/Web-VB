// vulkan.js
// JavaScript Vulkan-like GPU API

class VkBuffer {

    constructor(size = 0) {

        this.size = size;

        this.memory = new ArrayBuffer(
            size
        );

        console.log(
            "VkBuffer Created"
        );
    }
}

// =====================================
// VkImage
// =====================================

class VkImage {

    constructor(
        width,
        height
    ) {

        this.width = width;

        this.height = height;

        this.pixels =
            new Uint8Array(

                width
                *
                height
                *
                4
            );

        console.log(
            "VkImage Created"
        );
    }
}

// =====================================
// VkShaderModule
// =====================================

class VkShaderModule {

    constructor(code = "") {

        this.code = code;

        console.log(
            "VkShaderModule Created"
        );
    }
}

// =====================================
// VkPipeline
// =====================================

class VkPipeline {

    constructor(options = {}) {

        this.vertexShader =
            options.vertexShader;

        this.fragmentShader =
            options.fragmentShader;

        this.topology =
            options.topology
            || "triangle-list";

        console.log(
            "VkPipeline Created"
        );
    }
}

// =====================================
// Command Buffer
// =====================================

class VkCommandBuffer {

    constructor() {

        this.commands = [];

        this.recording = false;

        console.log(
            "VkCommandBuffer Created"
        );
    }

    // =====================================
    // Begin
    // =====================================

    begin() {

        this.recording = true;

        this.commands = [];
    }

    // =====================================
    // End
    // =====================================

    end() {

        this.recording = false;
    }

    // =====================================
    // Record Command
    // =====================================

    record(cmd) {

        if(!this.recording) {

            return;
        }

        this.commands.push(cmd);
    }
}

// =====================================
// Vulkan Device
// =====================================

class VulkanDevice {

    constructor(options = {}) {

        // =====================================
        // Canvas
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

        // =====================================
        // WebGPU/WebGL Backend
        // =====================================

        this.backend =
            this.canvas
            .getContext("webgl2");

        if(!this.backend) {

            throw new Error(
                "GPU backend unsupported"
            );
        }

        // =====================================
        // Resources
        // =====================================

        this.buffers = [];

        this.images = [];

        this.pipelines = [];

        this.commandBuffers = [];

        // =====================================
        // Frame
        // =====================================

        this.frame = 0;

        console.log(
            "Vulkan Device Ready"
        );
    }

    // =====================================
    // Create Buffer
    // =====================================

    createBuffer(size) {

        const buffer =
            new VkBuffer(size);

        buffer.native =
            this.backend
            .createBuffer();

        this.buffers.push(
            buffer
        );

        return buffer;
    }

    // =====================================
    // Create Image
    // =====================================

    createImage(
        width,
        height
    ) {

        const image =
            new VkImage(
                width,
                height
            );

        image.native =
            this.backend
            .createTexture();

        this.images.push(
            image
        );

        return image;
    }

    // =====================================
    // Create Shader Module
    // =====================================

    createShaderModule(code) {

        return new VkShaderModule(
            code
        );
    }

    // =====================================
    // Create Pipeline
    // =====================================

    createPipeline(options) {

        const pipeline =
            new VkPipeline(
                options
            );

        this.pipelines.push(
            pipeline
        );

        return pipeline;
    }

    // =====================================
    // Create Command Buffer
    // =====================================

    createCommandBuffer() {

        const cmd =
            new VkCommandBuffer();

        this.commandBuffers
        .push(cmd);

        return cmd;
    }

    // =====================================
    // Submit
    // =====================================

    submit(commandBuffer) {

        console.log(
            "Submitting Commands"
        );

        for(
            const cmd
            of commandBuffer.commands
        ) {

            this.execute(cmd);
        }

        this.frame++;
    }

    // =====================================
    // Execute Commands
    // =====================================

    execute(cmd) {

        switch(cmd.type) {

            case "clear":

                this.clear(
                    cmd.color
                );

                break;

            case "draw":

                this.draw(
                    cmd.vertices
                );

                break;

            case "bindPipeline":

                console.log(
                    "Pipeline Bound"
                );

                break;

            case "copyBuffer":

                console.log(
                    "Buffer Copied"
                );

                break;

            default:

                console.log(
                    "Unknown Command"
                );
        }
    }

    // =====================================
    // Clear
    // =====================================

    clear(color = [0,0,0,1]) {

        this.backend.clearColor(

            color[0],
            color[1],
            color[2],
            color[3]
        );

        this.backend.clear(

            this.backend
            .COLOR_BUFFER_BIT
        );
    }

    // =====================================
    // Draw
    // =====================================

    draw(vertices = 3) {

        this.backend.drawArrays(

            this.backend.TRIANGLES,

            0,

            vertices
        );
    }

    // =====================================
    // Present
    // =====================================

    present() {

        console.log(
            "Frame Presented"
        );
    }

    // =====================================
    // Wait Idle
    // =====================================

    waitIdle() {

        console.log(
            "GPU Idle"
        );
    }

    // =====================================
    // Resize Swapchain
    // =====================================

    resize(
        width,
        height
    ) {

        this.canvas.width =
            width;

        this.canvas.height =
            height;

        this.backend.viewport(

            0,
            0,

            width,
            height
        );
    }

    // =====================================
    // Render Loop
    // =====================================

    renderLoop(callback) {

        const loop = () => {

            callback();

            requestAnimationFrame(
                loop
            );
        };

        loop();
    }

    // =====================================
    // Compute Shader
    // =====================================

    compute(shader, data) {

        console.log(
            "Compute Shader Dispatch"
        );

        return data;
    }

    // =====================================
    // Memory Info
    // =====================================

    memoryInfo() {

        let total = 0;

        for(
            const b
            of this.buffers
        ) {

            total += b.size;
        }

        return {

            buffers:
                this.buffers.length,

            images:
                this.images.length,

            memory:
                total
        };
    }

    // =====================================
    // Device Info
    // =====================================

    info() {

        return {

            renderer:
                this.backend
                .getParameter(

                    this.backend
                    .RENDERER
                ),

            vendor:
                this.backend
                .getParameter(

                    this.backend
                    .VENDOR
                ),

            version:
                "VulkanJS 1.0",

            frame:
                this.frame
        };
    }
}