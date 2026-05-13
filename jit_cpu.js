// jit_cpu.js
// x86-64 JIT CPU core
// Dynamic translation engine

class JITCPU {

    constructor(

        memory,
        paging,
        syscall,
        interrupts
    ) {

        this.memory = memory;

        this.paging = paging;

        this.syscall = syscall;

        this.interrupts = interrupts;

        // =====================================
        // Registers
        // =====================================

        this.regs = {

            rax: 0n,
            rbx: 0n,
            rcx: 0n,
            rdx: 0n,

            rsi: 0n,
            rdi: 0n,
            rbp: 0n,
            rsp: 0n,

            r8: 0n,
            r9: 0n,
            r10: 0n,
            r11: 0n,

            r12: 0n,
            r13: 0n,
            r14: 0n,
            r15: 0n,

            rip: 0n,

            rflags: 0x2n
        };

        // =====================================
        // SIMD
        // =====================================

        this.xmm = [];

        for(
            let i = 0;
            i < 16;
            i++
        ) {

            this.xmm.push(

                new Uint8Array(16)
            );
        }

        // =====================================
        // Translation Cache
        // =====================================

        this.blocks =
            new Map();

        // =====================================
        // Runtime
        // =====================================

        this.running = false;

        this.instructions = 0;

        this.cycles = 0;

        this.blockCounter = 0;

        // =====================================
        // CPU State
        // =====================================

        this.mode =
            "long";

        this.halted = false;

        // =====================================
        // CPUID
        // =====================================

        this.cpuid = {

            vendor:
                "WebVBCPU",

            brand:
                "WebVB x86-64",

            features: {

                sse: true,
                sse2: true,
                sse3: true,

                apic: true,
                syscall: true,

                mmx: true,

                longmode: true
            }
        };

        console.log(
            "JIT CPU Ready"
        );
    }

    // =====================================
    // Reset
    // =====================================

    reset() {

        for(
            const reg in this.regs
        ) {

            this.regs[reg] = 0n;
        }

        this.regs.rflags = 0x2n;

        this.running = false;

        this.halted = false;

        this.instructions = 0;

        this.cycles = 0;

        console.log(
            "[CPU RESET]"
        );
    }

    // =====================================
    // Fetch
    // =====================================

    fetch8(addr) {

        return this.memory.read8(
            Number(addr)
        );
    }

    fetch16(addr) {

        return this.memory.read16(
            Number(addr)
        );
    }

    fetch32(addr) {

        return this.memory.read32(
            Number(addr)
        );
    }

    fetch64(addr) {

        return this.memory.read64(
            Number(addr)
        );
    }

    // =====================================
    // Translation Cache
    // =====================================

    hasBlock(rip) {

        return this.blocks.has(
            rip.toString()
        );
    }

    getBlock(rip) {

        return this.blocks.get(
            rip.toString()
        );
    }

    addBlock(

        rip,
        block
    ) {

        this.blocks.set(

            rip.toString(),

            block
        );
    }

    // =====================================
    // Decode
    // =====================================

    decode(rip) {

        const opcode =
            this.fetch8(rip);

        // =====================================
        // Minimal decoder
        // =====================================

        switch(opcode) {

            // =====================================
            // NOP
            // =====================================

            case 0x90:

                return {

                    op: "nop",
                    size: 1
                };

            // =====================================
            // HLT
            // =====================================

            case 0xF4:

                return {

                    op: "hlt",
                    size: 1
                };

            // =====================================
            // RET
            // =====================================

            case 0xC3:

                return {

                    op: "ret",
                    size: 1
                };

            // =====================================
            // SYSCALL
            // =====================================

            case 0x0F:

                {

                    const next =
                        this.fetch8(
                            rip + 1n
                        );

                    if(next === 0x05) {

                        return {

                            op:
                                "syscall",

                            size: 2
                        };
                    }

                    if(next === 0xA2) {

                        return {

                            op:
                                "cpuid",

                            size: 2
                        };
                    }
                }

                break;

            // =====================================
            // JMP rel32
            // =====================================

            case 0xE9:

                return {

                    op: "jmp",

                    imm32:
                        this.fetch32(
                            rip + 1n
                        ),

                    size: 5
                };

            // =====================================
            // CALL rel32
            // =====================================

            case 0xE8:

                return {

                    op: "call",

                    imm32:
                        this.fetch32(
                            rip + 1n
                        ),

                    size: 5
                };
        }

        return {

            op: "unknown",

            opcode,

            size: 1
        };
    }

    // =====================================
    // Compile Block
    // =====================================

    compile(rip) {

        const instructions = [];

        let current =
            rip;

        // =====================================
        // Max instructions/block
        // =====================================

        for(
            let i = 0;
            i < 64;
            i++
        ) {

            const ins =
                this.decode(
                    current
                );

            instructions.push(ins);

            current += BigInt(
                ins.size
            );

            // block end
            if(

                ins.op === "ret"
                ||

                ins.op === "jmp"
                ||

                ins.op === "hlt"
                ||

                ins.op === "syscall"
            ) {

                break;
            }
        }

        // =====================================
        // JIT Function
        // =====================================

        const fn = () => {

            for(
                const ins of instructions
            ) {

                this.execute(
                    ins
                );
            }
        };

        const block = {

            id:
                this.blockCounter++,

            rip,

            instructions,

            execute: fn
        };

        this.addBlock(
            rip,
            block
        );

        console.log(

            `[JIT COMPILE]
0x${rip.toString(16)}
ins=${instructions.length}`
        );

        return block;
    }

