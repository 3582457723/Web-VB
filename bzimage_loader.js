// bzimage_loader.js
// Linux bzImage Loader for Web-VB
// x86-64 Linux Boot Loader

class BzImageLoader {

    constructor(cpu, ram, paging) {

        this.cpu = cpu;

        this.ram = ram;

        this.paging = paging;

        // =====================================
        // Linux Boot Protocol
        // =====================================

        this.SETUP_SECTS_OFFSET = 0x1F1;
        this.HEADER_OFFSET      = 0x202;
        this.VERSION_OFFSET     = 0x206;
        this.LOADER_TYPE_OFFSET = 0x210;
        this.CMDLINE_OFFSET     = 0x228;
        this.CMDLINE_SIZE       = 0x238;

        // =====================================
        // Magic
        // =====================================

        this.HDR_MAGIC = 0x53726448; // "HdrS"

        // =====================================
        // Kernel Memory Layout
        // =====================================

        this.REALMODE_ADDR = 0x00010000;
        this.CMDLINE_ADDR  = 0x00020000;
        this.KERNEL_ADDR   = 0x00100000;

        // =====================================
        // Boot Params
        // =====================================

        this.bootParams = {

            cmdline: "",

            ramdisk: 0,

            ramdiskSize: 0,

            loaderType: 0xFF
        };

        console.log(
            "bzImage Loader Ready"
        );
    }

    // =====================================
    // Helpers
    // =====================================

    u8(buffer, off) {

        return new DataView(buffer)
            .getUint8(off);
    }

    u16(buffer, off) {

        return new DataView(buffer)
            .getUint16(off, true);
    }

    u32(buffer, off) {

        return new DataView(buffer)
            .getUint32(off, true);
    }

    // =====================================
    // Parse Setup Header
    // =====================================

    parseHeader(buffer) {

        const headerMagic =
            this.u32(
                buffer,
                this.HEADER_OFFSET
            );

        if(
            headerMagic
            !==
            this.HDR_MAGIC
        ) {

            throw new Error(
                "Invalid bzImage"
            );
        }

        const setupSects =
            this.u8(
                buffer,
                this.SETUP_SECTS_OFFSET
            ) || 4;

        const version =
            this.u16(
                buffer,
                this.VERSION_OFFSET
            );

        const header = {

            setupSects,

            version,

            setupBytes:
                (setupSects + 1)
                * 512,

            kernelOffset:
                (setupSects + 1)
                * 512,

            kernelSize:
                buffer.byteLength
                -
                (
                    (setupSects + 1)
                    * 512
                )
        };

        console.log(

            `[bzImage]
setup=${header.setupBytes}
kernel=${header.kernelSize}
version=0x${version.toString(16)}`
        );

        return header;
    }

    // =====================================
    // Copy Buffer -> RAM
    // =====================================

    copyToRAM(

        addr,
        uint8
    ) {

        for(
            let i = 0;
            i < uint8.length;
            i++
        ) {

            this.ram.write8(

                addr + i,

                uint8[i]
            );
        }
    }

    // =====================================
    // Load Setup
    // =====================================

    loadSetup(buffer, header) {

        const setup =

            new Uint8Array(

                buffer,

                0,

                header.setupBytes
            );

        this.copyToRAM(

            this.REALMODE_ADDR,

            setup
        );

        console.log(

            `[SETUP]
0x${this.REALMODE_ADDR.toString(16)}`
        );
    }

    // =====================================
    // Load Kernel
    // =====================================

    loadKernel(buffer, header) {

        const kernel =

            new Uint8Array(

                buffer,

                header.kernelOffset,

                header.kernelSize
            );

        this.copyToRAM(

            this.KERNEL_ADDR,

            kernel
        );

        console.log(

            `[KERNEL]
0x${this.KERNEL_ADDR.toString(16)}`
        );
    }

    // =====================================
    // Command Line
    // =====================================

    setCmdline(cmdline) {

        this.bootParams.cmdline =
            cmdline;

        const bytes =

            new TextEncoder()
            .encode(
                cmdline + "\0"
            );

        this.copyToRAM(

            this.CMDLINE_ADDR,

            bytes
        );

        console.log(

            `[CMDLINE]
${cmdline}`
        );
    }

    // =====================================
    // Initramfs
    // =====================================

    setInitramfs(

        addr,
        size
    ) {

        this.bootParams.ramdisk =
            addr;

        this.bootParams.ramdiskSize =
            size;

        console.log(

            `[INITRAMFS]
0x${addr.toString(16)}
size=${size}`
        );
    }

