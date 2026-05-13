// acpi.js
// ACPI Emulator for Web-VB
// x86/x86-64 Linux Compatibility

class ACPI {

    constructor(

        cpu,
        ram,
        apic,
        smp,
        pci
    ) {

        this.cpu = cpu;
        this.ram = ram;

        this.apic = apic;
        this.smp = smp;
        this.pci = pci;

        // =====================================
        // ACPI Memory Layout
        // =====================================

        this.RSDP_ADDR = 0x000F0000;
        this.RSDT_ADDR = 0x000F1000;
        this.XSDT_ADDR = 0x000F2000;

        this.FADT_ADDR = 0x000F3000;
        this.MADT_ADDR = 0x000F4000;
        this.MCFG_ADDR = 0x000F5000;

        // =====================================
        // Tables
        // =====================================

        this.tables = {};

        console.log(
            "ACPI Ready"
        );
    }

    // =====================================
    // Helpers
    // =====================================

    writeString(addr, str) {

        for(
            let i = 0;
            i < str.length;
            i++
        ) {

            this.ram.write8(

                addr + i,

                str.charCodeAt(i)
            );
        }
    }

    checksum(addr, length) {

        let sum = 0;

        for(
            let i = 0;
            i < length;
            i++
        ) {

            sum += this.ram.read8(
                addr + i
            );
        }

        return (
            (256 - (sum & 0xFF))
            & 0xFF
        );
    }

    writeACPISDTHeader(

        addr,
        signature,
        length
    ) {

        // signature
        this.writeString(
            addr,
            signature
        );

        // length
        this.ram.write32(
            addr + 4,
            length
        );

        // revision
        this.ram.write8(
            addr + 8,
            2
        );

        // checksum
        this.ram.write8(
            addr + 9,
            0
        );

        // OEMID
        this.writeString(
            addr + 10,
            "WEBVB "
        );

        // OEM Table ID
        this.writeString(
            addr + 16,
            "WEBVBOS"
        );

        // OEM Revision
        this.ram.write32(
            addr + 24,
            1
        );

        // Creator ID
        this.writeString(
            addr + 28,
            "JSVM"
        );

        // Creator Revision
        this.ram.write32(
            addr + 32,
            1
        );
    }

    // =====================================
    // RSDP
    // =====================================

    createRSDP() {

        const addr =
            this.RSDP_ADDR;

        // signature
        this.writeString(
            addr,
            "RSD PTR "
        );

        // checksum
        this.ram.write8(
            addr + 8,
            0
        );

        // OEMID
        this.writeString(
            addr + 9,
            "WEBVB "
        );

        // revision
        this.ram.write8(
            addr + 15,
            2
        );

        // RSDT
        this.ram.write32(
            addr + 16,
            this.RSDT_ADDR
        );

        // length
        this.ram.write32(
            addr + 20,
            36
        );

        // XSDT
        this.ram.write64(
            addr + 24,
            BigInt(
                this.XSDT_ADDR
            )
        );

        // checksum
        this.ram.write8(

            addr + 8,

            this.checksum(
                addr,
                20
            )
        );

        // extended checksum
        this.ram.write8(

            addr + 32,

            this.checksum(
                addr,
                36
            )
        );

        console.log(
            "[RSDP CREATED]"
        );
    }

    // =====================================
    // RSDT
    // =====================================

    createRSDT() {

        const addr =
            this.RSDT_ADDR;

        const entries = [

            this.FADT_ADDR,
            this.MADT_ADDR,
            this.MCFG_ADDR
        ];

        const length =
            36 + (entries.length * 4);

        this.writeACPISDTHeader(

            addr,
            "RSDT",
            length
        );

        let off = addr + 36;

        for(const table of entries) {

            this.ram.write32(
                off,
                table
            );

            off += 4;
        }

        this.ram.write8(

            addr + 9,

            this.checksum(
                addr,
                length
            )
        );

        console.log(
            "[RSDT CREATED]"
        );
    }

    // =====================================
    // XSDT
    // =====================================

    createXSDT() {

        const addr =
            this.XSDT_ADDR;

        const entries = [

            this.FADT_ADDR,
            this.MADT_ADDR,
            this.MCFG_ADDR
        ];

        const length =
            36 + (entries.length * 8);

        this.writeACPISDTHeader(

            addr,
            "XSDT",
            length
        );

        let off = addr + 36;

        for(const table of entries) {

            this.ram.write64(

                off,

                BigInt(table)
            );

            off += 8;
        }

        this.ram.write8(

            addr + 9,

            this.checksum(
                addr,
                length
            )
        );

        console.log(
            "[XSDT CREATED]"
        );
    }

    // =====================================
    // FADT
    // =====================================

