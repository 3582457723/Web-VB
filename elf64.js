// elf64.js
// ELF64 Loader for Web-VB
// x86-64 Linux ELF executable loader

class ELF64 {

    constructor(kernel, memory) {

        this.kernel = kernel;

        this.memory = memory;

        // =====================================
        // ELF Constants
        // =====================================

        this.ELF_MAGIC = [

            0x7F,
            0x45,
            0x4C,
            0x46
        ];

        this.PT_LOAD = 1;

        this.PT_DYNAMIC = 2;

        this.PT_INTERP = 3;

        this.PT_NOTE = 4;

        this.PT_PHDR = 6;

        // =====================================
        // Machine
        // =====================================

        this.EM_X86_64 = 0x3E;

        // =====================================
        // ELF Type
        // =====================================

        this.ET_EXEC = 2;

        this.ET_DYN = 3;

        console.log(
            "ELF64 Loader Ready"
        );
    }

    // =====================================
    // Read helpers
    // =====================================

    u8(data, off) {

        return data.getUint8(off);
    }

    u16(data, off) {

        return data.getUint16(
            off,
            true
        );
    }

    u32(data, off) {

        return data.getUint32(
            off,
            true
        );
    }

    u64(data, off) {

        return Number(

            data.getBigUint64(
                off,
                true
            )
        );
    }

    // =====================================
    // Parse ELF Header
    // =====================================

    parseHeader(buffer) {

        const data =
            new DataView(buffer);

        // =====================================
        // Check magic
        // =====================================

        for(let i = 0; i < 4; i++) {

            if(

                data.getUint8(i)
                !==
                this.ELF_MAGIC[i]
            ) {

                throw new Error(
                    "Invalid ELF"
                );
            }
        }

        const header = {

            magic:
                "ELF",

            class:
                data.getUint8(4),

            endian:
                data.getUint8(5),

            version:
                data.getUint8(6),

            abi:
                data.getUint8(7),

            type:
                this.u16(data, 16),

            machine:
                this.u16(data, 18),

            version2:
                this.u32(data, 20),

            entry:
                this.u64(data, 24),

            phoff:
                this.u64(data, 32),

            shoff:
                this.u64(data, 40),

            flags:
                this.u32(data, 48),

            ehsize:
                this.u16(data, 52),

            phentsize:
                this.u16(data, 54),

            phnum:
                this.u16(data, 56),

            shentsize:
                this.u16(data, 58),

            shnum:
                this.u16(data, 60),

            shstrndx:
                this.u16(data, 62)
        };

        return header;
    }

    // =====================================
    // Parse Program Headers
    // =====================================

    parseProgramHeaders(
        buffer,
        header
    ) {

        const data =
            new DataView(buffer);

        const headers = [];

        for(

            let i = 0;

            i < header.phnum;

            i++
        ) {

            const off =

                header.phoff

                +

                (
                    i
                    *
                    header.phentsize
                );

            headers.push({

                type:
                    this.u32(data, off),

                flags:
                    this.u32(data, off + 4),

                offset:
                    this.u64(data, off + 8),

                vaddr:
                    this.u64(data, off + 16),

                paddr:
                    this.u64(data, off + 24),

                filesz:
                    this.u64(data, off + 32),

                memsz:
                    this.u64(data, off + 40),

                align:
                    this.u64(data, off + 48)
            });
        }

        return headers;
    }

    // =====================================
    // Load ELF
    // =====================================

    load(buffer) {

        console.log(
            "[ELF64] Loading ELF"
        );

        const header =
            this.parseHeader(
                buffer
            );

        // =====================================
        // Verify x86-64
        // =====================================

        if(

            header.machine
            !==
            this.EM_X86_64
        ) {

            throw new Error(
                "Not x86-64 ELF"
            );
        }

        // =====================================
        // Parse program headers
        // =====================================

        const phdrs =
            this.parseProgramHeaders(

                buffer,

                header
            );

        // =====================================
        // Allocate memory
        // =====================================

        const image = {

            entry:
                header.entry,

            base:
                0x400000,

            segments: [],

            phdrs
        };

        // =====================================
        // Load segments
        // =====================================

        for(
            const ph
            of phdrs
        ) {

            if(
                ph.type
                !==
                this.PT_LOAD
            ) {

                continue;
            }

            console.log(

                `[ELF64] LOAD ${ph.memsz} bytes`
            );

            const ptr =
                this.kernel.kmalloc(
                    ph.memsz
                );

            // =====================================
            // Copy data
            // =====================================

            const src =
                new Uint8Array(

                    buffer,

                    ph.offset,

                    ph.filesz
                );

            const dst =
                new Uint8Array(
                    ph.memsz
                );

            dst.set(src);

            image.segments.push({

                vaddr:
                    ph.vaddr,

                memsz:
                    ph.memsz,

                filesz:
                    ph.filesz,

                flags:
                    ph.flags,

                memory:
                    dst,

                ptr
            });
        }

        // =====================================
        // Find interpreter
        // =====================================

        for(
            const ph
            of phdrs
        ) {

            if(
                ph.type
                ===
                this.PT_INTERP
            ) {

                const bytes =
                    new Uint8Array(

                        buffer,

                        ph.offset,

                        ph.filesz
                    );

                image.interpreter =

                    new TextDecoder()
                    .decode(bytes)

                    .replace(/\0/g, "");

                console.log(

                    `[ELF64] INTERP ${image.interpreter}`
                );
            }
        }

        console.log(

            `[ELF64] Entry 0x${header.entry.toString(16)}`
        );

        return image;
    }

    // =====================================
    // Execute ELF
    // =====================================

    exec(buffer, argv = []) {

        const image =
            this.load(buffer);

        // =====================================
        // Create process
        // =====================================

        const pid =
            this.kernel.exec(
                "ELF64",
                argv
            );

        const process = {

            pid,

            entry:
                image.entry,

            rip:
                image.entry,

            rsp:
                0x7ffffff000,

            rbp:
                0x7ffffff000,

            image,

            state:
                "running",

            argv
        };

        console.log(

            `[ELF64] EXEC PID=${pid}`
        );

        // =====================================
        // Push into scheduler
        // =====================================

        if(
            this.kernel.scheduler
        ) {

            this.kernel.scheduler
            .add(process);
        }

        return process;
    }

    // =====================================
    // Read ELF from File
    // =====================================

    async fromFile(file) {

        return await file.arrayBuffer();
    }

    // =====================================
    // Load from URL
    // =====================================

    async fromURL(url) {

        const res =
            await fetch(url);

        return await res.arrayBuffer();
    }

    // =====================================
    // Debug
    // =====================================

    info(buffer) {

        const h =
            this.parseHeader(
                buffer
            );

        return {

            type:
                h.type,

            machine:
                h.machine,

            entry:
                `0x${h.entry.toString(16)}`,

            phnum:
                h.phnum,

            shnum:
                h.shnum
        };
    }
}