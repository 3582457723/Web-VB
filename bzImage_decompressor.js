// bzimage_decompressor.js
// Linux bzImage decompressor
// gzip compressed kernel loader

class BzImageDecompressor {

    constructor(

        memory,
        gzip,
        cpu
    ) {

        this.memory = memory;

        this.gzip = gzip;

        this.cpu = cpu;

        // =====================================
        // Linux Boot Protocol
        // =====================================

        this.SETUP_SECTS =
            0x1F1;

        this.HEADER =
            0x202;

        this.VERSION =
            0x206;

        this.REALMODE_SWTCH =
            0x208;

        this.START_SYS =
            0x214;

        this.TYPE_OF_LOADER =
            0x210;

        this.LOADFLAGS =
            0x211;

        this.CMDLINE_PTR =
            0x228;

        this.RAMDISK_IMAGE =
            0x218;

        this.RAMDISK_SIZE =
            0x21C;

        this.KERNEL_ALIGNMENT =
            0x230;

        // =====================================
        // Memory Layout
        // =====================================

        this.REALMODE_ADDR =
            0x90000;

        this.CMDLINE_ADDR =
            0x20000;

        this.INITRD_ADDR =
            0x800000;

        this.KERNEL_ADDR =
            0x100000;

        // =====================================
        // State
        // =====================================

        this.kernelImage = null;

        this.decompressedKernel = null;

        this.bootParams = {};

        console.log(
            "bzImage Decompressor Ready"
        );
    }

    // =====================================
    // Load bzImage
    // =====================================

    load(image) {

        this.kernelImage = image;

        console.log(

            `[BZIMAGE LOAD]
${image.length} bytes`
        );

        return true;
    }

    // =====================================
    // Parse Linux Header
    // =====================================

    parseHeader() {

        if(!this.kernelImage) {

            throw new Error(
                "No kernel image"
            );
        }

        // =====================================
        // Header signature
        // =====================================

        const sig =

            String.fromCharCode(

                this.kernelImage[
                    this.HEADER
                ],

                this.kernelImage[
                    this.HEADER + 1
                ],

                this.kernelImage[
                    this.HEADER + 2
                ],

                this.kernelImage[
                    this.HEADER + 3
                ]
            );

        if(sig !== "HdrS") {

            throw new Error(
                "Invalid bzImage"
            );
        }

        // =====================================
        // Setup sectors
        // =====================================

        const setupSects =

            this.kernelImage[
                this.SETUP_SECTS
            ] || 4;

        // =====================================
        // Kernel offset
        // =====================================

        const protectedOffset =

            (setupSects + 1)
            *
            512;

        // =====================================
        // Version
        // =====================================

        const version =

            this.kernelImage[
                this.VERSION
            ]
            |
            (
                this.kernelImage[
                    this.VERSION + 1
                ]
                << 8
            );

        this.bootParams = {

            setupSects,

            protectedOffset,

            version
        };

        console.log(

            `[LINUX HEADER]
setup=${setupSects}
offset=0x${protectedOffset.toString(16)}
version=0x${version.toString(16)}`
        );

        return this.bootParams;
    }

    // =====================================
    // Extract compressed kernel
    // =====================================

    extractCompressedKernel() {

        const offset =
            this.bootParams
            .protectedOffset;

        const compressed =
            this.kernelImage.slice(
                offset
            );

        console.log(

            `[COMPRESSED KERNEL]
${compressed.length} bytes`
        );

        return compressed;
    }

    // =====================================
    // Decompress gzip kernel
    // =====================================

    decompress() {

        const compressed =
            this.extractCompressedKernel();

        // =====================================
        // gzip magic
        // =====================================

        if(

            compressed[0]
            !== 0x1F
            ||

            compressed[1]
            !== 0x8B
        ) {

            throw new Error(
                "Kernel not gzip"
            );
        }

        // =====================================
        // Use gzip.js
        // =====================================

        if(!this.gzip) {

            throw new Error(
                "gzip subsystem missing"
            );
        }

        this.decompressedKernel =

            this.gzip.decompress(
                compressed
            );

        console.log(

            `[KERNEL DECOMPRESSED]
${this.decompressedKernel.length} bytes`
        );

        return this.decompressedKernel;
    }

    // =====================================
    // Load kernel into memory
    // =====================================

