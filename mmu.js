// mmu.js
// Virtual x86-64 MMU
// Paging + Virtual Memory + Page Tables

class MMU {

    constructor(cpu, ram) {

        // =====================================
        // CPU / RAM
        // =====================================

        this.cpu = cpu;
        this.ram = ram;

        // =====================================
        // Paging
        // =====================================

        this.pagingEnabled = false;

        // =====================================
        // Page Size
        // =====================================

        this.pageSize = 4096;

        // =====================================
        // Virtual -> Physical
        // =====================================

        this.pageTable =
            new Map();

        // =====================================
        // CR Registers
        // =====================================

        this.cr0 = 0;
        this.cr2 = 0;
        this.cr3 = 0;
        this.cr4 = 0;

        // =====================================
        // Statistics
        // =====================================

        this.pageFaults = 0;

        console.log(
            "MMU Ready"
        );
    }

    // =====================================
    // Enable Paging
    // =====================================

    enablePaging() {

        this.pagingEnabled = true;

        console.log(
            "Paging Enabled"
        );
    }

    // =====================================
    // Disable Paging
    // =====================================

    disablePaging() {

        this.pagingEnabled = false;

        console.log(
            "Paging Disabled"
        );
    }

    // =====================================
    // Align Address
    // =====================================

    align(addr) {

        return (
            Math.floor(
                addr / this.pageSize
            ) * this.pageSize
        );
    }

    // =====================================
    // Map Page
    // =====================================

    map(
        virtualAddr,
        physicalAddr,
        flags = {}
    ) {

        virtualAddr =
            this.align(virtualAddr);

        physicalAddr =
            this.align(physicalAddr);

        this.pageTable.set(
            virtualAddr,
            {

                physical:
                    physicalAddr,

                present:
                    flags.present ?? true,

                writable:
                    flags.writable ?? true,

                user:
                    flags.user ?? false,

                executable:
                    flags.executable ?? true
            }
        );

        console.log(

            "MAP",

            "V:",
            "0x" +
            virtualAddr.toString(16),

            "-> P:",
            "0x" +
            physicalAddr.toString(16)
        );
    }

    // =====================================
    // Unmap Page
    // =====================================

    unmap(virtualAddr) {

        virtualAddr =
            this.align(virtualAddr);

        this.pageTable.delete(
            virtualAddr
        );

        console.log(

            "UNMAP",

            "0x" +
            virtualAddr.toString(16)
        );
    }

    // =====================================
    // Translate Address
    // =====================================

    translate(virtualAddr) {

        // Paging OFF
        if(!this.pagingEnabled) {

            return virtualAddr;
        }

        const pageBase =
            this.align(virtualAddr);

        const offset =
            virtualAddr % this.pageSize;

        const entry =
            this.pageTable.get(
                pageBase
            );

        if(!entry) {

            this.pageFault(
                virtualAddr
            );

            return null;
        }

        if(!entry.present) {

            this.pageFault(
                virtualAddr
            );

            return null;
        }

        return (
            entry.physical +
            offset
        );
    }

    // =====================================
    // Page Fault
    // =====================================

    pageFault(addr) {

        this.pageFaults++;

        this.cr2 = addr;

        console.error(

            "PAGE FAULT",

            "0x" +
            addr.toString(16)
        );

        // Raise CPU Exception
        if(
            this.cpu &&
            this.cpu.interrupts
        ) {

            this.cpu.interrupts
            .exception(14);
        }
    }

    // =====================================
    // Read8
    // =====================================

    read8(addr) {

        const phys =
            this.translate(addr);

        if(phys === null) {

            return 0;
        }

        return this.ram.read8(
            phys
        );
    }

    // =====================================
    // Write8
    // =====================================

    write8(addr, value) {

        const phys =
            this.translate(addr);

        if(phys === null) {

            return;
        }

        this.ram.write8(
            phys,
            value
        );
    }

    // =====================================
    // Read16
    // =====================================

    read16(addr) {

        return (

            this.read8(addr)
            |
            (
                this.read8(addr + 1)
                << 8
            )
        );
    }

    // =====================================
    // Write16
    // =====================================

    write16(addr, value) {

        this.write8(
            addr,
            value & 0xFF
        );

        this.write8(
            addr + 1,
            (value >> 8) & 0xFF
        );
    }

    // =====================================
    // Read32
    // =====================================

    read32(addr) {

        return (

            this.read8(addr)
            |
            (
                this.read8(addr + 1)
                << 8
            )
            |
            (
                this.read8(addr + 2)
                << 16
            )
            |
            (
                this.read8(addr + 3)
                << 24
            )
        );
    }

    // =====================================
    // Write32
    // =====================================

    write32(addr, value) {

        this.write8(
            addr,
            value & 0xFF
        );

        this.write8(
            addr + 1,
            (value >> 8) & 0xFF
        );

        this.write8(
            addr + 2,
            (value >> 16) & 0xFF
        );

        this.write8(
            addr + 3,
            (value >> 24) & 0xFF
        );
    }

    // =====================================
    // Identity Map
    // =====================================

    identityMap(
        start,
        end,
        flags = {}
    ) {

        for(
            let addr = start;
            addr < end;
            addr += this.pageSize
        ) {

            this.map(
                addr,
                addr,
                flags
            );
        }

        console.log(
            "Identity Map Complete"
        );
    }

    // =====================================
    // Allocate Virtual Memory
    // =====================================

    allocPages(
        virtualAddr,
        count,
        flags = {}
    ) {

        for(
            let i = 0;
            i < count;
            i++
        ) {

            const addr =
                virtualAddr +
                i * this.pageSize;

            const phys =
                addr;

            this.map(
                addr,
                phys,
                flags
            );
        }

        console.log(
            count,
            "pages allocated"
        );
    }

    // =====================================
    // Dump Page Table
    // =====================================

    dump() {

        console.log(
            "=== PAGE TABLE ==="
        );

        for(
            const
            [virt, entry]
            of this.pageTable
        ) {

            console.log(

                "V:",
                "0x" +
                virt.toString(16),

                "-> P:",
                "0x" +
                entry.physical.toString(16),

                entry
            );
        }
    }

    // =====================================
    // Set CR3
    // =====================================

    setCR3(addr) {

        this.cr3 = addr;

        console.log(
            "CR3 =",
            "0x" +
            addr.toString(16)
        );
    }

    // =====================================
    // TLB Flush
    // =====================================

    flushTLB() {

        console.log(
            "TLB Flushed"
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            paging:
                this.pagingEnabled,

            pages:
                this.pageTable.size,

            pageFaults:
                this.pageFaults,

            pageSize:
                this.pageSize,

            cr0:
                this.cr0,

            cr2:
                this.cr2,

            cr3:
                this.cr3,

            cr4:
                this.cr4
        };
    }
}