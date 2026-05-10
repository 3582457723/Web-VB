// usb.js
// Virtual USB Subsystem

class USBDevice {

    constructor(options = {}) {

        // =====================================
        // Basic
        // =====================================

        this.name =
            options.name || "USB Device";

        this.vendorId =
            options.vendorId || 0x0000;

        this.productId =
            options.productId || 0x0000;

        this.classCode =
            options.classCode || 0x00;

        // =====================================
        // USB Info
        // =====================================

        this.version =
            options.version || "2.0";

        this.speed =
            options.speed || "high";

        // low/full/high/super

        // =====================================
        // State
        // =====================================

        this.connected = false;

        this.address = 0;

        this.configuration = 1;

        // =====================================
        // Endpoints
        // =====================================

        this.endpoints = [];

        // =====================================
        // Driver
        // =====================================

        this.driver =
            options.driver || null;

        console.log(
            "USB Device:",
            this.name
        );
    }

    // =====================================
    // Connect
    // =====================================

    connect() {

        this.connected = true;

        console.log(
            "[USB] Connected:",
            this.name
        );

        if(
            this.driver &&
            this.driver.connect
        ) {

            this.driver.connect();
        }
    }

    // =====================================
    // Disconnect
    // =====================================

    disconnect() {

        this.connected = false;

        console.log(
            "[USB] Disconnected:",
            this.name
        );

        if(
            this.driver &&
            this.driver.disconnect
        ) {

            this.driver.disconnect();
        }
    }

    // =====================================
    // Control Transfer
    // =====================================

    controlTransfer(setup) {

        if(
            this.driver &&
            this.driver.controlTransfer
        ) {

            return this.driver
            .controlTransfer(
                setup
            );
        }

        return null;
    }

    // =====================================
    // Bulk Transfer
    // =====================================

    bulkTransfer(data) {

        if(
            this.driver &&
            this.driver.bulkTransfer
        ) {

            return this.driver
            .bulkTransfer(
                data
            );
        }

        return data.length;
    }

    // =====================================
    // Interrupt Transfer
    // =====================================

    interruptTransfer(data) {

        if(
            this.driver &&
            this.driver.interruptTransfer
        ) {

            return this.driver
            .interruptTransfer(
                data
            );
        }

        return data.length;
    }

    // =====================================
    // Descriptor
    // =====================================

    descriptor() {

        return {

            vendorId:
                this.vendorId,

            productId:
                this.productId,

            classCode:
                this.classCode,

            version:
                this.version,

            speed:
                this.speed
        };
    }
}

// =====================================
// USB Controller
// =====================================

class USBController {

    constructor(options = {}) {

        // =====================================
        // DEVFS
        // =====================================

        this.devfs =
            options.devfs;

        // =====================================
        // Devices
        // =====================================

        this.devices = [];

        // =====================================
        // Ports
        // =====================================

        this.ports = 16;

        // =====================================
        // Address Counter
        // =====================================

        this.nextAddress = 1;

        // =====================================
        // Drivers
        // =====================================

        this.drivers = {};

        // =====================================
        // WebUSB
        // =====================================

        this.webUSBEnabled = false;

        console.log(
            "USB Controller Ready"
        );
    }

    // =====================================
    // Attach Device
    // =====================================

    attach(device) {

        device.address =
            this.nextAddress++;

        device.connect();

        this.devices.push(
            device
        );

        // Create Device Node
        if(this.devfs) {

            this.devfs.mknod(

                `/dev/usb${device.address}`,

                189,

                device.address
            );
        }

        console.log(

            "[USB] Attached:",

            device.name
        );

        return device.address;
    }

    // =====================================
    // Detach Device
    // =====================================

    detach(address) {

        const index =
            this.devices.findIndex(

                d =>
                d.address
                === address
            );

        if(index === -1) {

            return false;
        }

        const dev =
            this.devices[index];

        dev.disconnect();

        this.devices.splice(
            index,
            1
        );

        console.log(

            "[USB] Detached:",

            dev.name
        );

        return true;
    }

