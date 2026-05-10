// iso.js
// Virtual ISO Drive
// Read Only CD/DVD Device

class VirtualISO {

    constructor() {

        // =====================================
        // ISO Data
        // =====================================

        this.data = null;

        // =====================================
        // Sector Size
        // =====================================

        this.sectorSize = 2048;

        // =====================================
        // Mounted State
        // =====================================

        this.mounted = false;

        // =====================================
        // Info
        // =====================================

        this.filename = "";

        this.size = 0;

        console.log(
            "Virtual ISO Drive Ready"
        );
    }

    // =====================================
    // Mount ISO
    // =====================================

    async mount(file) {

        console.log(
            "Mounting ISO..."
        );

        const buffer =
            await file.arrayBuffer();

        this.data =
            new Uint8Array(buffer);

        this.size =
            this.data.length;

        this.filename =
            file.name;

        this.mounted = true;

        console.log(
            "ISO Mounted:",
            this.filename
        );

        console.log(
            "Size:",
            this.size,
            "bytes"
        );
    }

    // =====================================
    // Unmount
    // =====================================

    unmount() {

        this.data = null;

        this.mounted = false;

        this.filename = "";

        this.size = 0;

        console.log(
            "ISO Unmounted"
        );
    }

    // =====================================
    // Read Sector
    // =====================================

    readSector(lba) {

        if(!this.mounted) {

            throw new Error(
                "No ISO mounted"
            );
        }

        const offset =
            lba * this.sectorSize;

        if(
            offset + this.sectorSize >
            this.size
        ) {

            throw new Error(
                "ISO sector out of range"
            );
        }

        return this.data.slice(
            offset,
            offset + this.sectorSize
        );
    }

    // =====================================
    // Read Bytes
    // =====================================

    read(addr, size) {

        if(!this.mounted) {

            throw new Error(
                "No ISO mounted"
            );
        }

        if(
            addr + size >
            this.size
        ) {

            throw new Error(
                "ISO read out of range"
            );
        }

        return this.data.slice(
            addr,
            addr + size
        );
    }

    // =====================================
    // Write Blocked
    // =====================================

    writeSector() {

        throw new Error(
            "ISO is read-only"
        );
    }

    // =====================================
    // Boot Sector
    // =====================================

    readBootSector() {

        // El Torito Boot Catalog
        return this.readSector(17);
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            mounted:
                this.mounted,

            filename:
                this.filename,

            sizeMB:
                (
                    this.size /
                    1024 /
                    1024
                ).toFixed(2),

            sectorSize:
                this.sectorSize
        };
    }
}