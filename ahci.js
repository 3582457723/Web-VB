// ahci.js
// SATA AHCI Controller Emulator
// Linux libata compatible

class AHCI {

    constructor(

        pci,
        memory,
        irq,
        storage
    ) {

        this.pci = pci;

        this.memory = memory;

        this.irq = irq;

        this.storage = storage;

        // =====================================
        // PCI
        // =====================================

        this.vendorID =
            0x8086;

        this.deviceID =
            0x2922;

        // =====================================
        // AHCI MMIO
        // =====================================

        this.ABAR =
            0xFEBF0000;

        // =====================================
        // Global Registers
        // =====================================

        this.cap =
            0x40200000;

        this.ghc =
            0;

        this.is =
            0;

        this.pi =
            0x1;

        this.version =
            0x10300;

        // =====================================
        // Ports
        // =====================================

        this.ports = [];

        // =====================================
        // Constants
        // =====================================

        this.SECTOR_SIZE =
            512;

        this.MAX_PORTS =
            32;

        // =====================================
        // Init
        // =====================================

        this.initPorts();

        console.log(
            "AHCI Ready"
        );
    }

    // =====================================
    // Init Ports
    // =====================================

    initPorts() {

        for(
            let i = 0;
            i < this.MAX_PORTS;
            i++
        ) {

            this.ports.push({

                implemented:
                    i === 0,

                commandListBase:
                    0,

                fisBase:
                    0,

                interruptStatus:
                    0,

                interruptEnable:
                    0,

                command:
                    0,

                taskFileData:
                    0x50,

                signature:
                    0x00000101,

                sataStatus:
                    i === 0
                    ? 0x123
                    : 0,

                sataControl:
                    0,

                sataError:
                    0,

                sataActive:
                    0,

                commandIssue:
                    0,

                deviceSleep:
                    0
            });
        }
    }

    // =====================================
    // Initialize PCI
    // =====================================

    init() {

        if(this.pci) {

            this.pci.registerDevice({

                vendorID:
                    this.vendorID,

                deviceID:
                    this.deviceID,

                classCode:
                    0x01,

                subclass:
                    0x06,

                progIF:
                    0x01,

                name:
                    "AHCI SATA Controller"
            });
        }

        console.log(
            "[AHCI INIT]"
        );
    }

    // =====================================
    // MMIO Read
    // =====================================

    read(addr) {

        const offset =
            addr - this.ABAR;

        // =====================================
        // Global Registers
        // =====================================

        switch(offset) {

            case 0x00:

                return this.cap;

            case 0x04:

                return this.ghc;

            case 0x08:

                return this.is;

            case 0x0C:

                return this.pi;

            case 0x10:

                return this.version;
        }

        // =====================================
        // Port Registers
        // =====================================

        if(offset >= 0x100) {

            return this.readPort(
                offset
            );
        }

        console.warn(

            `[AHCI READ]
0x${addr.toString(16)}`
        );

        return 0;
    }

    // =====================================
    // MMIO Write
    // =====================================

    write(addr, value) {

        const offset =
            addr - this.ABAR;

        switch(offset) {

            // =====================================
            // GHC
            // =====================================

            case 0x04:

                this.ghc =
                    value;

                return;
        }

        // =====================================
        // Port Registers
        // =====================================

        if(offset >= 0x100) {

            this.writePort(
                offset,
                value
            );

            return;
        }

        console.warn(

            `[AHCI WRITE]
0x${addr.toString(16)}
=0x${value.toString(16)}`
        );
    }

    // =====================================
    // Read Port
    // =====================================

    readPort(offset) {

        const portNum =
            Math.floor(
                (offset - 0x100)
                / 0x80
            );

        const reg =
            (offset - 0x100)
            % 0x80;

        const port =
            this.ports[portNum];

        if(!port) {

            return 0;
        }

        switch(reg) {

            case 0x00:

                return port.commandListBase;

            case 0x08:

                return port.fisBase;

            case 0x10:

                return port.interruptStatus;

            case 0x14:

                return port.interruptEnable;

            case 0x18:

                return port.command;

            case 0x20:

                return port.taskFileData;

            case 0x24:

                return port.signature;

            case 0x28:

                return port.sataStatus;

            case 0x2C:

                return port.sataControl;

            case 0x30:

                return port.sataError;

            case 0x34:

                return port.sataActive;

            case 0x38:

                return port.commandIssue;
        }

        return 0;
    }

    // =====================================
    // Write Port
    // =====================================

