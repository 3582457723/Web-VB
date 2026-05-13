// ioapic.js
// Intel I/O APIC Emulator
// Linux SMP interrupt routing support

class IOAPIC {

    constructor(

        lapic,
        cpu,
        memory
    ) {

        this.lapic = lapic;

        this.cpu = cpu;

        this.memory = memory;

        // =====================================
        // IOAPIC Registers
        // =====================================

        this.IOREGSEL = 0x00;
        this.IOWIN = 0x10;

        // =====================================
        // MMIO Base
        // =====================================

        this.base =
            0xFEC00000;

        // =====================================
        // Registers
        // =====================================

        this.selectedRegister = 0;

        this.registers = new Uint32Array(
            256
        );

        // =====================================
        // ID
        // =====================================

        this.id = 0;

        // =====================================
        // Version
        // =====================================

        this.version = 0x11;

        // =====================================
        // Redirection Entries
        // =====================================

        this.maxRedirect =
            24;

        this.redirectionTable = [];

        // =====================================
        // IRQ States
        // =====================================

        this.irqLines = new Array(
            24
        ).fill(false);

        // =====================================
        // Init
        // =====================================

        this.initRedirectionTable();

        console.log(
            "IOAPIC Ready"
        );
    }

    // =====================================
    // Initialize Redirection Table
    // =====================================

    initRedirectionTable() {

        for(
            let i = 0;
            i < this.maxRedirect;
            i++
        ) {

            this.redirectionTable.push({

                vector:
                    0x20 + i,

                deliveryMode:
                    0,

                destinationMode:
                    0,

                deliveryStatus:
                    0,

                polarity:
                    0,

                remoteIRR:
                    0,

                triggerMode:
                    0,

                mask:
                    1,

                destination:
                    0
            });
        }
    }

    // =====================================
    // MMIO Read
    // =====================================

    read(addr) {

        const offset =
            addr - this.base;

        switch(offset) {

            // =====================================
            // IOREGSEL
            // =====================================

            case this.IOREGSEL:

                return this.selectedRegister;

            // =====================================
            // IOWIN
            // =====================================

            case this.IOWIN:

                return this.readRegister(
                    this.selectedRegister
                );
        }

        console.warn(

            `[IOAPIC READ]
0x${addr.toString(16)}`
        );

        return 0;
    }

    // =====================================
    // MMIO Write
    // =====================================

    write(addr, value) {

        const offset =
            addr - this.base;

        switch(offset) {

            // =====================================
            // IOREGSEL
            // =====================================

            case this.IOREGSEL:

                this.selectedRegister =
                    value & 0xFF;

                return;

            // =====================================
            // IOWIN
            // =====================================

            case this.IOWIN:

                this.writeRegister(

                    this.selectedRegister,

                    value
                );

                return;
        }

        console.warn(

            `[IOAPIC WRITE]
0x${addr.toString(16)}
=0x${value.toString(16)}`
        );
    }

    // =====================================
    // Read Register
    // =====================================

    readRegister(reg) {

        // =====================================
        // IOAPICID
        // =====================================

        if(reg === 0x00) {

            return this.id << 24;
        }

        // =====================================
        // IOAPICVER
        // =====================================

        if(reg === 0x01) {

            return (

                this.version
                |
                (
                    (
                        this.maxRedirect - 1
                    )
                    << 16
                )
            );
        }

        // =====================================
        // IOAPICARB
        // =====================================

        if(reg === 0x02) {

            return this.id << 24;
        }

        // =====================================
        // Redirection Table
        // =====================================

        if(
            reg >= 0x10
        ) {

            return this.readRedirection(
                reg
            );
        }

        return 0;
    }

    // =====================================
    // Write Register
    // =====================================

    writeRegister(

        reg,
        value
    ) {

        // =====================================
        // IOAPICID
        // =====================================

        if(reg === 0x00) {

            this.id =
                (value >> 24)
                & 0xF;

            return;
        }

        // =====================================
        // Redirection Entries
        // =====================================

        if(
            reg >= 0x10
        ) {

            this.writeRedirection(

                reg,
                value
            );
        }
    }

    // =====================================
    // Read Redirection Entry
    // =====================================

    readRedirection(reg) {

        const index =
            Math.floor(
                (reg - 0x10)
                / 2
            );

        const high =
            (reg & 1);

        const entry =
            this.redirectionTable[index];

        if(!entry) {

            return 0;
        }

        // =====================================
        // Low dword
        // =====================================

        if(!high) {

            let value = 0;

            value |=
                entry.vector;

            value |=
                entry.deliveryMode
                << 8;

            value |=
                entry.destinationMode
                << 11;

            value |=
                entry.deliveryStatus
                << 12;

            value |=
                entry.polarity
                << 13;

            value |=
                entry.remoteIRR
                << 14;

            value |=
                entry.triggerMode
                << 15;

            value |=
                entry.mask
                << 16;

            return value;
        }

        // =====================================
        // High dword
        // =====================================

        return (
            entry.destination
            << 24
        );
    }

