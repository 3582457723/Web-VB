// cpuid.js
// x86-64 CPUID Emulation for Web-VB

class CPUID {

    constructor(cpu) {

        this.cpu = cpu;

        // =====================================
        // Vendor
        // =====================================

        this.vendor =
            "WebVBCPU";

        // =====================================
        // Brand String
        // =====================================

        this.brand =

            "WebVB Virtual x86-64 CPU";

        // =====================================
        // Feature Flags
        // =====================================

        this.features = {

            // EDX
            fpu:  true,
            tsc:  true,
            msr:  true,
            cx8:  true,
            apic: true,
            sep:  true,
            mtrr: true,
            pge:  true,
            cmov: true,
            pat:  true,
            pse36:true,
            mmx:  true,
            fxsr: true,
            sse:  true,
            sse2: true,

            // ECX
            sse3: true,
            pclmulqdq: true,
            vmx: true,
            ssse3: true,
            fma: true,
            cx16: true,
            sse41: true,
            sse42: true,
            x2apic: true,
            movbe: true,
            popcnt: true,
            aes: true,
            xsave: true,
            avx: true,
            rdrand: true,

            // Extended
            syscall: true,
            nx: true,
            pdpe1gb: true,
            rdtscp: true,
            lm: true // Long mode
        };

        console.log(
            "CPUID Ready"
        );
    }

    // =====================================
    // Helpers
    // =====================================

    strToRegs(str) {

        const bytes =
            new TextEncoder()
            .encode(
                str.padEnd(12, " ")
            );

        const dv =
            new DataView(
                bytes.buffer
            );

        return {

            ebx:
                dv.getUint32(0, true),

            edx:
                dv.getUint32(4, true),

            ecx:
                dv.getUint32(8, true)
        };
    }

    brandRegs(part) {

        const bytes =
            new TextEncoder()
            .encode(
                part.padEnd(16, " ")
            );

        const dv =
            new DataView(
                bytes.buffer
            );

        return {

            eax:
                dv.getUint32(0, true),

            ebx:
                dv.getUint32(4, true),

            ecx:
                dv.getUint32(8, true),

            edx:
                dv.getUint32(12, true)
        };
    }

    // =====================================
    // Build Feature Bits
    // =====================================

    featureEDX() {

        let edx = 0;

        if(this.features.fpu)
            edx |= (1 << 0);

        if(this.features.tsc)
            edx |= (1 << 4);

        if(this.features.msr)
            edx |= (1 << 5);

        if(this.features.cx8)
            edx |= (1 << 8);

        if(this.features.apic)
            edx |= (1 << 9);

        if(this.features.sep)
            edx |= (1 << 11);

        if(this.features.mtrr)
            edx |= (1 << 12);

        if(this.features.pge)
            edx |= (1 << 13);

        if(this.features.cmov)
            edx |= (1 << 15);

        if(this.features.pat)
            edx |= (1 << 16);

        if(this.features.pse36)
            edx |= (1 << 17);

        if(this.features.mmx)
            edx |= (1 << 23);

        if(this.features.fxsr)
            edx |= (1 << 24);

        if(this.features.sse)
            edx |= (1 << 25);

        if(this.features.sse2)
            edx |= (1 << 26);

        return edx >>> 0;
    }

    featureECX() {

        let ecx = 0;

        if(this.features.sse3)
            ecx |= (1 << 0);

        if(this.features.pclmulqdq)
            ecx |= (1 << 1);

        if(this.features.vmx)
            ecx |= (1 << 5);

        if(this.features.ssse3)
            ecx |= (1 << 9);

        if(this.features.fma)
            ecx |= (1 << 12);

        if(this.features.cx16)
            ecx |= (1 << 13);

        if(this.features.sse41)
            ecx |= (1 << 19);

        if(this.features.sse42)
            ecx |= (1 << 20);

        if(this.features.x2apic)
            ecx |= (1 << 21);

        if(this.features.movbe)
            ecx |= (1 << 22);

        if(this.features.popcnt)
            ecx |= (1 << 23);

        if(this.features.aes)
            ecx |= (1 << 25);

        if(this.features.xsave)
            ecx |= (1 << 26);

        if(this.features.avx)
            ecx |= (1 << 28);

        if(this.features.rdrand)
            ecx |= (1 << 30);

        return ecx >>> 0;
    }

    // =====================================
    // Extended Features
    // =====================================

    extEDX() {

        let edx = 0;

        if(this.features.syscall)
            edx |= (1 << 11);

        if(this.features.nx)
            edx |= (1 << 20);

        if(this.features.pdpe1gb)
            edx |= (1 << 26);

        if(this.features.rdtscp)
            edx |= (1 << 27);

        if(this.features.lm)
            edx |= (1 << 29);

        return edx >>> 0;
    }

    // =====================================
    // Execute CPUID
    // =====================================

    execute(eax, ecx = 0) {

        // =====================================
        // 0x00000000
        // Vendor ID
        // =====================================

        if(eax === 0x00000000) {

            const regs =
                this.strToRegs(
                    this.vendor
                );

            return {

                eax: 0x00000001,

                ebx: regs.ebx,

                ecx: regs.ecx,

                edx: regs.edx
            };
        }

        // =====================================
        // 0x00000001
        // Features
        // =====================================

        if(eax === 0x00000001) {

            return {

                eax:
                    0x000806E9,

                ebx:
                    0,

                ecx:
                    this.featureECX(),

                edx:
                    this.featureEDX()
            };
        }

        // =====================================
        // 0x80000000
        // Extended max
        // =====================================

        if(eax === 0x80000000) {

            return {

                eax:
                    0x80000004,

                ebx: 0,
                ecx: 0,
                edx: 0
            };
        }

        // =====================================
        // 0x80000001
        // Extended features
        // =====================================

        if(eax === 0x80000001) {

            return {

                eax: 0,
                ebx: 0,
                ecx: 0,

                edx:
                    this.extEDX()
            };
        }

        // =====================================
        // Brand String
        // =====================================

        if(
            eax >= 0x80000002
            &&
            eax <= 0x80000004
        ) {

            const start =

                (eax - 0x80000002)
                * 16;

            const part =
                this.brand.slice(

                    start,

                    start + 16
                );

            return this.brandRegs(
                part
            );
        }

        // =====================================
        // Default
        // =====================================

        return {

            eax: 0,
            ebx: 0,
            ecx: 0,
            edx: 0
        };
    }

    // =====================================
    // Debug
    // =====================================

    info() {

        return {

            vendor:
                this.vendor,

            brand:
                this.brand,

            features:
                this.features
        };
    }
}