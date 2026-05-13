// msr.js
// x86-64 MSR (Model Specific Register) Emulator
// For Web-VB Linux Compatibility

class MSR {

    constructor(cpu) {

        this.cpu = cpu;

        // =====================================
        // MSR Storage
        // =====================================

        this.registers = new Map();

        // =====================================
        // Common MSRs
        // =====================================

        this.MSR_EFER           = 0xC0000080;
        this.MSR_STAR           = 0xC0000081;
        this.MSR_LSTAR          = 0xC0000082;
        this.MSR_CSTAR          = 0xC0000083;
        this.MSR_SFMASK         = 0xC0000084;

        this.MSR_FS_BASE        = 0xC0000100;
        this.MSR_GS_BASE        = 0xC0000101;
        this.MSR_KERNEL_GS_BASE = 0xC0000102;

        this.MSR_APIC_BASE      = 0x0000001B;
        this.MSR_PAT            = 0x00000277;

        this.MSR_TSC            = 0x00000010;

        // =====================================
        // EFER Bits
        // =====================================

        this.EFER_SCE = 1 << 0;
        this.EFER_LME = 1 << 8;
        this.EFER_LMA = 1 << 10;
        this.EFER_NXE = 1 << 11;

        // =====================================
        // Default values
        // =====================================

        this.initDefaults();

        console.log(
            "MSR Ready"
        );
    }

    // =====================================
    // Default MSR values
    // =====================================

    initDefaults() {

        // =====================================
        // EFER
        // =====================================

        this.registers.set(

            this.MSR_EFER,

            BigInt(

                this.EFER_SCE
                |
                this.EFER_LME
                |
                this.EFER_LMA
                |
                this.EFER_NXE
            )
        );

        // =====================================
        // STAR
        // =====================================

        this.registers.set(
            this.MSR_STAR,
            0n
        );

        // =====================================
        // LSTAR
        // syscall entry
        // =====================================

        this.registers.set(
            this.MSR_LSTAR,
            0xFFFFFFFF80000000n
        );

        // =====================================
        // CSTAR
        // =====================================

        this.registers.set(
            this.MSR_CSTAR,
            0n
        );

        // =====================================
        // SFMASK
        // =====================================

        this.registers.set(
            this.MSR_SFMASK,
            0n
        );

        // =====================================
        // FS/GS
        // =====================================

        this.registers.set(
            this.MSR_FS_BASE,
            0n
        );

        this.registers.set(
            this.MSR_GS_BASE,
            0n
        );

        this.registers.set(
            this.MSR_KERNEL_GS_BASE,
            0n
        );

        // =====================================
        // APIC BASE
        // =====================================

        this.registers.set(

            this.MSR_APIC_BASE,

            0xFEE00000n
        );

        // =====================================
        // PAT
        // =====================================

        this.registers.set(

            this.MSR_PAT,

            0x0007040600070406n
        );

        // =====================================
        // TSC
        // =====================================

        this.registers.set(
            this.MSR_TSC,
            0n
        );
    }

    // =====================================
    // RDMSR
    // =====================================

    read(msr) {

        if(!this.registers.has(msr)) {

            console.warn(

                `[MSR] Unknown read 0x${msr.toString(16)}`
            );

            return 0n;
        }

        const value =
            this.registers.get(msr);

        console.log(

            `[RDMSR]
0x${msr.toString(16)}
=
0x${value.toString(16)}`
        );

        return value;
    }

    // =====================================
    // WRMSR
    // =====================================

    write(msr, value) {

        value = BigInt(value);

        console.log(

            `[WRMSR]
0x${msr.toString(16)}
=
0x${value.toString(16)}`
        );

        switch(msr) {

            // =====================================
            // EFER
            // =====================================

            case this.MSR_EFER:

                this.handleEFER(value);

                break;

            // =====================================
            // LSTAR
            // =====================================

            case this.MSR_LSTAR:

                this.handleLSTAR(value);

                break;

            // =====================================
            // FS BASE
            // =====================================

            case this.MSR_FS_BASE:

                this.cpu.fsBase =
                    Number(value);

                break;

            // =====================================
            // GS BASE
            // =====================================

            case this.MSR_GS_BASE:

                this.cpu.gsBase =
                    Number(value);

                break;
        }

        this.registers.set(
            msr,
            value
        );
    }

    // =====================================
    // Handle EFER
    // =====================================

    handleEFER(value) {

        const longMode =

            (value >> 8n)
            & 1n;

        const nx =

            (value >> 11n)
            & 1n;

        this.cpu.longMode =
            Boolean(longMode);

        this.cpu.nxEnabled =
            Boolean(nx);

        console.log(

            `[EFER]
LongMode=${this.cpu.longMode}
NX=${this.cpu.nxEnabled}`
        );
    }

    // =====================================
    // Handle LSTAR
    // =====================================

    handleLSTAR(value) {

        this.cpu.syscallEntry =
            Number(value);

        console.log(

            `[SYSCALL ENTRY]
0x${value.toString(16)}`
        );
    }

    // =====================================
    // Increment TSC
    // =====================================

    tick(cycles = 1) {

        const tsc =
            this.read(
                this.MSR_TSC
            );

        this.registers.set(

            this.MSR_TSC,

            tsc + BigInt(cycles)
        );
    }

    // =====================================
    // SYSENTER/SYSCALL
    // =====================================

    syscall() {

        const entry =
            this.read(
                this.MSR_LSTAR
            );

        // save RIP
        this.cpu.rcx =
            this.cpu.rip;

        // jump
        this.cpu.rip =
            Number(entry);

        console.log(

            `[SYSCALL]
-> 0x${entry.toString(16)}`
        );
    }

    // =====================================
    // SYSRET
    // =====================================

    sysret() {

        this.cpu.rip =
            this.cpu.rcx;

        console.log(
            "[SYSRET]"
        );
    }

    // =====================================
    // Check MSR
    // =====================================

    exists(msr) {

        return this.registers.has(msr);
    }

    // =====================================
    // Dump
    // =====================================

    dump() {

        const out = {};

        for(
            const [k, v]
            of this.registers
        ) {

            out[
                `0x${k.toString(16)}`
            ] =
                `0x${v.toString(16)}`;
        }

        return out;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            count:
                this.registers.size,

            longMode:
                this.cpu.longMode,

            nx:
                this.cpu.nxEnabled,

            syscallEntry:
                this.cpu.syscallEntry
        };
    }
}