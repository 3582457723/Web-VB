// paging.js
// x86-64 4-Level Paging System
// For Web-VB Linux Compatibility

class Paging {

    constructor(ram) {

        this.ram = ram;

        // =====================================
        // Constants
        // =====================================

        this.PAGE_SIZE = 4096;

        this.PAGE_ENTRIES = 512;

        // =====================================
        // x86-64 Flags
        // =====================================

        this.PRESENT  = 1 << 0;
        this.WRITABLE = 1 << 1;
        this.USER     = 1 << 2;
        this.PWT      = 1 << 3;
        this.PCD      = 1 << 4;
        this.ACCESSED = 1 << 5;
        this.DIRTY    = 1 << 6;
        this.HUGE     = 1 << 7;
        this.GLOBAL   = 1 << 8;
        this.NX       = 1 << 63;

        // =====================================
        // Physical Memory Manager
        // =====================================

        this.nextFreePage =
            0x100000;

        // =====================================
        // CR3
        // =====================================

        this.cr3 = 0;

        // =====================================
        // TLB
        // =====================================

        this.tlb = new Map();

        // =====================================
        // Virtual Maps
        // =====================================

        this.maps = [];

        console.log(
            "x86-64 Paging Ready"
        );
    }

    // =====================================
    // Allocate Physical Page
    // =====================================

    allocPage() {

        const addr =
            this.nextFreePage;

        this.nextFreePage +=
            this.PAGE_SIZE;

        return addr;
    }

    // =====================================
    // Create Page Table
    // =====================================

    createTable() {

        const phys =
            this.allocPage();

        const table =
            new BigUint64Array(
                this.PAGE_ENTRIES
            );

        return {

            phys,
            table
        };
    }

    // =====================================
    // Create PML4
    // =====================================

    createAddressSpace() {

        const pml4 =
            this.createTable();

        this.cr3 = pml4.phys;

        console.log(

            `[PAGING] CR3=0x${this.cr3.toString(16)}`
        );

        return pml4;
    }

    // =====================================
    // Indexes
    // =====================================

    indexes(virtual) {

        return {

            pml4:
                (
                    virtual >> 39
                ) & 0x1FF,

            pdpt:
                (
                    virtual >> 30
                ) & 0x1FF,

            pd:
                (
                    virtual >> 21
                ) & 0x1FF,

            pt:
                (
                    virtual >> 12
                ) & 0x1FF,

            offset:
                virtual & 0xFFF
        };
    }

    // =====================================
    // Map Virtual -> Physical
    // =====================================

    map(

        pml4,

        virtualAddr,

        physicalAddr,

        flags =
            this.PRESENT
            |
            this.WRITABLE
    ) {

        const idx =
            this.indexes(
                virtualAddr
            );

        // =====================================
        // PML4
        // =====================================

        if(

            !pml4.table[
                idx.pml4
            ]
        ) {

            const pdpt =
                this.createTable();

            pml4.table[
                idx.pml4
            ] =

                BigInt(
                    pdpt.phys
                )

                |

                BigInt(flags);

            pml4[
                `pdpt_${idx.pml4}`
            ] = pdpt;
        }

        const pdpt =
            pml4[
                `pdpt_${idx.pml4}`
            ];

        // =====================================
        // PDPT
        // =====================================

        if(

            !pdpt.table[
                idx.pdpt
            ]
        ) {

            const pd =
                this.createTable();

            pdpt.table[
                idx.pdpt
            ] =

                BigInt(
                    pd.phys
                )

                |

                BigInt(flags);

            pdpt[
                `pd_${idx.pdpt}`
            ] = pd;
        }

        const pd =
            pdpt[
                `pd_${idx.pdpt}`
            ];

        // =====================================
        // PD
        // =====================================

        if(

            !pd.table[
                idx.pd
            ]
        ) {

            const pt =
                this.createTable();

            pd.table[
                idx.pd
            ] =

                BigInt(
                    pt.phys
                )

                |

                BigInt(flags);

            pd[
                `pt_${idx.pd}`
            ] = pt;
        }

        const pt =
            pd[
                `pt_${idx.pd}`
            ];

        // =====================================
        // PT
        // =====================================

        pt.table[
            idx.pt
        ] =

            BigInt(
                physicalAddr
            )

            |

            BigInt(flags);

        // =====================================
        // Save
        // =====================================

        this.maps.push({

            virtual:
                virtualAddr,

            physical:
                physicalAddr,

            flags
        });

        // =====================================
        // Invalidate TLB
        // =====================================

        this.tlb.delete(
            virtualAddr
        );
    }