    // =====================================
    // Find Device
    // =====================================

    getDevice(address) {

        return this.devices.find(

            d =>
            d.address
            === address
        );
    }

    // =====================================
    // Enumerate
    // =====================================

    enumerate() {

        console.log(
            "=== USB Devices ==="
        );

        for(
            const dev
            of this.devices
        ) {

            console.log(

`${dev.address}: ${dev.name}
VID=${dev.vendorId.toString(16)}
PID=${dev.productId.toString(16)}`
            );
        }
    }

    // =====================================
    // Register Driver
    // =====================================

    registerDriver(
        classCode,
        driver
    ) {

        this.drivers[
            classCode
        ] = driver;
    }

    // =====================================
    // Auto Driver Attach
    // =====================================

    autoAttachDrivers() {

        for(
            const dev
            of this.devices
        ) {

            const driver =
                this.drivers[
                    dev.classCode
                ];

            if(driver) {

                dev.driver =
                    new driver();

                console.log(

                    "[USB] Driver attached:",

                    dev.name
                );
            }
        }
    }

    // =====================================
    // Enable WebUSB
    // =====================================

    async enableWebUSB() {

        if(
            !navigator.usb
        ) {

            console.error(
                "WebUSB unsupported"
            );

            return;
        }

        this.webUSBEnabled = true;

        console.log(
            "WebUSB Enabled"
        );
    }

    // =====================================
    // Connect Real USB
    // =====================================

    async connectRealUSB() {

        if(
            !this.webUSBEnabled
        ) {

            return;
        }

        try {

            const device =
                await navigator.usb
                .requestDevice({

                    filters: []
                });

            await device.open();

            console.log(

                "Real USB Connected:",

                device.productName
            );

            const usbDev =
                new USBDevice({

                    name:
                        device.productName,

                    vendorId:
                        device.vendorId,

                    productId:
                        device.productId,

                    version:
                        "real",

                    speed:
                        "real"
                });

            this.attach(
                usbDev
            );

        } catch(e) {

            console.error(e);
        }
    }

    // =====================================
    // lsusb
    // =====================================

    lsusb() {

        return this.devices.map(

            d => ({

                address:
                    d.address,

                name:
                    d.name,

                vendorId:
                    d.vendorId,

                productId:
                    d.productId
            })
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            devices:
                this.devices.length,

            ports:
                this.ports,

            webUSB:
                this.webUSBEnabled
        };
    }
}

// =====================================
// USB Keyboard Driver
// =====================================

class USBKeyboardDriver {

    constructor() {

        this.keys = [];

        console.log(
            "USB Keyboard Driver"
        );
    }

    connect() {

        console.log(
            "Keyboard Ready"
        );
    }

    interruptTransfer(data) {

        this.keys.push(data);

        return data.length;
    }

    readKey() {

        return this.keys.shift();
    }
}

// =====================================
// USB Mouse Driver
// =====================================

class USBMouseDriver {

    constructor() {

        this.x = 0;
        this.y = 0;

        console.log(
            "USB Mouse Driver"
        );
    }

    interruptTransfer(data) {

        this.x += data.dx || 0;

        this.y += data.dy || 0;
    }

    position() {

        return {

            x: this.x,
            y: this.y
        };
    }
}

// =====================================
// USB Storage Driver
// =====================================

class USBStorageDriver {

    constructor() {

        this.storage = {};

        console.log(
            "USB Storage Driver"
        );
    }

    bulkTransfer(data) {

        console.log(
            "USB Storage Write"
        );

        return data.length;
    }

    readBlock(block) {

        return this.storage[
            block
        ] || null;
    }

    writeBlock(
        block,
        data
    ) {

        this.storage[
            block
        ] = data;
    }
}