    // =====================================
    // Execute Instruction
    // =====================================

    execute(ins) {

        this.instructions++;

        switch(ins.op) {

            // =====================================
            // NOP
            // =====================================

            case "nop":

                this.regs.rip +=
                    1n;

                break;

            // =====================================
            // HLT
            // =====================================

            case "hlt":

                this.halted = true;

                console.log(
                    "[CPU HALT]"
                );

                break;

            // =====================================
            // RET
            // =====================================

            case "ret":

                {

                    const addr =
                        this.pop64();

                    this.regs.rip =
                        addr;
                }

                break;

            // =====================================
            // JMP
            // =====================================

            case "jmp":

                {

                    const rel =
                        BigInt.asIntN(

                            32,

                            BigInt(
                                ins.imm32
                            )
                        );

                    this.regs.rip +=

                        5n + rel;
                }

                break;

            // =====================================
            // CALL
            // =====================================

            case "call":

                {

                    const rel =
                        BigInt.asIntN(

                            32,

                            BigInt(
                                ins.imm32
                            )
                        );

                    this.push64(

                        this.regs.rip
                        + 5n
                    );

                    this.regs.rip +=

                        5n + rel;
                }

                break;

            // =====================================
            // SYSCALL
            // =====================================

            case "syscall":

                this.handleSyscall();

                this.regs.rip +=
                    2n;

                break;

            // =====================================
            // CPUID
            // =====================================

            case "cpuid":

                this.handleCPUID();

                this.regs.rip +=
                    2n;

                break;

            // =====================================
            // Unknown
            // =====================================

            default:

                console.warn(

                    `[UNKNOWN OPCODE]
0x${ins.opcode.toString(16)}`
                );

                this.regs.rip +=
                    BigInt(
                        ins.size
                    );
        }

        this.cycles++;
    }

    // =====================================
    // Stack
    // =====================================

    push64(value) {

        this.regs.rsp -= 8n;

        this.memory.write64(

            Number(
                this.regs.rsp
            ),

            value
        );
    }

    pop64() {

        const value =
            this.memory.read64(

                Number(
                    this.regs.rsp
                )
            );

        this.regs.rsp += 8n;

        return value;
    }

    // =====================================
    // CPUID
    // =====================================

    handleCPUID() {

        const leaf =
            Number(
                this.regs.rax
            );

        switch(leaf) {

            case 0:

                this.regs.rax = 1n;

                break;

            case 1:

                // SSE + APIC
                this.regs.rdx =

                    BigInt(
                        (1 << 25)
                        |
                        (1 << 9)
                    );

                break;

            default:

                this.regs.rax = 0n;
        }

        console.log(
            "[CPUID]"
        );
    }

    // =====================================
    // Syscall
    // =====================================

    handleSyscall() {

        if(!this.syscall) {

            return;
        }

        const num =
            Number(
                this.regs.rax
            );

        const result =
            this.syscall.handle(

                num,

                this.regs
            );

        this.regs.rax =
            BigInt(result);

        console.log(

            `[SYSCALL]
${num}`
        );
    }

    // =====================================
    // Interrupt
    // =====================================

    interrupt(vector) {

        console.log(

            `[INTERRUPT]
0x${vector.toString(16)}`
        );

        if(
            this.interrupts
        ) {

            this.interrupts.handle(
                vector
            );
        }
    }

    // =====================================
    // Execute Block
    // =====================================

    runBlock() {

        const rip =
            this.regs.rip;

        let block;

        if(
            this.hasBlock(rip)
        ) {

            block =
                this.getBlock(
                    rip
                );

        } else {

            block =
                this.compile(
                    rip
                );
        }

        block.execute();
    }

    // =====================================
    // Main Loop
    // =====================================

    run(maxCycles = 100000) {

        this.running = true;

        console.log(
            "[CPU RUN]"
        );

        let executed = 0;

        while(

            this.running
            &&

            !this.halted
            &&

            executed < maxCycles
        ) {

            this.runBlock();

            executed++;
        }

        console.log(

            `[CPU STOP]
cycles=${executed}`
        );
    }

    // =====================================
    // Stop
    // =====================================

    stop() {

        this.running = false;
    }

    // =====================================
    // Single Step
    // =====================================

    step() {

        this.runBlock();
    }

    // =====================================
    // Load ELF
    // =====================================

    loadELF(elf) {

        this.regs.rip =
            BigInt(
                elf.entry
            );

        console.log(

            `[LOAD ELF]
entry=0x${elf.entry.toString(16)}`
        );
    }

    // =====================================
    // Linux Boot
    // =====================================

    bootLinux(

        kernelEntry,

        bootParams
    ) {

        this.regs.rip =
            BigInt(
                kernelEntry
            );

        // Linux ABI
        this.regs.rsi =
            BigInt(
                bootParams
            );

        console.log(
            "[BOOT LINUX]"
        );
    }

    // =====================================
    // Dump Registers
    // =====================================

    dump() {

        return {

            ...this.regs,

            mode:
                this.mode,

            instructions:
                this.instructions,

            cycles:
                this.cycles,

            blocks:
                this.blocks.size
        };
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            cpu:
                this.cpuid.brand,

            vendor:
                this.cpuid.vendor,

            mode:
                this.mode,

            jitBlocks:
                this.blocks.size,

            instructions:
                this.instructions
        };
    }
}