    // =====================================
    // Translate
    // =====================================

    translate(
        pml4,
        virtualAddr
    ) {

        // =====================================
        // TLB
        // =====================================

        if(
            this.tlb.has(
                virtualAddr
            )
        ) {

            return this.tlb.get(
                virtualAddr
            );
        }

        const idx =
            this.indexes(
                virtualAddr
            );

        // =====================================
        // Walk
        // =====================================

        const pdpt =
            pml4[
                `pdpt_${idx.pml4}`
            ];

        if(!pdpt) {

            throw new Error(
                "Page Fault"
            );
        }

        const pd =
            pdpt[
                `pd_${idx.pdpt}`
            ];

        if(!pd) {

            throw new Error(
                "Page Fault"
            );
        }

        const pt =
            pd[
                `pt_${idx.pd}`
            ];

        if(!pt) {

            throw new Error(
                "Page Fault"
            );
        }

        const entry =
            pt.table[
                idx.pt
            ];

        if(!entry) {

            throw new Error(
                "Page Fault"
            );
        }

        // =====================================
        // Physical
        // =====================================

        const physical =

            Number(
                entry
                &
                0x000FFFFFFFFFF000n
            )

            +

            idx.offset;

        // =====================================
        // TLB cache
        // =====================================

        this.tlb.set(

            virtualAddr,

            physical
        );

        return physical;
    }

    // =====================================
    // Identity Map
    // =====================================

    identityMap(

        pml4,

        start,

        size,

        flags =
            this.PRESENT
            |
            this.WRITABLE
    ) {

        for(

            let addr = start;

            addr < start + size;

            addr += this.PAGE_SIZE
        ) {

            this.map(

                pml4,

                addr,

                addr,

                flags
            );
        }
    }

    // =====================================
    // Allocate Virtual Memory
    // =====================================

    mmap(

        pml4,

        virtualAddr,

        size,

        flags =
            this.PRESENT
            |
            this.WRITABLE
            |
            this.USER
    ) {

        for(

            let i = 0;

            i < size;

            i += this.PAGE_SIZE
        ) {

            const phys =
                this.allocPage();

            this.map(

                pml4,

                virtualAddr + i,

                phys,

                flags
            );
        }
    }

    // =====================================
    // Unmap
    // =====================================

    unmap(

        pml4,

        virtualAddr
    ) {

        this.tlb.delete(
            virtualAddr
        );

        console.log(

            `[PAGING] Unmap 0x${virtualAddr.toString(16)}`
        );
    }

    // =====================================
    // Page Fault
    // =====================================

    pageFault(addr) {

        console.error(

            `[PAGE FAULT]
0x${addr.toString(16)}`
        );

        throw new Error(
            "Segmentation Fault"
        );
    }

    // =====================================
    // Read
    // =====================================

    read8(

        pml4,

        virtualAddr
    ) {

        try {

            const phys =
                this.translate(

                    pml4,

                    virtualAddr
                );

            return this.ram.read8(
                phys
            );

        } catch(e) {

            this.pageFault(
                virtualAddr
            );
        }
    }

    // =====================================
    // Write
    // =====================================

    write8(

        pml4,

        virtualAddr,

        value
    ) {

        try {

            const phys =
                this.translate(

                    pml4,

                    virtualAddr
                );

            this.ram.write8(

                phys,

                value
            );

        } catch(e) {

            this.pageFault(
                virtualAddr
            );
        }
    }

    // =====================================
    // Dump Maps
    // =====================================

    dump() {

        return this.maps;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            cr3:
                `0x${this.cr3.toString(16)}`,

            pages:
                this.maps.length,

            tlb:
                this.tlb.size
        };
    }
}