    writePort(

        offset,
        value
    ) {

        const portNum =
            Math.floor(
                (offset - 0x100)
                / 0x80
            );

        const reg =
            (offset - 0x100)
            % 0x80;

        const port =
            this.ports[portNum];

        if(!port) {

            return;
        }

        switch(reg) {

            // =====================================
            // CLB
            // =====================================

            case 0x00:

                port.commandListBase =
                    value;

                break;

            // =====================================
            // FB
            // =====================================

            case 0x08:

                port.fisBase =
                    value;

                break;

            // =====================================
            // CMD
            // =====================================

            case 0x18:

                port.command =
                    value;

                break;

            // =====================================
            // CI
            // =====================================

            case 0x38:

                port.commandIssue =
                    value;

                this.processCommands(
                    portNum
                );

                break;
        }

        console.log(

            `[AHCI PORT WRITE]
port=${portNum}
reg=0x${reg.toString(16)}`
        );
    }

    // =====================================
    // Process Commands
    // =====================================

    processCommands(portNum) {

        const port =
            this.ports[portNum];

        if(!port) {

            return;
        }

        console.log(

            `[AHCI CMD]
port=${portNum}`
        );

        // =====================================
        // Fake READ DMA
        // =====================================

        this.readDMA(

            portNum,

            0,

            1
        );

        // IRQ
        this.raiseIRQ();
    }

    // =====================================
    // Read Sector
    // =====================================

    readSector(lba) {

        if(!this.storage) {

            return new Uint8Array(
                this.SECTOR_SIZE
            );
        }

        return this.storage.read(

            lba
            *
            this.SECTOR_SIZE,

            this.SECTOR_SIZE
        );
    }

    // =====================================
    // Write Sector
    // =====================================

    writeSector(

        lba,
        data
    ) {

        if(!this.storage) {

            return false;
        }

        this.storage.write(

            lba
            *
            this.SECTOR_SIZE,

            data
        );

        return true;
    }

    // =====================================
    // DMA Read
    // =====================================

    readDMA(

        portNum,
        lba,
        count
    ) {

        console.log(

            `[AHCI READ DMA]
lba=${lba}
count=${count}`
        );

        const result =
            new Uint8Array(

                count
                *
                this.SECTOR_SIZE
            );

        for(
            let i = 0;
            i < count;
            i++
        ) {

            const sector =
                this.readSector(
                    lba + i
                );

            result.set(

                sector,

                i
                *
                this.SECTOR_SIZE
            );
        }

        return result;
    }

    // =====================================
    // DMA Write
    // =====================================

    writeDMA(

        portNum,
        lba,
        data
    ) {

        console.log(

            `[AHCI WRITE DMA]
lba=${lba}`
        );

        const sectors =

            data.length
            /
            this.SECTOR_SIZE;

        for(
            let i = 0;
            i < sectors;
            i++
        ) {

            const sector =
                data.slice(

                    i
                    *
                    this.SECTOR_SIZE,

                    (
                        i + 1
                    )
                    *
                    this.SECTOR_SIZE
                );

            this.writeSector(
                lba + i,
                sector
            );
        }
    }

    // =====================================
    // Identify Device
    // =====================================

    identifyDevice() {

        const identify =
            new Uint8Array(512);

        const view =
            new DataView(
                identify.buffer
            );

        // =====================================
        // ATA Signature
        // =====================================

        view.setUint16(
            0,
            0x0040,
            true
        );

        // =====================================
        // Sectors
        // =====================================

        view.setUint32(
            120,

            1024
            *
            1024,

            true
        );

        console.log(
            "[AHCI IDENTIFY]"
        );

        return identify;
    }

    // =====================================
    // IRQ
    // =====================================

    raiseIRQ() {

        this.is |= 1;

        if(this.irq) {

            this.irq.raiseIRQ(
                19
            );
        }

        console.log(
            "[AHCI IRQ]"
        );
    }

    // =====================================
    // Linux Probe
    // =====================================

    probeLinux() {

        console.log(
            "[LINUX AHCI PROBE]"
        );

        return {

            ports:
                this.ports.length,

            implemented:
                this.pi,

            version:
                this.version
        };
    }

    // =====================================
    // SATA Status
    // =====================================

    isConnected(portNum) {

        const port =
            this.ports[portNum];

        if(!port) {

            return false;
        }

        return (
            port.sataStatus
            !== 0
        );
    }

    // =====================================
    // Reset Controller
    // =====================================

    reset() {

        this.ghc = 0;

        this.is = 0;

        console.log(
            "[AHCI RESET]"
        );
    }

    // =====================================
    // Dump
    // =====================================

    dump() {

        return {

            abar:
                this.ABAR,

            cap:
                this.cap,

            ghc:
                this.ghc,

            ports:
                this.ports
        };
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            vendorID:
                this.vendorID,

            deviceID:
                this.deviceID,

            version:
                this.version,

            ports:
                this.MAX_PORTS
        };
    }
}