    loadKernelToMemory() {

        if(
            !this.decompressedKernel
        ) {

            throw new Error(
                "Kernel not decompressed"
            );
        }

        for(
            let i = 0;
            i <
            this.decompressedKernel.length;
            i++
        ) {

            this.memory.write8(

                this.KERNEL_ADDR + i,

                this.decompressedKernel[i]
            );
        }

        console.log(

            `[KERNEL LOADED]
0x${this.KERNEL_ADDR.toString(16)}`
        );

        return true;
    }

    // =====================================
    // Load initrd
    // =====================================

    loadInitrd(initrd) {

        for(
            let i = 0;
            i < initrd.length;
            i++
        ) {

            this.memory.write8(

                this.INITRD_ADDR + i,

                initrd[i]
            );
        }

        this.bootParams.initrd = {

            addr:
                this.INITRD_ADDR,

            size:
                initrd.length
        };

        console.log(

            `[INITRD LOADED]
${initrd.length} bytes`
        );

        return true;
    }

    // =====================================
    // Write command line
    // =====================================

    writeCmdline(cmdline) {

        const bytes =

            new TextEncoder()
            .encode(
                cmdline + "\0"
            );

        for(
            let i = 0;
            i < bytes.length;
            i++
        ) {

            this.memory.write8(

                this.CMDLINE_ADDR + i,

                bytes[i]
            );
        }

        this.bootParams.cmdline =
            cmdline;

        console.log(

            `[CMDLINE]
${cmdline}`
        );

        return true;
    }

    // =====================================
    // Setup Linux boot params
    // =====================================

    setupBootParams() {

        const bootAddr =
            this.REALMODE_ADDR;

        // =====================================
        // Header
        // =====================================

        this.memory.write32(

            bootAddr
            +
            this.HEADER,

            0x53726448
        );

        // =====================================
        // Loader type
        // =====================================

        this.memory.write8(

            bootAddr
            +
            this.TYPE_OF_LOADER,

            0xFF
        );

        // =====================================
        // Loadflags
        // =====================================

        this.memory.write8(

            bootAddr
            +
            this.LOADFLAGS,

            0x1
        );

        // =====================================
        // Cmdline ptr
        // =====================================

        this.memory.write32(

            bootAddr
            +
            this.CMDLINE_PTR,

            this.CMDLINE_ADDR
        );

        // =====================================
        // initrd
        // =====================================

        if(
            this.bootParams.initrd
        ) {

            this.memory.write32(

                bootAddr
                +
                this.RAMDISK_IMAGE,

                this.INITRD_ADDR
            );

            this.memory.write32(

                bootAddr
                +
                this.RAMDISK_SIZE,

                this.bootParams
                .initrd
                .size
            );
        }

        console.log(
            "[BOOT PARAMS]"
        );

        return bootAddr;
    }

    // =====================================
    // Linux Entry Point
    // =====================================

    getEntryPoint() {

        return this.KERNEL_ADDR;
    }

    // =====================================
    // Boot Linux
    // =====================================

    boot() {

        const bootParamsAddr =
            this.setupBootParams();

        const entry =
            this.getEntryPoint();

        // =====================================
        // CPU state
        // =====================================

        this.cpu.bootLinux(

            entry,

            bootParamsAddr
        );

        console.log(

            `[BOOT LINUX]
entry=0x${entry.toString(16)}`
        );

        return true;
    }

    // =====================================
    // Full Pipeline
    // =====================================

    run(

        kernelImage,

        initrd = null,

        cmdline =
            "console=ttyS0 root=/dev/sda rw"
    ) {

        // load
        this.load(
            kernelImage
        );

        // parse
        this.parseHeader();

        // decompress
        this.decompress();

        // memory
        this.loadKernelToMemory();

        // initrd
        if(initrd) {

            this.loadInitrd(
                initrd
            );
        }

        // cmdline
        this.writeCmdline(
            cmdline
        );

        // boot
        this.boot();

        console.log(
            "[LINUX READY]"
        );

        return true;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            kernelLoaded:
                !!this.kernelImage,

            decompressed:
                !!this.decompressedKernel,

            kernelAddr:
                this.KERNEL_ADDR,

            initrdAddr:
                this.INITRD_ADDR,

            cmdline:
                this.bootParams
                .cmdline
        };
    }

    // =====================================
    // Dump
    // =====================================

    dump() {

        return {

            bootParams:
                this.bootParams,

            memory: {

                kernel:
                    this.KERNEL_ADDR,

                initrd:
                    this.INITRD_ADDR,

                cmdline:
                    this.CMDLINE_ADDR
            }
        };
    }
}