    // =====================================
    // Create Boot Params
    // =====================================

    createBootParams() {

        const params =
            new Uint8Array(4096);

        const dv =
            new DataView(
                params.buffer
            );

        // =====================================
        // boot_flag
        // =====================================

        dv.setUint16(
            0x1FE,
            0xAA55,
            true
        );

        // =====================================
        // header
        // =====================================

        dv.setUint32(
            0x202,
            this.HDR_MAGIC,
            true
        );

        // =====================================
        // loader type
        // =====================================

        dv.setUint8(
            0x210,
            this.bootParams.loaderType
        );

        // =====================================
        // cmdline ptr
        // =====================================

        dv.setUint32(

            0x228,

            this.CMDLINE_ADDR,

            true
        );

        // =====================================
        // ramdisk
        // =====================================

        dv.setUint32(

            0x218,

            this.bootParams.ramdisk,

            true
        );

        dv.setUint32(

            0x21C,

            this.bootParams.ramdiskSize,

            true
        );

        // =====================================
        // Copy
        // =====================================

        this.copyToRAM(
            0x9000,
            params
        );

        console.log(
            "[BOOT PARAMS]"
        );
    }

    // =====================================
    // Prepare CPU
    // =====================================

    prepareCPU() {

        // =====================================
        // Real mode start
        // =====================================

        this.cpu.rip =
            this.REALMODE_ADDR;

        this.cpu.cs = 0;

        this.cpu.ds = 0;

        this.cpu.es = 0;

        this.cpu.ss = 0;

        // =====================================
        // Stack
        // =====================================

        this.cpu.rsp =
            0x90000;

        // =====================================
        // Boot params
        // RSI = boot params
        // =====================================

        this.cpu.rsi =
            0x9000;

        console.log(
            "[CPU READY]"
        );
    }

    // =====================================
    // Enable Paging
    // =====================================

    setupPaging() {

        const pml4 =
            this.paging
            .createAddressSpace();

        // =====================================
        // Identity map low memory
        // =====================================

        this.paging.identityMap(

            pml4,

            0,

            512 * 1024 * 1024
        );

        this.cpu.cr3 =
            pml4.phys;

        console.log(
            "[PAGING READY]"
        );
    }

    // =====================================
    // Boot
    // =====================================

    boot() {

        console.log(
            "===================="
        );

        console.log(
            "Linux Boot Start"
        );

        console.log(
            "===================="
        );

        this.prepareCPU();

        this.setupPaging();

        // =====================================
        // Enter protected mode
        // =====================================

        this.cpu.cr0 |= 1;

        console.log(
            "[Protected Mode]"
        );

        // =====================================
        // Enable PAE
        // =====================================

        this.cpu.cr4 |=
            (1 << 5);

        // =====================================
        // Long Mode
        // =====================================

        this.cpu.longMode =
            true;

        console.log(
            "[Long Mode]"
        );

        // =====================================
        // Jump to kernel
        // =====================================

        this.cpu.rip =
            this.KERNEL_ADDR;

        console.log(

            `[JUMP]
0x${this.KERNEL_ADDR.toString(16)}`
        );

        console.log(
            "Linux kernel executing..."
        );
    }

    // =====================================
    // Load bzImage
    // =====================================

    load(buffer) {

        console.log(
            "[LOAD bzImage]"
        );

        const header =
            this.parseHeader(
                buffer
            );

        this.loadSetup(
            buffer,
            header
        );

        this.loadKernel(
            buffer,
            header
        );

        this.createBootParams();

        return header;
    }

    // =====================================
    // From File
    // =====================================

    async fromFile(file) {

        return await file.arrayBuffer();
    }

    // =====================================
    // From URL
    // =====================================

    async fromURL(url) {

        const res =
            await fetch(url);

        return await res.arrayBuffer();
    }

    // =====================================
    // Full Boot
    // =====================================

    async bootFile(file) {

        const buffer =
            await this.fromFile(
                file
            );

        this.load(buffer);

        this.boot();
    }

    // =====================================
    // Debug
    // =====================================

    info() {

        return {

            kernel:
                `0x${this.KERNEL_ADDR.toString(16)}`,

            realmode:
                `0x${this.REALMODE_ADDR.toString(16)}`,

            cmdline:
                this.bootParams.cmdline,

            initramfs:
                this.bootParams.ramdisk
        };
    }
}