    // =====================================
    // Write Redirection Entry
    // =====================================

    writeRedirection(

        reg,
        value
    ) {

        const index =
            Math.floor(
                (reg - 0x10)
                / 2
            );

        const high =
            (reg & 1);

        const entry =
            this.redirectionTable[index];

        if(!entry) {

            return;
        }

        // =====================================
        // Low
        // =====================================

        if(!high) {

            entry.vector =
                value & 0xFF;

            entry.deliveryMode =
                (value >> 8)
                & 0x7;

            entry.destinationMode =
                (value >> 11)
                & 1;

            entry.deliveryStatus =
                (value >> 12)
                & 1;

            entry.polarity =
                (value >> 13)
                & 1;

            entry.remoteIRR =
                (value >> 14)
                & 1;

            entry.triggerMode =
                (value >> 15)
                & 1;

            entry.mask =
                (value >> 16)
                & 1;

        } else {

            // =====================================
            // High
            // =====================================

            entry.destination =
                (value >> 24)
                & 0xFF;
        }

        console.log(

            `[IOAPIC REDIR]
irq=${index}
vector=0x${entry.vector.toString(16)}
mask=${entry.mask}`
        );
    }

    // =====================================
    // Raise IRQ
    // =====================================

    raiseIRQ(irq) {

        if(
            irq < 0
            ||
            irq >= this.maxRedirect
        ) {

            return;
        }

        const entry =
            this.redirectionTable[irq];

        // masked
        if(entry.mask) {

            return;
        }

        console.log(

            `[IOAPIC IRQ]
${irq}
vector=0x${entry.vector.toString(16)}`
        );

        // =====================================
        // Route to LAPIC
        // =====================================

        if(this.lapic) {

            this.lapic.raiseVector(

                entry.destination,

                entry.vector
            );
        }
    }

    // =====================================
    // Lower IRQ
    // =====================================

    lowerIRQ(irq) {

        if(
            irq < 0
            ||
            irq >= this.maxRedirect
        ) {

            return;
        }

        this.irqLines[irq] = false;

        console.log(

            `[IOAPIC LOWER]
${irq}`
        );
    }

    // =====================================
    // Pulse IRQ
    // =====================================

    pulseIRQ(irq) {

        this.raiseIRQ(irq);

        this.lowerIRQ(irq);
    }

    // =====================================
    // Route IRQ
    // =====================================

    routeIRQ(

        irq,
        vector,
        cpu = 0
    ) {

        if(
            irq < 0
            ||
            irq >= this.maxRedirect
        ) {

            return false;
        }

        const entry =
            this.redirectionTable[irq];

        entry.vector =
            vector;

        entry.destination =
            cpu;

        entry.mask = 0;

        console.log(

            `[ROUTE IRQ]
irq=${irq}
vector=0x${vector.toString(16)}
cpu=${cpu}`
        );

        return true;
    }

    // =====================================
    // Mask IRQ
    // =====================================

    maskIRQ(irq) {

        if(
            this.redirectionTable[irq]
        ) {

            this.redirectionTable[irq]
            .mask = 1;
        }
    }

    // =====================================
    // Unmask IRQ
    // =====================================

    unmaskIRQ(irq) {

        if(
            this.redirectionTable[irq]
        ) {

            this.redirectionTable[irq]
            .mask = 0;
        }
    }

    // =====================================
    // Linux Setup
    // =====================================

    setupLinux() {

        console.log(
            "[IOAPIC LINUX]"
        );

        // =====================================
        // Timer IRQ0
        // =====================================

        this.routeIRQ(
            0,
            0x20,
            0
        );

        // =====================================
        // Keyboard IRQ1
        // =====================================

        this.routeIRQ(
            1,
            0x21,
            0
        );

        // =====================================
        // Disk IRQ14
        // =====================================

        this.routeIRQ(
            14,
            0x2E,
            0
        );
    }

    // =====================================
    // ACPI MADT Export
    // =====================================

    madtEntry() {

        return {

            type:
                "ioapic",

            id:
                this.id,

            address:
                this.base,

            gsiBase:
                0
        };
    }

    // =====================================
    // Dump
    // =====================================

    dump() {

        return {

            id:
                this.id,

            version:
                this.version,

            entries:
                this.redirectionTable
        };
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            base:
                this.base,

            version:
                this.version,

            maxIRQ:
                this.maxRedirect
        };
    }
}