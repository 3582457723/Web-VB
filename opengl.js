// opengl.js
// JavaScript OpenGL-like Renderer

class GLBuffer {

    constructor(type = "ARRAY_BUFFER") {

        this.type = type;

        this.data = null;

        console.log(
            "GLBuffer Created"
        );
    }
}

// =====================================
// Shader
// =====================================

class GLShader {

    constructor(
        type,
        source = ""
    ) {

        this.type = type;

        this.source = source;

        this.compiled = false;

        console.log(
            "Shader:",
            type
        );
    }

    compile() {

        // Fake compile

        this.compiled = true;

        console.log(
            "Shader Compiled"
        );

        return true;
    }
}

// =====================================
// Program
// =====================================

class GLProgram {

    constructor() {

        this.vertexShader = null;

        this.fragmentShader = null;

        this.linked = false;

        console.log(
            "GLProgram Created"
        );
    }

    attachShader(shader) {

        if(
            shader.type
            === "VERTEX_SHADER"
        ) {

            this.vertexShader =
                shader;
        }

        if(
            shader.type
            === "FRAGMENT_SHADER"
        ) {

            this.fragmentShader =
                shader;
        }
    }

    link() {

        if(

            !this.vertexShader
            ||

            !this.fragmentShader
        ) {

            console.error(
                "Missing shaders"
            );

            return false;
        }

        this.linked = true;

        console.log(
            "Program Linked"
        );

        return true;
    }
}

// =====================================
// Texture
// =====================================

class GLTexture {

    constructor() {

        this.width = 0;

        this.height = 0;

        this.data = null;

        console.log(
            "Texture Created"
        );
    }

    upload(
        width,
        height,
        data
    ) {

        this.width = width;

        this.height = height;

        this.data = data;

        console.log(
            "Texture Uploaded"
        );
    }
}

// =====================================
// OpenGL Context
// =====================================

class OpenGLContext {

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
            options.width || 800;

        this.canvas.height =
            options.height || 600;

        // =====================================
        // WebGL Backend
        // =====================================

        this.gl =
            this.canvas
            .getContext("webgl2")
            ||
            this.canvas
            .getContext("webgl");

        if(!this.gl) {

            throw new Error(
                "WebGL unsupported"
            );
        }

        // =====================================
        // State
        // =====================================

        this.currentProgram =
            null;

        this.buffers = [];

        this.textures = [];

        // =====================================
        // Constants
        // =====================================

        this.COLOR_BUFFER_BIT =
            this.gl.COLOR_BUFFER_BIT;

        this.TRIANGLES =
            this.gl.TRIANGLES;

        this.FLOAT =
            this.gl.FLOAT;

