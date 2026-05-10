// disk.js
// Virtual Disk System
// Import / Export Supported

class VirtualDisk {

    constructor(sizeMB = 1024) {

        // =====================================
        // Disk Size
        // =====================================

        this.size =
            sizeMB *
            1024 *
            1024;

        // =====================================
        // Sector Size
        // =====================================

        this.sectorSize = 512;

        this.totalSectors =
            Math.floor(
                this.size /
                this.sectorSize
            );

        // =====================================
        // Disk Data
        // =====================================

        console.log(
            "Allocating Disk:",
            sizeMB + "MB"
        );

        this.data =
            new Uint8Array(this.size);

        console.log(
            "Disk Ready"
        );
    }

    // =====================================
    // Bounds Check
    // =====================================

    check(addr, size = 1) {

        if(addr < 0) {

            throw new Error(
                "Negative disk address"
            );
        }

        if(addr + size > this.size) {

            throw new Error(
                "Disk out of bounds"
            );
        }
    }

    // =====================================
    // Read Byte
    // =====================================

    read8(addr) {

        this.check(addr);

        return this.data[addr];
    }

    // =====================================
    // Write Byte
    // =====================================

    write8(addr, value) {

        this.check(addr);

        this.data[addr] =
            value & 0xFF;
    }

    // =====================================
    // Read Sector
    // =====================================

    readSector(lba) {

        const offset =
            lba * this.sectorSize;

        this.check(
            offset,
            this.sectorSize
        );

        return this.data.slice(
            offset,
            offset + this.sectorSize
        );
    }

    // =====================================
    // Write Sector
    // =====================================

    writeSector(lba, sectorData) {

        if(
            sectorData.length >
            this.sectorSize
        ) {

            throw new Error(
                "Sector too large"
            );
        }

        const offset =
            lba * this.sectorSize;

        this.check(
            offset,
            this.sectorSize
        );

        this.data.set(
            sectorData,
            offset
        );
    }

    // =====================================
    // Clear Disk
    // =====================================

    clear() {

        this.data.fill(0);

        console.log(
            "Disk Cleared"
        );
    }

    // =====================================
    // Export Disk
    // =====================================

    export(filename = "disk.img") {

        const blob =
            new Blob(
                [this.data],
                {
                    type:
                    "application/octet-stream"
                }
            );

        const url =
            URL.createObjectURL(blob);

        const a =
            document.createElement("a");

        a.href = url;

        a.download = filename;

        a.click();

        URL.revokeObjectURL(url);

        console.log(
            "Disk Exported"
        );
    }

    // =====================================
    // Import Disk
    // =====================================

    async import(file) {

        const buffer =
            await file.arrayBuffer();

        const array =
            new Uint8Array(buffer);

        if(array.length > this.size) {

            throw new Error(
                "Disk image too large"
            );
        }

        this.data.fill(0);

        this.data.set(array);

        console.log(
            "Disk Imported"
        );
    }

    // =====================================
    // Save to localStorage
    // =====================================

    saveLocal(name = "vm_disk") {

        const binary =
            Array.from(this.data);

        localStorage.setItem(
            name,
            JSON.stringify(binary)
        );

        console.log(
            "Disk Saved"
        );
    }

    // =====================================
    // Load from localStorage
    // =====================================

    loadLocal(name = "vm_disk") {

        const raw =
            localStorage.getItem(name);

        if(!raw) {

            throw new Error(
                "No saved disk"
            );
        }

        const arr =
            JSON.parse(raw);

        this.data =
            Uint8Array.from(arr);

        console.log(
            "Disk Loaded"
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            sizeMB:
                this.size /
                1024 /
                1024,

            sectorSize:
                this.sectorSize,

            totalSectors:
                this.totalSectors
        };
    }
}