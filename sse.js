// sse.js
// SSE / SSE2 / AVX Emulator for Web-VB
// x86-64 SIMD Register System

class SSE {

    constructor(cpu, ram) {

        this.cpu = cpu;

        this.ram = ram;

        // =====================================
        // XMM Registers (128-bit)
        // =====================================

        this.xmm = [];

        for(let i = 0; i < 16; i++) {

            this.xmm.push(

                new ArrayBuffer(16)
            );
        }

        // =====================================
        // YMM Registers (256-bit AVX)
        // =====================================

        this.ymm = [];

        for(let i = 0; i < 16; i++) {

            this.ymm.push(

                new ArrayBuffer(32)
            );
        }

        // =====================================
        // MXCSR
        // =====================================

        this.mxcsr = 0x1F80;

        console.log(
            "SSE/AVX Ready"
        );
    }

    // =====================================
    // Helpers
    // =====================================

    xmmF32(index) {

        return new Float32Array(
            this.xmm[index]
        );
    }

    xmmF64(index) {

        return new Float64Array(
            this.xmm[index]
        );
    }

    xmmI32(index) {

        return new Int32Array(
            this.xmm[index]
        );
    }

    ymmF32(index) {

        return new Float32Array(
            this.ymm[index]
        );
    }

    // =====================================
    // MOVAPS
    // Move aligned packed single
    // =====================================

    movaps(dst, src) {

        const d =
            new Uint8Array(
                this.xmm[dst]
            );

        const s =
            new Uint8Array(
                this.xmm[src]
            );

        d.set(s);
    }

    // =====================================
    // MOVUPS
    // =====================================

    movups(dst, src) {

        this.movaps(dst, src);
    }

    // =====================================
    // MOVSS
    // =====================================

    movss(dst, src) {

        const d =
            this.xmmF32(dst);

        const s =
            this.xmmF32(src);

        d[0] = s[0];
    }

    // =====================================
    // ADDPS
    // Packed float add
    // =====================================

    addps(dst, src) {

        const d =
            this.xmmF32(dst);

        const s =
            this.xmmF32(src);

        for(let i = 0; i < 4; i++) {

            d[i] += s[i];
        }
    }

    // =====================================
    // SUBPS
    // =====================================

    subps(dst, src) {

        const d =
            this.xmmF32(dst);

        const s =
            this.xmmF32(src);

        for(let i = 0; i < 4; i++) {

            d[i] -= s[i];
        }
    }

    // =====================================
    // MULPS
    // =====================================

    mulps(dst, src) {

        const d =
            this.xmmF32(dst);

        const s =
            this.xmmF32(src);

        for(let i = 0; i < 4; i++) {

            d[i] *= s[i];
        }
    }

    // =====================================
    // DIVPS
    // =====================================

    divps(dst, src) {

        const d =
            this.xmmF32(dst);

        const s =
            this.xmmF32(src);

        for(let i = 0; i < 4; i++) {

            d[i] /= s[i];
        }
    }

    // =====================================
    // SQRTPS
    // =====================================

    sqrtps(dst) {

        const d =
            this.xmmF32(dst);

        for(let i = 0; i < 4; i++) {

            d[i] =
                Math.sqrt(
                    d[i]
                );
        }
    }

    // =====================================
    // ANDPS
    // =====================================

    andps(dst, src) {

        const d =
            new Uint32Array(
                this.xmm[dst]
            );

        const s =
            new Uint32Array(
                this.xmm[src]
            );

        for(let i = 0; i < 4; i++) {

            d[i] &= s[i];
        }
    }

    // =====================================
    // ORPS
    // =====================================

    orps(dst, src) {

        const d =
            new Uint32Array(
                this.xmm[dst]
            );

        const s =
            new Uint32Array(
                this.xmm[src]
            );

        for(let i = 0; i < 4; i++) {

            d[i] |= s[i];
        }
    }

    // =====================================
    // XORPS
    // =====================================

    xorps(dst, src) {

        const d =
            new Uint32Array(
                this.xmm[dst]
            );

        const s =
            new Uint32Array(
                this.xmm[src]
            );

        for(let i = 0; i < 4; i++) {

            d[i] ^= s[i];
        }
    }

    // =====================================
    // COMISS
    // Compare scalar float
    // =====================================

    comiss(a, b) {

        const av =
            this.xmmF32(a)[0];

        const bv =
            this.xmmF32(b)[0];

        if(av === bv) {

            this.cpu.flags.zf = 1;

        } else {

            this.cpu.flags.zf = 0;
        }

        if(av < bv) {

            this.cpu.flags.cf = 1;

        } else {

            this.cpu.flags.cf = 0;
        }
    }

    // =====================================
    // CVTSI2SS
    // int -> float
    // =====================================

    cvtsi2ss(dst, value) {

        const d =
            this.xmmF32(dst);

        d[0] =
            Number(value);
    }

    // =====================================
    // CVTTSS2SI
    // float -> int
    // =====================================

    cvttss2si(src) {

        const s =
            this.xmmF32(src);

        return Math.trunc(
            s[0]
        );
    }

    // =====================================
    // MOVDQU memory -> xmm
    // =====================================

    loadXMM(addr, xmm) {

        const bytes =
            new Uint8Array(
                this.xmm[xmm]
            );

        for(let i = 0; i < 16; i++) {

            bytes[i] =
                this.ram.read8(
                    addr + i
                );
        }
    }

    // =====================================
    // xmm -> memory
    // =====================================

    storeXMM(xmm, addr) {

        const bytes =
            new Uint8Array(
                this.xmm[xmm]
            );

        for(let i = 0; i < 16; i++) {

            this.ram.write8(

                addr + i,

                bytes[i]
            );
        }
    }

    // =====================================
    // AVX VADDPS
    // =====================================

    vaddps(dst, a, b) {

        const d =
            this.ymmF32(dst);

        const av =
            this.ymmF32(a);

        const bv =
            this.ymmF32(b);

        for(let i = 0; i < 8; i++) {

            d[i] =
                av[i]
                +
                bv[i];
        }
    }

    // =====================================
    // Clear Registers
    // =====================================

    reset() {

        for(let i = 0; i < 16; i++) {

            new Uint8Array(
                this.xmm[i]
            ).fill(0);

            new Uint8Array(
                this.ymm[i]
            ).fill(0);
        }

        this.mxcsr = 0x1F80;
    }

    // =====================================
    // Debug
    // =====================================

    dumpXMM(index) {

        return Array.from(

            this.xmmF32(index)
        );
    }

    dumpYMM(index) {

        return Array.from(

            this.ymmF32(index)
        );
    }

    // =====================================
    // Execute SSE Opcode
    // =====================================

    execute(opcode, operands) {

        switch(opcode) {

            case "ADDPS":

                this.addps(
                    operands.dst,
                    operands.src
                );

                break;

            case "SUBPS":

                this.subps(
                    operands.dst,
                    operands.src
                );

                break;

            case "MULPS":

                this.mulps(
                    operands.dst,
                    operands.src
                );

                break;

            case "DIVPS":

                this.divps(
                    operands.dst,
                    operands.src
                );

                break;

            case "SQRTPS":

                this.sqrtps(
                    operands.dst
                );

                break;

            default:

                console.warn(

                    `[SSE] Unknown opcode ${opcode}`
                );
        }
    }
}