        console.log(
            "OpenGL Context Ready"
        );
    }

    // =====================================
    // Clear Color
    // =====================================

    clearColor(
        r,
        g,
        b,
        a
    ) {

        this.gl.clearColor(
            r,
            g,
            b,
            a
        );
    }

    // =====================================
    // Clear
    // =====================================

    clear(mask) {

        this.gl.clear(mask);
    }

    // =====================================
    // Viewport
    // =====================================

    viewport(
        x,
        y,
        w,
        h
    ) {

        this.gl.viewport(
            x,
            y,
            w,
            h
        );
    }

    // =====================================
    // Create Buffer
    // =====================================

    createBuffer() {

        const buffer =
            new GLBuffer();

        buffer.native =
            this.gl
            .createBuffer();

        this.buffers.push(
            buffer
        );

        return buffer;
    }

    // =====================================
    // Bind Buffer
    // =====================================

    bindBuffer(
        target,
        buffer
    ) {

        this.gl.bindBuffer(

            this.gl[target],

            buffer.native
        );
    }

    // =====================================
    // Buffer Data
    // =====================================

    bufferData(
        target,
        data,
        usage = "STATIC_DRAW"
    ) {

        this.gl.bufferData(

            this.gl[target],

            data,

            this.gl[usage]
        );
    }

    // =====================================
    // Create Shader
    // =====================================

    createShader(
        type,
        source
    ) {

        const shader =
            new GLShader(
                type,
                source
            );

        shader.native =
            this.gl
            .createShader(

                this.gl[type]
            );

        this.gl.shaderSource(

            shader.native,

            source
        );

        this.gl.compileShader(
            shader.native
        );

        shader.compiled =
            this.gl
            .getShaderParameter(

                shader.native,

                this.gl
                .COMPILE_STATUS
            );

        if(!shader.compiled) {

            console.error(

                this.gl
                .getShaderInfoLog(
                    shader.native
                )
            );
        }

        return shader;
    }

    // =====================================
    // Create Program
    // =====================================

    createProgram(
        vertexShader,
        fragmentShader
    ) {

        const program =
            new GLProgram();

        program.native =
            this.gl
            .createProgram();

        this.gl.attachShader(

            program.native,

            vertexShader.native
        );

        this.gl.attachShader(

            program.native,

            fragmentShader.native
        );

        this.gl.linkProgram(
            program.native
        );

        program.linked =
            this.gl
            .getProgramParameter(

                program.native,

                this.gl
                .LINK_STATUS
            );

        if(!program.linked) {

            console.error(

                this.gl
                .getProgramInfoLog(
                    program.native
                )
            );
        }

        return program;
    }

    // =====================================
    // Use Program
    // =====================================

    useProgram(program) {

        this.currentProgram =
            program;

        this.gl.useProgram(
            program.native
        );
    }

    // =====================================
    // Vertex Attribute
    // =====================================

    vertexAttribPointer(
        index,
        size,
        type,
        normalized,
        stride,
        offset
    ) {

        this.gl.vertexAttribPointer(

            index,

            size,

            this.gl[type],

            normalized,

            stride,

            offset
        );
    }

    // =====================================
    // Enable Vertex Attribute
    // =====================================

    enableVertexAttribArray(index) {

        this.gl
        .enableVertexAttribArray(
            index
        );
    }

    // =====================================
    // Draw Arrays
    // =====================================

    drawArrays(
        mode,
        first,
        count
    ) {

        this.gl.drawArrays(

            this.gl[mode],

            first,

            count
        );
    }

    // =====================================
    // Create Texture
    // =====================================

    createTexture() {

        const tex =
            new GLTexture();

        tex.native =
            this.gl
            .createTexture();

        this.textures.push(
            tex
        );

        return tex;
    }

    // =====================================
    // Bind Texture
    // =====================================

    bindTexture(
        target,
        texture
    ) {

        this.gl.bindTexture(

            this.gl[target],

            texture.native
        );
    }

    // =====================================
    // Upload Texture
    // =====================================

    texImage2D(
        width,
        height,
        data
    ) {

        this.gl.texImage2D(

            this.gl.TEXTURE_2D,

            0,

            this.gl.RGBA,

            width,

            height,

            0,

            this.gl.RGBA,

            this.gl.UNSIGNED_BYTE,

            data
        );
    }

    // =====================================
    // Enable
    // =====================================

    enable(cap) {

        this.gl.enable(
            this.gl[cap]
        );
    }

    // =====================================
    // Disable
    // =====================================

    disable(cap) {

        this.gl.disable(
            this.gl[cap]
        );
    }

    // =====================================
    // Depth Test
    // =====================================

    depthTest(enable = true) {

        if(enable) {

            this.enable(
                "DEPTH_TEST"
            );

        } else {

            this.disable(
                "DEPTH_TEST"
            );
        }
    }

    // =====================================
    // Blend
    // =====================================

    blend(enable = true) {

        if(enable) {

            this.enable(
                "BLEND"
            );

        } else {

            this.disable(
                "BLEND"
            );
        }
    }

    // =====================================
    // Resize
    // =====================================

    resize(
        width,
        height
    ) {

        this.canvas.width =
            width;

        this.canvas.height =
            height;

        this.viewport(

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
    // Info
    // =====================================

    info() {

        return {

            renderer:
                this.gl.getParameter(

                    this.gl.RENDERER
                ),

            vendor:
                this.gl.getParameter(

                    this.gl.VENDOR
                ),

            version:
                this.gl.getParameter(

                    this.gl.VERSION
                ),

            shaders:
                this.gl.getParameter(

                    this.gl
                    .SHADING_LANGUAGE_VERSION
                )
        };
    }
}