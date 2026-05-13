// longmode.js
// x86-64 Long Mode Emulator
// For Web-VB Linux Compatibility

class LongMode {

    constructor(

        cpu,
        ram,
        paging,
        gdt,
        idt,
        msr,
        sse
    ) {

        this.cpu = cpu;
        this.ram = ram;

        this.paging = paging;

        this.gdt = gdt;
        this.idt = idt;

        this.msr = msr;
        this.sse = sse;

        this.enabled = false;

        console.log(
            "Long Mode Ready"
        );
    }

    // =====================================
    // Enter Long Mode
    // =====================================

    enter() {

        // =====================================
        // Enable PAE
        // =====================================

        this.cpu.cr4 |= (1 << 5);

        // =====================================
        // Enable Long Mode
        // EFER.LME
        // =====================================

        let efer =
            this.msr.read(
                this.msr.MSR_EFER
            );

        efer |= (1n << 8n);

        this.msr.write(
            this.msr.MSR_EFER,
            efer
        );

        // =====================================
        // Enable Paging
        // =====================================

        this.cpu.cr0 |=
            0x80000001;

        // =====================================
        // CPU State
        // =====================================

        this.cpu.longMode = true;

        this.enabled = true;

        // =====================================
        // Load 64bit Segments
        // =====================================

        this.cpu.cs =
            this.gdt.kernelCode;

        this.cpu.ds =
            this.gdt.kernelData;

        this.cpu.es =
            this.gdt.kernelData;

        this.cpu.fs =
            this.gdt.kernelData;

        this.cpu.gs =
            this.gdt.kernelData;

        this.cpu.ss =
            this.gdt.kernelData;

        // =====================================
        // 64bit Stack
        // =====================================

        this.cpu.rsp =
            0x8000000;

        console.log(
            "[LONG MODE ENABLED]"
        );
    }

    // =====================================
    // Exit Long Mode
    // =====================================

    exit() {

        this.enabled = false;

        this.cpu.longMode = false;

        console.log(
            "[LONG MODE DISABLED]"
        );
    }

    // =====================================
    // Address Translation
    // =====================================

    translate(addr) {

        if(
            !(this.cpu.cr0 & 0x80000000)
        ) {

            return addr;
        }

        return this.paging.translate64(

            this.cpu.cr3,

            addr
        );
    }

    // =====================================
    // Memory Access
    // =====================================

    read8(addr) {

        return this.ram.read8(
            this.translate(addr)
        );
    }

    read16(addr) {

        return this.ram.read16(
            this.translate(addr)
        );
    }

    read32(addr) {

        return this.ram.read32(
            this.translate(addr)
        );
    }

    read64(addr) {

        return this.ram.read64(
            this.translate(addr)
        );
    }

    write8(addr, value) {

        this.ram.write8(
            this.translate(addr),
            value
        );
    }

    write16(addr, value) {

        this.ram.write16(
            this.translate(addr),
            value
        );
    }

    write32(addr, value) {

        this.ram.write32(
            this.translate(addr),
            value
        );
    }

    write64(addr, value) {

        this.ram.write64(
            this.translate(addr),
            value
        );
    }

    // =====================================
    // Stack
    // =====================================

    push64(value) {

        this.cpu.rsp -= 8;

        this.write64(

            this.cpu.rsp,

            BigInt(value)
        );
    }

    pop64() {

        const value =

            this.read64(
                this.cpu.rsp
            );

        this.cpu.rsp += 8;

        return value;
    }

    // =====================================
    // Interrupt
    // =====================================

    interrupt(vector) {

        console.log(

            `[LMODE INT]
0x${vector.toString(16)}`
        );

        this.push64(
            this.cpu.rflags
        );

        this.push64(
            this.cpu.cs
        );

        this.push64(
            this.cpu.rip
        );

        this.idt.interrupt(
            vector
        );
    }

    // =====================================
    // IRETQ
    // =====================================

    iretq() {

        this.cpu.rip =
            Number(
                this.pop64()
            );

        this.cpu.cs =
            Number(
                this.pop64()
            );

        this.cpu.rflags =
            Number(
                this.pop64()
            );

        console.log(
            "[IRETQ]"
        );
    }

    // =====================================
    // SYSCALL
    // =====================================

    syscall() {

        const entry =
            this.msr.read(
                this.msr.MSR_LSTAR
            );

        // save RIP
        this.cpu.rcx =
            this.cpu.rip;

        // save flags
        this.cpu.r11 =
            this.cpu.rflags;

        // jump
        this.cpu.rip =
            Number(entry);

        // kernel mode
        this.gdt.enterKernelMode();

        console.log(

            `[SYSCALL]
0x${entry.toString(16)}`
        );
    }

