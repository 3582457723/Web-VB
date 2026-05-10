// cpu.js
// 超最小 x86-64 CPU Emulator
// 教育用・実験用
// 実際のx86-64全命令は未実装

class CPU {

    constructor(memorySize = 1024 * 1024 * 16) {

        // =========================
        // RAM
        // =========================

        this.mem = new Uint8Array(memorySize);

        // =========================
        // 64bit Registers
        // =========================

        this.rax = 0n;
        this.rbx = 0n;
        this.rcx = 0n;
        this.rdx = 0n;

        this.rsi = 0n;
        this.rdi = 0n;

        this.rbp = 0n;
        this.rsp = 0n;

        this.r8  = 0n;
        this.r9  = 0n;
        this.r10 = 0n;
        this.r11 = 0n;
        this.r12 = 0n;
        this.r13 = 0n;
        this.r14 = 0n;
        this.r15 = 0n;

        // =========================
        // Instruction Pointer
        // =========================

        this.rip = 0n;

        // =========================
        // FLAGS
        // =========================

        this.flags = {

            zf: false,
            cf: false,
            sf: false,
            of: false
        };

        // =========================
        // CPU State
        // =========================

        this.halted = false;
    }

    // =========================================
    // Memory Read
    // =========================================

    read8(addr) {

        return this.mem[Number(addr)];
    }

    read16(addr) {

        return (
            this.read8(addr) |
            (this.read8(addr + 1n) << 8)
        );
    }

    read32(addr) {

        return (
            this.read8(addr) |
            (this.read8(addr + 1n) << 8) |
            (this.read8(addr + 2n) << 16) |
            (this.read8(addr + 3n) << 24)
        ) >>> 0;
    }

    read64(addr) {

        let value = 0n;

        for(let i = 0n; i < 8n; i++) {

            value |= (
                BigInt(
                    this.read8(addr + i)
                ) << (i * 8n)
            );
        }

        return value;
    }

    // =========================================
    // Memory Write
    // =========================================

    write8(addr, value) {

        this.mem[Number(addr)] = Number(value & 0xFFn);
    }

    write64(addr, value) {

        for(let i = 0n; i < 8n; i++) {

            this.write8(
                addr + i,
                (value >> (i * 8n)) & 0xFFn
            );
        }
    }

    // =========================================
    // Fetch
    // =========================================

    fetch8() {

        return this.mem[Number(this.rip++)];
    }

    fetch64() {

        let value = 0n;

        for(let i = 0n; i < 8n; i++) {

            value |= (
                BigInt(this.fetch8())
                << (i * 8n)
            );
        }

        return value;
    }

    // =========================================
    // Register Access
    // =========================================

    getRegister(index) {

        switch(index) {

            case 0: return this.rax;
            case 1: return this.rcx;
            case 2: return this.rdx;
            case 3: return this.rbx;
            case 4: return this.rsp;
            case 5: return this.rbp;
            case 6: return this.rsi;
            case 7: return this.rdi;

            default:
                throw new Error("Invalid register");
        }
    }

    setRegister(index, value) {

        value &= 0xFFFFFFFFFFFFFFFFn;

        switch(index) {

            case 0: this.rax = value; break;
            case 1: this.rcx = value; break;
            case 2: this.rdx = value; break;
            case 3: this.rbx = value; break;
            case 4: this.rsp = value; break;
            case 5: this.rbp = value; break;
            case 6: this.rsi = value; break;
            case 7: this.rdi = value; break;

            default:
                throw new Error("Invalid register");
        }
    }

    // =========================================
    // FLAGS
    // =========================================

    updateZeroFlag(value) {

        this.flags.zf = (value === 0n);
    }

    updateSignFlag(value) {

        this.flags.sf =
            ((value >> 63n) & 1n) === 1n;
    }

    updateFlags(value) {

        this.updateZeroFlag(value);
        this.updateSignFlag(value);
    }

    // =========================================
    // Stack
    // =========================================

    push64(value) {

        this.rsp -= 8n;

        this.write64(this.rsp, value);
    }

    pop64() {

        const value = this.read64(this.rsp);

        this.rsp += 8n;

        return value;
    }

    // =========================================
    // Debug
    // =========================================

    dumpRegisters() {

        console.log("==== REGISTERS ====");

        console.log("RAX", this.rax.toString(16));
        console.log("RBX", this.rbx.toString(16));
        console.log("RCX", this.rcx.toString(16));
        console.log("RDX", this.rdx.toString(16));

        console.log("RSI", this.rsi.toString(16));
        console.log("RDI", this.rdi.toString(16));

        console.log("RBP", this.rbp.toString(16));
        console.log("RSP", this.rsp.toString(16));

        console.log("RIP", this.rip.toString(16));

        console.log("ZF", this.flags.zf);
        console.log("SF", this.flags.sf);
    }