    createFADT() {

        const addr =
            this.FADT_ADDR;

        const length = 244;

        this.writeACPISDTHeader(

            addr,
            "FACP",
            length
        );

        // SCI interrupt
        this.ram.write16(
            addr + 46,
            9
        );

        // PM timer
        this.ram.write32(
            addr + 76,
            0x408
        );

        // flags
        this.ram.write32(
            addr + 112,
            1
        );

        this.ram.write8(

            addr + 9,

            this.checksum(
                addr,
                length
            )
        );

        console.log(
            "[FADT CREATED]"
        );
    }

    // =====================================
    // MADT
    // =====================================

    createMADT() {

        const addr =
            this.MADT_ADDR;

        const length = 128;

        this.writeACPISDTHeader(

            addr,
            "APIC",
            length
        );

        // Local APIC addr
        this.ram.write32(
            addr + 36,
            0xFEE00000
        );

        // flags
        this.ram.write32(
            addr + 40,
            1
        );

        let off = addr + 44;

        // =====================================
        // CPUs
        // =====================================

        const cores =
            this.smp?.cores
            || 1;

        for(
            let i = 0;
            i < cores;
            i++
        ) {

            // type
            this.ram.write8(
                off,
                0
            );

            // length
            this.ram.write8(
                off + 1,
                8
            );

            // ACPI ID
            this.ram.write8(
                off + 2,
                i
            );

            // APIC ID
            this.ram.write8(
                off + 3,
                i
            );

            // enabled
            this.ram.write32(
                off + 4,
                1
            );

            off += 8;
        }

        // IOAPIC
        this.ram.write8(
            off,
            1
        );

        this.ram.write8(
            off + 1,
            12
        );

        this.ram.write8(
            off + 2,
            0
        );

        this.ram.write32(
            off + 4,
            0xFEC00000
        );

        this.ram.write32(
            off + 8,
            0
        );

        this.ram.write8(

            addr + 9,

            this.checksum(
                addr,
                length
            )
        );

        console.log(
            "[MADT CREATED]"
        );
    }

    // =====================================
    // MCFG
    // =====================================

    createMCFG() {

        const addr =
            this.MCFG_ADDR;

        const length = 60;

        this.writeACPISDTHeader(

            addr,
            "MCFG",
            length
        );

        // PCIe ECAM base
        this.ram.write64(

            addr + 44,

            0xE0000000n
        );

        // segment group
        this.ram.write16(
            addr + 52,
            0
        );

        // bus start
        this.ram.write8(
            addr + 54,
            0
        );

        // bus end
        this.ram.write8(
            addr + 55,
            255
        );

        this.ram.write8(

            addr + 9,

            this.checksum(
                addr,
                length
            )
        );

        console.log(
            "[MCFG CREATED]"
        );
    }

    // =====================================
    // Install ACPI
    // =====================================

    install() {

        this.createRSDP();

        this.createRSDT();

        this.createXSDT();

        this.createFADT();

        this.createMADT();

        this.createMCFG();

        console.log(
            "[ACPI INSTALLED]"
        );
    }

    // =====================================
    // Find RSDP
    // =====================================

    findRSDP() {

        for(

            let addr = 0xE0000;

            addr < 0x100000;

            addr += 16
        ) {

            let sig = "";

            for(
                let i = 0;
                i < 8;
                i++
            ) {

                sig += String.fromCharCode(

                    this.ram.read8(
                        addr + i
                    )
                );
            }

            if(sig === "RSD PTR ") {

                return addr;
            }
        }

        return null;
    }

    // =====================================
    // Shutdown
    // =====================================

    shutdown() {

        console.log(
            "[ACPI SHUTDOWN]"
        );

        this.cpu.halted = true;
    }

    // =====================================
    // Reboot
    // =====================================

    reboot() {

        console.log(
            "[ACPI REBOOT]"
        );

        if(
            this.cpu.reset
        ) {

            this.cpu.reset();
        }
    }

    // =====================================
    // Sleep
    // =====================================

    sleep(state = "S3") {

        console.log(

            `[ACPI SLEEP]
${state}`
        );
    }

    // =====================================
    // Debug
    // =====================================

    dump() {

        return {

            rsdp:
                "0x"
                +
                this.RSDP_ADDR.toString(16),

            rsdt:
                "0x"
                +
                this.RSDT_ADDR.toString(16),

            xsdt:
                "0x"
                +
                this.XSDT_ADDR.toString(16),

            madt:
                "0x"
                +
                this.MADT_ADDR.toString(16),

            fadt:
                "0x"
                +
                this.FADT_ADDR.toString(16),

            mcfg:
                "0x"
                +
                this.MCFG_ADDR.toString(16)
        };
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            version:
                "ACPI 2.0",

            cpus:
                this.smp?.cores
                || 1,

            apic:
                Boolean(this.apic),

            pci:
                Boolean(this.pci)
        };
    }
}