// x86_decoder.js
// x86-64 instruction decoder
// Intel/AMD compatible decoder core

class X86Decoder {

    constructor(memory) {

        this.memory = memory;

        // =====================================
        // Register tables
        // =====================================

        this.reg64 = [

            "rax",
            "rcx",
            "rdx",
            "rbx",

            "rsp",
            "rbp",
            "rsi",
            "rdi",

            "r8",
            "r9",
            "r10",
            "r11",

            "r12",
            "r13",
            "r14",
            "r15"
        ];

        // =====================================
        // Prefixes
        // =====================================

        this.prefixes = {

            LOCK: 0xF0,

            REPNE: 0xF2,

            REP: 0xF3,

            OPERAND_SIZE: 0x66,

            ADDRESS_SIZE: 0x67
        };

        console.log(
            "x86 Decoder Ready"
        );
    }

    // =====================================
    // Read helpers
    // =====================================

    read8(addr) {

        return this.memory.read8(addr);
    }

    read16(addr) {

        return this.memory.read16(addr);
    }

    read32(addr) {

        return this.memory.read32(addr);
    }

    read64(addr) {

        return this.memory.read64(addr);
    }

    // =====================================
    // Decode instruction
    // =====================================

    decode(rip) {

        let start = rip;

        // =====================================
        // Result
        // =====================================

        const ins = {

            rip,

            size: 0,

            opcode: 0,

            mnemonic: "unknown",

            operands: [],

            prefixes: [],

            rex: null,

            modrm: null,

            sib: null,

            displacement: null,

            immediate: null
        };

        // =====================================
        // Prefix parse
        // =====================================

        while(true) {

            const byte =
                this.read8(rip);

            // =====================================
            // Legacy prefixes
            // =====================================

            if(

                byte === 0xF0
                ||

                byte === 0xF2
                ||

                byte === 0xF3
                ||

                byte === 0x66
                ||

                byte === 0x67
            ) {

                ins.prefixes.push(byte);

                rip++;

                continue;
            }

            // =====================================
            // REX
            // =====================================

            if(
                byte >= 0x40
                &&
                byte <= 0x4F
            ) {

                ins.rex = {

                    raw: byte,

                    w:
                        (byte >> 3) & 1,

                    r:
                        (byte >> 2) & 1,

                    x:
                        (byte >> 1) & 1,

                    b:
                        byte & 1
                };

                rip++;

                continue;
            }

            break;
        }

        // =====================================
        // Opcode
        // =====================================

        ins.opcode =
            this.read8(rip);

        rip++;

        // =====================================
        // Decode opcode
        // =====================================

        switch(ins.opcode) {

            // =====================================
            // NOP
            // =====================================

            case 0x90:

                ins.mnemonic = "nop";

                break;

            // =====================================
            // RET
            // =====================================

            case 0xC3:

                ins.mnemonic = "ret";

                break;

            // =====================================
            // HLT
            // =====================================

            case 0xF4:

                ins.mnemonic = "hlt";

                break;

            // =====================================
            // INT3
            // =====================================

            case 0xCC:

                ins.mnemonic = "int3";

                break;

            // =====================================
            // JMP rel32
            // =====================================

            case 0xE9:

                ins.mnemonic = "jmp";

                ins.immediate =
                    this.read32(rip);

                rip += 4;

                break;

            // =====================================
            // CALL rel32
            // =====================================

            case 0xE8:

                ins.mnemonic = "call";

                ins.immediate =
                    this.read32(rip);

                rip += 4;

                break;

            // =====================================
            // MOV r64, imm64
            // =====================================

            default:

                // =====================================
                // MOV
                // =====================================

                if(

                    ins.opcode >= 0xB8
                    &&

                    ins.opcode <= 0xBF
                ) {

                    const regIndex =

                        (ins.opcode - 0xB8)

                        +

                        (
                            ins.rex?.b
                            ? 8
                            : 0
                        );

                    ins.mnemonic =
                        "mov";

                    ins.operands.push({

                        type: "reg",

                        value:
                            this.reg64[
                                regIndex
                            ]
                    });

                    if(
                        ins.rex?.w
                    ) {

                        ins.immediate =
                            this.read64(rip);

                        rip += 8;

                    } else {

                        ins.immediate =
                            this.read32(rip);

                        rip += 4;
                    }

                    ins.operands.push({

                        type: "imm",

                        value:
                            ins.immediate
                    });

                    break;
                }

                // =====================================
                // Two-byte opcodes
                // =====================================

                if(
                    ins.opcode === 0x0F
                ) {

                    const op2 =
                        this.read8(rip);

                    rip++;

                    switch(op2) {

                        // SYSCALL
                        case 0x05:

                            ins.mnemonic =
                                "syscall";

                            break;

                        // CPUID
                        case 0xA2:

                            ins.mnemonic =
                                "cpuid";

                            break;

                        // SSE MOVAPS
                        case 0x28:

                            ins.mnemonic =
                                "movaps";

                            ins.modrm =
                                this.decodeModRM(
                                    rip,
                                    ins
                                );

                            rip +=
                                ins.modrm.size;

                            break;

                        default:

                            ins.mnemonic =
                                "unknown_0f";
                    }

                    break;
                }

                // =====================================
                // ModRM instructions
                // =====================================

                ins.modrm =
                    this.decodeModRM(
                        rip,
                        ins
                    );

                rip +=
                    ins.modrm.size;

                // =====================================
                // ADD
                // =====================================

                if(
                    ins.opcode === 0x01
                ) {

                    ins.mnemonic =
                        "add";
                }

                // =====================================
                // SUB
                // =====================================

                else if(
                    ins.opcode === 0x29
                ) {

                    ins.mnemonic =
                        "sub";
                }

                // =====================================
                // MOV
                // =====================================

                else if(

                    ins.opcode === 0x89
                    ||

                    ins.opcode === 0x8B
                ) {

                    ins.mnemonic =
                        "mov";
                }

                // =====================================
                // CMP
                // =====================================

                else if(
                    ins.opcode === 0x39
                ) {

                    ins.mnemonic =
                        "cmp";
                }
        }

        // =====================================
        // Final size
        // =====================================

        ins.size =
            rip - start;

        return ins;
    }

