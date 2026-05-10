// pci.js
// Virtual PCI Bus
// PCI Device Enumeration + Config Space

class PCIDevice {

    constructor(config = {}) {

        // =====================================
        // PCI Address
        // =====================================

        this.bus =
            config.bus || 0;

        this.device =
            config.device || 0;

        this.function =
            config.function || 0;

        // =====================================
        // Vendor / Device
        // =====================================

        this.vendorID =
            config.vendorID || 0x1234;

        this.deviceID =
            config.deviceID || 0x1111;

        // =====================================
        // Class Codes
        // =====================================

        this.classCode =
            config.classCode || 0x00;

        this.subclass =
            config.subclass || 0x00;

        this.progIF =
            config.progIF || 0x00;

        this.revisionID =
            config.revisionID || 0x01;

        // =====================================
        // Header
        // =====================================

        this.headerType =
            config.headerType || 0x00;

        // =====================================
        // BARs
        // =====================================

        this.bars =
            new Array(6).fill(0);

        // =====================================
        // IRQ
        // =====================================

        this.interruptLine =
            config.interruptLine || 0;

        // =====================================
        // Name
        // =====================================

        this.name =
            config.name ||
            "Unknown PCI Device";

        // =====================================
        // Config Space
        // =====================================

        this.configSpace =
            new Uint8Array(256);

        this.initializeConfig();

        console.log(
            "PCI Device:",
            this.name
        );
    }

    // =====================================
    // Initialize Config Space
    // =====================================

    initializeConfig() {

        // Vendor ID
        this.write16(
            0x00,
            this.vendorID
        );

        // Device ID
        this.write16(
            0x02,
            this.deviceID
        );

        // Revision ID
        this.write8(
            0x08,
            this.revisionID
        );

        // Prog IF
        this.write8(
            0x09,
            this.progIF
        );

        // Subclass
        this.write8(
            0x0A,
            this.subclass
        );

        // Class Code
        this.write8(
            0x0B,
            this.classCode
        );

        // Header Type
        this.write8(
            0x0E,
            this.headerType
        );

        // Interrupt Line
        this.write8(
            0x3C,
            this.interruptLine
        );
    }

    // =====================================
    // Read Config
    // =====================================

    read8(offset) {

        return this.configSpace[offset];
    }

    read16(offset) {

        return (
            this.configSpace[offset]
            |
            (
                this.configSpace[offset + 1]
                << 8
            )
        );
    }

    read32(offset) {

        return (
            this.configSpace[offset]
            |
            (
                this.configSpace[offset + 1]
                << 8
            )
            |
            (
                this.configSpace[offset + 2]
                << 16
            )
            |
            (
                this.configSpace[offset + 3]
                << 24
            )
        );
    }

    // =====================================
    // Write Config
    // =====================================

    write8(offset, value) {

        this.configSpace[offset] =
            value & 0xFF;
    }

    write16(offset, value) {

        this.write8(
            offset,
            value & 0xFF
        );

        this.write8(
            offset + 1,
            (value >> 8) & 0xFF
        );
    }

    write32(offset, value) {

        this.write8(
            offset,
            value & 0xFF
        );

        this.write8(
            offset + 1,
            (value >> 8) & 0xFF
        );

        this.write8(
            offset + 2,
            (value >> 16) & 0xFF
        );

        this.write8(
            offset + 3,
            (value >> 24) & 0xFF
        );
    }

    // =====================================
    // Set BAR
    // =====================================

    setBAR(index, value) {

        if(index < 0 || index >= 6) {

            throw new Error(
                "Invalid BAR"
            );
        }

        this.bars[index] = value;

        this.write32(
            0x10 + index * 4,
            value
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            name:
                this.name,

            bus:
                this.bus,

            device:
                this.device,

            function:
                this.function,

            vendorID:
                "0x" +
                this.vendorID.toString(16),

            deviceID:
                "0x" +
                this.deviceID.toString(16),

            classCode:
                "0x" +
                this.classCode.toString(16),

            subclass:
                "0x" +
                this.subclass.toString(16),

            irq:
                this.interruptLine
        };
    }
}

// =====================================
// PCI BUS
// =====================================

class PCIBus {

    constructor() {

        // =====================================
        // Devices
        // =====================================

        this.devices = [];

        console.log(
            "PCI Bus Ready"
        );
    }

    // =====================================
    // Add Device
    // =====================================

    addDevice(device) {

        this.devices.push(device);

        console.log(
            "PCI Device Added:",
            device.name
        );
    }

    // =====================================
    // Find Device
    // =====================================

    findDevice(
        bus,
        device,
        func = 0
    ) {

        return this.devices.find(d =>

            d.bus === bus &&
            d.device === device &&
            d.function === func
        );
    }

    // =====================================
    // Config Read 32
    // =====================================

    configRead32(
        bus,
        device,
        func,
        offset
    ) {

        const dev =
            this.findDevice(
                bus,
                device,
                func
            );

        if(!dev) {

            return 0xFFFFFFFF;
        }

        return dev.read32(offset);
    }

    // =====================================
    // Config Write 32
    // =====================================

    configWrite32(
        bus,
        device,
        func,
        offset,
        value
    ) {

        const dev =
            this.findDevice(
                bus,
                device,
                func
            );

        if(!dev) {

            return;
        }

        dev.write32(
            offset,
            value
        );
    }

    // =====================================
    // Enumerate Devices
    // =====================================

    enumerate() {

        console.log(
            "=== PCI DEVICES ==="
        );

        for(
            const dev
            of this.devices
        ) {

            console.log(

                `[${dev.bus}:${dev.device}.${dev.function}]`,
                dev.name,
                `VID:${dev.vendorID.toString(16)}`,
                `DID:${dev.deviceID.toString(16)}`
            );
        }
    }

    // =====================================
    // Find By Class
    // =====================================

    findByClass(classCode) {

        return this.devices.filter(
            d =>
                d.classCode === classCode
        );
    }

    // =====================================
    // Remove Device
    // =====================================

    removeDevice(device) {

        this.devices =
            this.devices.filter(
                d => d !== device
            );

        console.log(
            "PCI Device Removed"
        );
    }

    // =====================================
    // Auto Address
    // =====================================

    autoAssign() {

        let deviceID = 0;

        for(
            const dev
            of this.devices
        ) {

            dev.bus = 0;

            dev.device =
                deviceID++;

            dev.function = 0;
        }

        console.log(
            "PCI Addresses Assigned"
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            devices:
                this.devices.length
        };
    }
}