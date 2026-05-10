// elf.js
// ELF64 Loader
// Linux Kernel / Executable Loader

class ELFLoader {

    constructor(mmu, filesystem) {

        // =====================================
        // MMU
        // =====================================

        this.mmu = mmu;

        // =====================================
        // Filesystem
        // =====================================

        this.fs = filesystem;

        // =====================================
        // ELF Info
        // =====================================

        this.entryPoint = 0;

        this.programHeaders = [];

        this.sectionHeaders = [];

        this.loaded = false;

        console.log(
            "ELF Loader Ready"
        );
    }

    // =====================================
    // Load ELF From File
    // =====================================

    loadFile(path) {

        const content =
            this.fs.readFile(path);

        const encoder =
            new TextEncoder();

        const data =
            encoder.encode(content);

        return this.load(data);
    }

    // =====================================
    // Load ELF Buffer
    // =====================================

    load(buffer) {

        const view =
            new DataView(
                buffer.buffer
            );

        // =====================================
        // ELF MAGIC
        // =====================================

        if(
            view.getUint8(0) !== 0x7F ||
            view.getUint8(1) !== 0x45 ||
            view.getUint8(2) !== 0x4C ||
            view.getUint8(3) !== 0x46
        ) {

            throw new Error(
                "Invalid ELF"
            );
        }

        console.log(
            "ELF Header Valid"
        );

        // =====================================
        // ELF CLASS
        // =====================================

        const elfClass =
            view.getUint8(4);

        if(elfClass !== 2) {

            throw new Error(
                "Only ELF64 supported"
            );
        }

        // =====================================
        // Endianness
        // =====================================

        const littleEndian =
            view.getUint8(5) === 1;

        if(!littleEndian) {

            throw new Error(
                "Big endian unsupported"
            );
        }

        // =====================================
        // Entry Point
        // =====================================

        this.entryPoint =
            Number(
                view.getBigUint64(
                    0x18,
                    true
                )
            );

        console.log(

            "Entry:",
            "0x" +
            this.entryPoint
            .toString(16)
        );

        // =====================================
        // Program Header
        // =====================================

        const phoff =
            Number(
                view.getBigUint64(
                    0x20,
                    true
                )
            );

        const phentsize =
            view.getUint16(
                0x36,
                true
            );

        const phnum =
            view.getUint16(
                0x38,
                true
            );

        console.log(
            "Program Headers:",
            phnum
        );

        // =====================================
        // Parse Program Headers
        // =====================================

        for(
            let i = 0;
            i < phnum;
            i++
        ) {

            const offset =
                phoff +
                i * phentsize;

            const type =
                view.getUint32(
                    offset,
                    true
                );

            const flags =
                view.getUint32(
                    offset + 4,
                    true
                );

            const fileOffset =
                Number(
                    view.getBigUint64(
                        offset + 8,
                        true
                    )
                );

            const vaddr =
                Number(
                    view.getBigUint64(
                        offset + 16,
                        true
                    )
                );

            const fileSize =
                Number(
                    view.getBigUint64(
                        offset + 32,
                        true
                    )
                );

            const memSize =
                Number(
                    view.getBigUint64(
                        offset + 40,
                        true
                    )
                );

            const align =
                Number(
                    view.getBigUint64(
                        offset + 48,
                        true
                    )
                );

            const ph = {

                type,
                flags,
                fileOffset,
                vaddr,
                fileSize,
                memSize,
                align
            };

            this.programHeaders.push(
                ph
            );

            console.log(
                "PH",
                ph
            );

            // =====================================
            // LOAD Segment
            // =====================================

            if(type === 1) {

                this.loadSegment(
                    buffer,
                    ph
                );
            }
        }

        this.loaded = true;

        console.log(
            "ELF Loaded"
        );

        return {

            entry:
                this.entryPoint,

            headers:
                this.programHeaders
        };
    }

    // =====================================
    // Load Segment Into Memory
    // =====================================

    loadSegment(
        buffer,
        ph
    ) {

        console.log(

            "Loading Segment",

            "VADDR:",
            "0x" +
            ph.vaddr.toString(16),

            "SIZE:",
            ph.memSize
        );

        // Map Pages
        const pages =
            Math.ceil(
                ph.memSize / 4096
            );

        this.mmu.allocPages(

            ph.vaddr,

            pages,

            {

                present: true,

                writable:
                    !!(ph.flags & 2),

                executable:
                    !!(ph.flags & 1),

                user: false
            }
        );

        // Copy Bytes
        for(
            let i = 0;
            i < ph.fileSize;
            i++
        ) {

            const value =
                buffer[
                    ph.fileOffset + i
                ];

            this.mmu.write8(

                ph.vaddr + i,

                value
            );
        }

        // Zero BSS
        for(
            let i = ph.fileSize;
            i < ph.memSize;
            i++
        ) {

            this.mmu.write8(

                ph.vaddr + i,

                0
            );
        }
    }

    // =====================================
    // Jump To Entry
    // =====================================

    execute(cpu) {

        if(!this.loaded) {

            throw new Error(
                "No ELF loaded"
            );
        }

        console.log(

            "EXECUTE ELF",

            "0x" +
            this.entryPoint
            .toString(16)
        );

        // Set RIP
        cpu.registers.rip =
            this.entryPoint;
    }

    // =====================================
    // Parse Sections
    // =====================================

    parseSections(buffer) {

        const view =
            new DataView(
                buffer.buffer
            );

        const shoff =
            Number(
                view.getBigUint64(
                    0x28,
                    true
                )
            );

        const shentsize =
            view.getUint16(
                0x3A,
                true
            );

        const shnum =
            view.getUint16(
                0x3C,
                true
            );

        console.log(
            "Sections:",
            shnum
        );

        for(
            let i = 0;
            i < shnum;
            i++
        ) {

            const offset =
                shoff +
                i * shentsize;

            const type =
                view.getUint32(
                    offset + 4,
                    true
                );

            const addr =
                Number(
                    view.getBigUint64(
                        offset + 16,
                        true
                    )
                );

            const size =
                Number(
                    view.getBigUint64(
                        offset + 32,
                        true
                    )
                );

            this.sectionHeaders.push({

                type,
                addr,
                size
            });
        }
    }

    // =====================================
    // Reset
    // =====================================

    reset() {

        this.entryPoint = 0;

        this.programHeaders = [];

        this.sectionHeaders = [];

        this.loaded = false;

        console.log(
            "ELF Loader Reset"
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            loaded:
                this.loaded,

            entry:
                "0x" +
                this.entryPoint
                .toString(16),

            programHeaders:
                this.programHeaders
                .length,

            sections:
                this.sectionHeaders
                .length
        };
    }
}