    // =====================================
    // SYSRET
    // =====================================

    sysret() {

        this.cpu.rip =
            this.cpu.rcx;

        this.cpu.rflags =
            this.cpu.r11;

        this.gdt.enterUserMode();

        console.log(
            "[SYSRET]"
        );
    }

    // =====================================
    // CPUID
    // =====================================

    cpuid() {

        if(
            this.cpu.cpuid
        ) {

            this.cpu.cpuid.execute();
        }
    }

    // =====================================
    // RDTSC
    // =====================================

    rdtsc() {

        const tsc =
            this.msr.read(
                this.msr.MSR_TSC
            );

        this.cpu.rax =
            Number(
                tsc & 0xFFFFFFFFn
            );

        this.cpu.rdx =
            Number(
                tsc >> 32n
            );
    }

    // =====================================
    // SSE
    // =====================================

    enableSSE() {

        // CR0
        this.cpu.cr0 &= ~(1 << 2);

        this.cpu.cr0 |= (1 << 1);

        // CR4
        this.cpu.cr4 |=
            (1 << 9)
            |
            (1 << 10);

        console.log(
            "[SSE ENABLED]"
        );
    }

    // =====================================
    // AVX
    // =====================================

    enableAVX() {

        this.enableSSE();

        // XSAVE
        this.cpu.cr4 |=
            (1 << 18);

        console.log(
            "[AVX ENABLED]"
        );
    }

    // =====================================
    // Linux Setup
    // =====================================

    setupLinux() {

        // Linux kernel entry
        this.cpu.rip =
            0x100000;

        // stack
        this.cpu.rsp =
            0x8000000;

        // boot params
        this.cpu.rsi =
            0x9000;

        // enable SSE
        this.enableSSE();

        console.log(
            "[LINUX LONG MODE]"
        );
    }

    // =====================================
    // Execute Step
    // =====================================

    step() {

        const opcode =
            this.read8(
                this.cpu.rip
            );

        this.cpu.rip++;

        switch(opcode) {

            // =====================================
            // NOP
            // =====================================

            case 0x90:

                break;

            // =====================================
            // HLT
            // =====================================

            case 0xF4:

                this.cpu.halted = true;

                break;

            // =====================================
            // INT imm8
            // =====================================

            case 0xCD:

                const vector =
                    this.read8(
                        this.cpu.rip
                    );

                this.cpu.rip++;

                this.interrupt(
                    vector
                );

                break;

            // =====================================
            // SYSCALL
            // =====================================

            case 0x0F:

                const next =
                    this.read8(
                        this.cpu.rip
                    );

                this.cpu.rip++;

                // syscall
                if(next === 0x05) {

                    this.syscall();

                    return;
                }

                // cpuid
                if(next === 0xA2) {

                    this.cpuid();

                    return;
                }

                // rdtsc
                if(next === 0x31) {

                    this.rdtsc();

                    return;
                }

                console.warn(

                    `[0F]
0x${next.toString(16)}`
                );

                break;

            default:

                console.warn(

                    `[LONGMODE]
Unknown opcode
0x${opcode.toString(16)}`
                );
        }
    }

    // =====================================
    // Run
    // =====================================

    run(cycles = 1000000) {

        let count = 0;

        while(

            this.enabled
            &&
            !this.cpu.halted
            &&
            count < cycles
        ) {

            this.step();

            count++;

            // tick TSC
            this.msr.tick(1);
        }

        console.log(

            `[LONGMODE STOP]
cycles=${count}`
        );
    }

    // =====================================
    // Debug
    // =====================================

    dump() {

        return {

            rip:
                "0x"
                +
                this.cpu.rip.toString(16),

            rsp:
                "0x"
                +
                this.cpu.rsp.toString(16),

            cr0:
                "0x"
                +
                this.cpu.cr0.toString(16),

            cr3:
                "0x"
                +
                this.cpu.cr3.toString(16),

            cr4:
                "0x"
                +
                this.cpu.cr4.toString(16),

            longMode:
                this.cpu.longMode,

            paging:
                Boolean(
                    this.cpu.cr0
                    &
                    0x80000000
                ),

            pae:
                Boolean(
                    this.cpu.cr4
                    &
                    (1 << 5)
                ),

            sse:
                Boolean(
                    this.cpu.cr4
                    &
                    (1 << 9)
                )
        };
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            enabled:
                this.enabled,

            rip:
                this.cpu.rip,

            rsp:
                this.cpu.rsp,

            syscall:
                this.cpu.syscallEntry,

            longMode:
                this.cpu.longMode
        };
    }
}