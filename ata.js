// ata.js
// Virtual ATA / IDE Controller
// PIO Mode + HDD Access

class ATADevice {

    constructor(options = {}) {

        // =====================================
        // Device Type
        // =====================================

        this.type =
            options.type || "HDD";

        // =====================================
        // Disk Backend
        // =====================================

        this.disk =
            options.disk;

        // =====================================
        // Identify Data
        // =====================================

        this.model =
            options.model
            || "Virtual ATA Disk";

        this.serial =
            options.serial
            || "JSVM0001";

        // =====================================
        // Geometry
        // =====================================

        this.sectorSize = 512;

        this.totalSectors =
            options.totalSectors
            || 1024 * 1024;

        // =====================================
        // Status Register
        // =====================================

        this.status = {

            BSY: 0,
            DRDY: 1,
            DRQ: 0,
            ERR: 0
        };

        console.log(
            "ATA Device Ready:",
            this.model
        );
    }

    // =====================================
    // Read Sector
    // =====================================

    readSector(lba) {

        if(
            lba >= this.totalSectors
        ) {

            throw new Error(
                "ATA Read Out Of Range"
            );
        }

        return this.disk.readSector(
            lba
        );
    }

    // =====================================
    // Write Sector
    // =====================================

    writeSector(lba, data) {

        if(
            lba >= this.totalSectors
        ) {

            throw new Error(
                "ATA Write Out Of Range"
            );
        }

        this.disk.writeSector(
            lba,
            data
        );
    }

    // =====================================
    // IDENTIFY DEVICE
    // =====================================

    identify() {

        const data =
            new Uint8Array(512);

        const view =
            new DataView(
                data.buffer
            );

        // ATA Signature
        view.setUint16(
            0,
            0x0040,
            true
        );

        // Cylinders
        view.setUint16(
            2,
            16383,
            true
        );

        // Heads
        view.setUint16(
            6,
            16,
            true
        );

        // Sectors
        view.setUint16(
            12,
            63,
            true
        );

        // Serial
        this.writeATAString(
            data,
            20,
            this.serial,
            20
        );

        // Model
        this.writeATAString(
            data,
            54,
            this.model,
            40
        );

        // LBA28 sectors
        view.setUint32(
            120,
            this.totalSectors,
            true
        );

        return data;
    }

    // =====================================
    // ATA String Encoding
    // =====================================

    writeATAString(
        buffer,
        offset,
        str,
        maxLen
    ) {

        const padded =
            str.padEnd(
                maxLen,
                " "
            );

        for(
            let i = 0;
            i < maxLen;
            i += 2
        ) {

            buffer[offset + i] =
                padded.charCodeAt(i + 1)
                || 0x20;

            buffer[offset + i + 1] =
                padded.charCodeAt(i)
                || 0x20;
        }
    }

    // =====================================
    // Status Byte
    // =====================================

    statusByte() {

        return (

            (this.status.BSY << 7)
            |
            (this.status.DRDY << 6)
            |
            (this.status.DRQ << 3)
            |
            this.status.ERR
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            type:
                this.type,

            model:
                this.model,

            serial:
                this.serial,

            sectors:
                this.totalSectors,

            sizeMB:
                (
                    this.totalSectors
                    * 512
                    / 1024
                    / 1024
                ).toFixed(2)
        };
    }
}

// =====================================
// ATA Controller
// =====================================

class ATAController {

    constructor(interrupts = null) {

        // =====================================
        // IRQ
        // =====================================

        this.interrupts =
            interrupts;

        // =====================================
        // Drives
        // =====================================

        this.master = null;
        this.slave = null;

        // =====================================
        // Registers
        // =====================================

        this.features = 0;
        this.sectorCount = 0;
        this.lbaLow = 0;
        this.lbaMid = 0;
        this.lbaHigh = 0;
        this.driveHead = 0;
        this.command = 0;

        // =====================================
        // Data Buffer
        // =====================================

        this.buffer = null;

        console.log(
            "ATA Controller Ready"
        );
    }

    // =====================================
    // Connect Drive
    // =====================================

    connectDrive(
        drive,
        isSlave = false
    ) {

        if(isSlave) {

            this.slave = drive;

            console.log(
                "ATA Slave Connected"
            );

        } else {

            this.master = drive;

            console.log(
                "ATA Master Connected"
            );
        }
    }

    // =====================================
    // Get Selected Drive
    // =====================================

    currentDrive() {

        return (
            this.driveHead & 0x10
        )
            ? this.slave
            : this.master;
    }

    // =====================================
    // Get Current LBA
    // =====================================

    currentLBA() {

        return (

            this.lbaLow
            |
            (
                this.lbaMid << 8
            )
            |
            (
                this.lbaHigh << 16
            )
            |
            (
                (
                    this.driveHead
                    & 0x0F
                ) << 24
            )
        );
    }

    // =====================================
    // Send Command
    // =====================================

    sendCommand(cmd) {

        this.command = cmd;

        const drive =
            this.currentDrive();

        if(!drive) {

            console.warn(
                "No ATA Drive"
            );

            return;
        }

        switch(cmd) {

            // IDENTIFY
            case 0xEC:

                this.buffer =
                    drive.identify();

                drive.status.DRQ = 1;

                console.log(
                    "ATA IDENTIFY"
                );

                break;

            // READ SECTOR
            case 0x20:

                this.readPIO();

                break;

            // WRITE SECTOR
            case 0x30:

                console.log(
                    "ATA WRITE READY"
                );

                drive.status.DRQ = 1;

                break;

            default:

                console.warn(

                    "Unknown ATA Command:",
                    cmd.toString(16)
                );
        }

        // IRQ14
        if(this.interrupts) {

            this.interrupts
            .ata(cmd);
        }
    }

    // =====================================
    // PIO Read
    // =====================================

    readPIO() {

        const drive =
            this.currentDrive();

        const lba =
            this.currentLBA();

        this.buffer =
            drive.readSector(lba);

        drive.status.DRQ = 1;

        console.log(
            "ATA READ",
            "LBA",
            lba
        );
    }

    // =====================================
    // PIO Write
    // =====================================

    writePIO(data) {

        const drive =
            this.currentDrive();

        const lba =
            this.currentLBA();

        drive.writeSector(
            lba,
            data
        );

        drive.status.DRQ = 0;

        console.log(
            "ATA WRITE",
            "LBA",
            lba
        );

        // IRQ14
        if(this.interrupts) {

            this.interrupts
            .ata(0x30);
        }
    }

    // =====================================
    // Read Data Port
    // =====================================

    readData() {

        return this.buffer;
    }

    // =====================================
    // Read Status
    // =====================================

    readStatus() {

        const drive =
            this.currentDrive();

        if(!drive) {

            return 0;
        }

        return drive.statusByte();
    }

    // =====================================
    // Port Write
    // =====================================

    out(port, value) {

        switch(port) {

            case 0x1F2:

                this.sectorCount =
                    value;

                break;

            case 0x1F3:

                this.lbaLow =
                    value;

                break;

            case 0x1F4:

                this.lbaMid =
                    value;

                break;

            case 0x1F5:

                this.lbaHigh =
                    value;

                break;

            case 0x1F6:

                this.driveHead =
                    value;

                break;

            case 0x1F7:

                this.sendCommand(
                    value
                );

                break;
        }
    }

    // =====================================
    // Port Read
    // =====================================

    in(port) {

        switch(port) {

            case 0x1F7:

                return this.readStatus();

            default:

                return 0;
        }
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            master:
                this.master
                ? this.master.info()
                : null,

            slave:
                this.slave
                ? this.slave.info()
                : null
        };
    }
}