    // =====================================
    // Decode ModRM
    // =====================================

    decodeModRM(

        rip,
        ins
    ) {

        const byte =
            this.read8(rip);

        const mod =
            (byte >> 6) & 0b11;

        const reg =
            (byte >> 3) & 0b111;

        const rm =
            byte & 0b111;

        let size = 1;

        const result = {

            raw: byte,

            mod,
            reg,
            rm,

            size,

            displacement:
                null
        };

        // =====================================
        // SIB
        // =====================================

        if(
            rm === 4
            &&
            mod !== 3
        ) {

            result.sib =
                this.decodeSIB(
                    rip + size,
                    ins
                );

            size +=
                result.sib.size;
        }

        // =====================================
        // displacement
        // =====================================

        if(mod === 1) {

            result.displacement =
                this.read8(
                    rip + size
                );

            size += 1;
        }

        else if(mod === 2) {

            result.displacement =
                this.read32(
                    rip + size
                );

            size += 4;
        }

        result.size = size;

        return result;
    }

    // =====================================
    // Decode SIB
    // =====================================

    decodeSIB(

        rip,
        ins
    ) {

        const byte =
            this.read8(rip);

        return {

            raw: byte,

            scale:
                (byte >> 6) & 0b11,

            index:
                (byte >> 3) & 0b111,

            base:
                byte & 0b111,

            size: 1
        };
    }

    // =====================================
    // Decode block
    // =====================================

    decodeBlock(

        rip,
        max = 64
    ) {

        const block = [];

        let current = rip;

        for(
            let i = 0;
            i < max;
            i++
        ) {

            const ins =
                this.decode(
                    current
                );

            block.push(ins);

            current +=
                ins.size;

            // =====================================
            // stop on branch
            // =====================================

            if(

                ins.mnemonic === "jmp"
                ||

                ins.mnemonic === "ret"
                ||

                ins.mnemonic === "hlt"
            ) {

                break;
            }
        }

        return block;
    }

    // =====================================
    // Pretty print
    // =====================================

    format(ins) {

        let out =
            ins.mnemonic;

        // =====================================
        // operands
        // =====================================

        if(
            ins.operands.length
        ) {

            out += " ";

            out +=
                ins.operands
                .map(op => {

                    return op.value;
                })
                .join(", ");
        }

        // =====================================
        // immediate
        // =====================================

        if(
            ins.immediate
            !== null
        ) {

            out +=
                ` 0x${ins.immediate.toString(16)}`;
        }

        return out;
    }

    // =====================================
    // Dump block
    // =====================================

    dumpBlock(block) {

        for(
            const ins
            of block
        ) {

            console.log(

`${ins.rip.toString(16)}:
${this.format(ins)}`
            );
        }
    }

    // =====================================
    // Linux kernel decode
    // =====================================

    decodeKernel(

        start,
        count = 256
    ) {

        console.log(
            "[KERNEL DECODE]"
        );

        return this.decodeBlock(
            start,
            count
        );
    }

    // =====================================
    // ELF decode
    // =====================================

    decodeELF(entry) {

        console.log(
            "[ELF DECODE]"
        );

        return this.decodeBlock(
            entry,
            128
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            architecture:
                "x86-64",

            supports: [

                "REX",
                "ModRM",
                "SIB",
                "SSE",
                "SYSCALL",
                "CPUID"
            ]
        };
    }
}