    // =========================================
    // CPU Step
    // =========================================

    step() {

        if(this.halted) {
            return false;
        }

        const opcode = this.fetch8();

        // =====================================
        // Single-byte opcodes
        // =====================================

        switch(opcode) {

            // NOP
            case 0x90:
                return true;

            // HLT
            case 0xF4:
                this.halted = true;
                return false;

            // RET
            case 0xC3:
                this.rip = this.pop64();
                return true;

            // JMP rel8
            case 0xEB: {

                let rel = this.fetch8();

                if(rel & 0x80) {
                    rel -= 0x100;
                }

                this.rip += BigInt(rel);

                return true;
            }

            // CALL rel32
            case 0xE8: {

                let rel = this.fetch8();

                rel |= this.fetch8() << 8;
                rel |= this.fetch8() << 16;
                rel |= this.fetch8() << 24;

                if(rel & 0x80000000) {
                    rel = rel - 0x100000000;
                }

                this.push64(this.rip);

                this.rip += BigInt(rel);

                return true;
            }
        }

        // =====================================
        // 64bit REX
        // =====================================

        if(opcode === 0x48) {

            const op2 = this.fetch8();

            // MOV RAX, imm64
            if(op2 === 0xB8) {

                this.rax = this.fetch64();

                return true;
            }

            // MOV RBX, imm64
            if(op2 === 0xBB) {

                this.rbx = this.fetch64();

                return true;
            }

            // ADD RAX, RBX
            if(op2 === 0x01) {

                const modrm = this.fetch8();

                if(modrm === 0xD8) {

                    this.rax += this.rbx;

                    this.rax &= 0xFFFFFFFFFFFFFFFFn;

                    this.updateFlags(this.rax);

                    return true;
                }
            }

            // SUB RAX, RBX
            if(op2 === 0x29) {

                const modrm = this.fetch8();

                if(modrm === 0xD8) {

                    this.rax -= this.rbx;

                    this.rax &= 0xFFFFFFFFFFFFFFFFn;

                    this.updateFlags(this.rax);

                    return true;
                }
            }

            // XOR RAX, RAX
            if(op2 === 0x31) {

                const modrm = this.fetch8();

                if(modrm === 0xC0) {

                    this.rax = 0n;

                    this.updateFlags(this.rax);

                    return true;
                }
            }

            // CMP RAX, RBX
            if(op2 === 0x39) {

                const modrm = this.fetch8();

                if(modrm === 0xD8) {

                    const result =
                        (this.rax - this.rbx)
                        & 0xFFFFFFFFFFFFFFFFn;

                    this.updateFlags(result);

                    return true;
                }
            }

            throw new Error(
                "Unknown REX opcode: 48 " +
                op2.toString(16)
            );
        }

        // =====================================
        // JE rel8
        // =====================================

        if(opcode === 0x74) {

            let rel = this.fetch8();

            if(rel & 0x80) {
                rel -= 0x100;
            }

            if(this.flags.zf) {

                this.rip += BigInt(rel);
            }

            return true;
        }

        // =====================================
        // JNE rel8
        // =====================================

        if(opcode === 0x75) {

            let rel = this.fetch8();

            if(rel & 0x80) {
                rel -= 0x100;
            }

            if(!this.flags.zf) {

                this.rip += BigInt(rel);
            }

            return true;
        }

        throw new Error(
            "Unknown opcode: " +
            opcode.toString(16)
        );
    }

    // =========================================
    // Run
    // =========================================

    run(maxCycles = 1000000) {

        let cycles = 0;

        while(!this.halted) {

            this.step();

            cycles++;

            if(cycles >= maxCycles) {

                throw new Error(
                    "Max cycles reached"
                );
            }
        }
    }
}

// =============================================
// Example Program
// =============================================

const cpu = new CPU();

cpu.rsp = 0x80000n;

cpu.mem.set([

    // mov rax, 5
    0x48, 0xB8,
    5,0,0,0,0,0,0,0,

    // mov rbx, 10
    0x48, 0xBB,
    10,0,0,0,0,0,0,0,

    // add rax, rbx
    0x48, 0x01, 0xD8,

    // hlt
    0xF4
]);

cpu.run();

cpu.dumpRegisters();