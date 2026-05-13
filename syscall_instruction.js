// syscall_instruction.js
// x86-64 SYSCALL / SYSRET Instructions
// Linux Compatible Fast System Call Layer

class SyscallInstruction {

    constructor(

        cpu,
        msr,
        gdt,
        idt
    ) {

        this.cpu = cpu;

        this.msr = msr;

        this.gdt = gdt;
        this.idt = idt;

        // =====================================
        // MSRs
        // =====================================

        this.MSR_STAR  = 0xC0000081;
        this.MSR_LSTAR = 0xC0000082;
        this.MSR_CSTAR = 0xC0000083;
        this.MSR_FMASK = 0xC0000084;
        this.MSR_EFER  = 0xC0000080;

        // =====================================
        // EFER bits
        // =====================================

        this.EFER_SCE = (1n << 0n);

        console.log(
            "SYSCALL Instruction Ready"
        );
    }

    // =====================================
    // Enable SYSCALL/SYSRET
    // =====================================

    enable() {

        let efer =
            this.msr.read(
                this.MSR_EFER
            );

        efer |= this.EFER_SCE;

        this.msr.write(
            this.MSR_EFER,
            efer
        );

        console.log(
            "[SYSCALL ENABLED]"
        );
    }

    // =====================================
    // Setup Linux ABI
    // =====================================

    setupLinux(entryPoint) {

        this.enable();

        // =====================================
        // STAR
        // =====================================

        // Kernel CS = 0x08
        // User CS   = 0x1B

        const star =

            (
                BigInt(0x00130008)
                << 32n
            );

        this.msr.write(

            this.MSR_STAR,

            star
        );

        // =====================================
        // LSTAR
        // =====================================

        this.msr.write(

            this.MSR_LSTAR,

            BigInt(entryPoint)
        );

        // =====================================
        // FMASK
        // =====================================

        // clear IF on syscall

        this.msr.write(

            this.MSR_FMASK,

            (1n << 9n)
        );

        console.log(

            `[LINUX SYSCALL]
entry=0x${entryPoint.toString(16)}`
        );
    }

    // =====================================
    // Execute SYSCALL
    // =====================================

    syscall() {

        // =====================================
        // Check enabled
        // =====================================

        const efer =
            this.msr.read(
                this.MSR_EFER
            );

        if(
            !(efer & this.EFER_SCE)
        ) {

            throw new Error(
                "SYSCALL disabled"
            );
        }

        // =====================================
        // Save user RIP
        // =====================================

        this.cpu.rcx =
            this.cpu.rip;

        // =====================================
        // Save flags
        // =====================================

        this.cpu.r11 =
            this.cpu.rflags;

        // =====================================
        // Load FMASK
        // =====================================

        const fmask =
            this.msr.read(
                this.MSR_FMASK
            );

        this.cpu.rflags &=
            ~Number(fmask);

        // =====================================
        // Switch CPL
        // =====================================

        this.enterKernelMode();

        // =====================================
        // Load entry RIP
        // =====================================

        this.cpu.rip =
            Number(

                this.msr.read(
                    this.MSR_LSTAR
                )
            );

        console.log(

            `[SYSCALL]
rax=${this.cpu.rax}
rip=0x${this.cpu.rip.toString(16)}`
        );

        // =====================================
        // Linux syscall handler
        // =====================================

        if(
            this.cpu.linux
        ) {

            const ret =
                this.cpu.linux
                .syscall(

                    this.cpu.rax,

                    [

                        this.cpu.rdi,
                        this.cpu.rsi,
                        this.cpu.rdx,
                        this.cpu.r10,
                        this.cpu.r8,
                        this.cpu.r9
                    ]
                );

            this.cpu.rax = ret;
        }
    }

    // =====================================
    // SYSRET
    // =====================================

    sysret() {

        // =====================================
        // Restore RIP
        // =====================================

        this.cpu.rip =
            this.cpu.rcx;

        // =====================================
        // Restore flags
        // =====================================

        this.cpu.rflags =
            this.cpu.r11;

        // =====================================
        // User mode
        // =====================================

        this.enterUserMode();

        console.log(

            `[SYSRET]
rip=0x${this.cpu.rip.toString(16)}`
        );
    }

    // =====================================
    // Kernel Mode
    // =====================================

    enterKernelMode() {

        this.cpu.cpl = 0;

        this.cpu.cs =
            0x08;

        this.cpu.ss =
            0x10;

        if(
            this.gdt.enterKernelMode
        ) {

            this.gdt
            .enterKernelMode();
        }

        console.log(
            "[KERNEL MODE]"
        );
    }

    // =====================================
    // User Mode
    // =====================================

    enterUserMode() {

        this.cpu.cpl = 3;

        this.cpu.cs =
            0x1B;

        this.cpu.ss =
            0x23;

        if(
            this.gdt.enterUserMode
        ) {

            this.gdt
            .enterUserMode();
        }

        console.log(
            "[USER MODE]"
        );
    }

    // =====================================
    // SYSENTER
    // =====================================

    sysenter() {

        console.log(
            "[SYSENTER]"
        );

        this.enterKernelMode();
    }

    // =====================================
    // SYSEXIT
    // =====================================

    sysexit() {

        console.log(
            "[SYSEXIT]"
        );

        this.enterUserMode();
    }

    // =====================================
    // INT 0x80 Compatibility
    // =====================================

    int80() {

        console.log(
            "[INT 0x80]"
        );

        this.idt.interrupt(
            0x80
        );
    }

    // =====================================
    // Fast Dispatch
    // =====================================

    dispatch(opcode1, opcode2) {

        // =====================================
        // 0F 05 = syscall
        // =====================================

        if(
            opcode1 === 0x0F
            &&
            opcode2 === 0x05
        ) {

            this.syscall();

            return true;
        }

        // =====================================
        // 0F 07 = sysret
        // =====================================

        if(
            opcode1 === 0x0F
            &&
            opcode2 === 0x07
        ) {

            this.sysret();

            return true;
        }

        // =====================================
        // 0F 34 = sysenter
        // =====================================

        if(
            opcode1 === 0x0F
            &&
            opcode2 === 0x34
        ) {

            this.sysenter();

            return true;
        }

        // =====================================
        // 0F 35 = sysexit
        // =====================================

        if(
            opcode1 === 0x0F
            &&
            opcode2 === 0x35
        ) {

            this.sysexit();

            return true;
        }

        return false;
    }

    // =====================================
    // Linux ABI Registers
    // =====================================

    abi() {

        return {

            syscall:
                this.cpu.rax,

            arg1:
                this.cpu.rdi,

            arg2:
                this.cpu.rsi,

            arg3:
                this.cpu.rdx,

            arg4:
                this.cpu.r10,

            arg5:
                this.cpu.r8,

            arg6:
                this.cpu.r9
        };
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

            rax:
                this.cpu.rax,

            rcx:
                this.cpu.rcx,

            r11:
                this.cpu.r11,

            cpl:
                this.cpu.cpl,

            cs:
                "0x"
                +
                this.cpu.cs.toString(16),

            ss:
                "0x"
                +
                this.cpu.ss.toString(16)
        };
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            enabled:
                Boolean(

                    this.msr.read(
                        this.MSR_EFER
                    )
                    &
                    this.EFER_SCE
                ),

            lstar:
                "0x"
                +
                this.msr.read(
                    this.MSR_LSTAR
                ).toString(16),

            syscallABI:
                "Linux x86-64"
        };
    }
}