// virtio.js
// VirtIO subsystem emulator
// Linux paravirtualized devices

class VirtIO {

    constructor(

        pci,
        memory,
        irq
    ) {

        this.pci = pci;

        this.memory = memory;

        this.irq = irq;

        // =====================================
        // Devices
        // =====================================

        this.devices = [];

        // =====================================
        // PCI IDs
        // =====================================

        this.VENDOR_ID =
            0x1AF4;

        // =====================================
        // Virtqueues
        // =====================================

        this.queues = new Map();

        // =====================================
        // Features
        // =====================================

        this.features = {

            VERSION_1: 1 << 0,
            RING_INDIRECT_DESC: 1 << 1,
            RING_EVENT_IDX: 1 << 2
        };

        console.log(
            "VirtIO Ready"
        );
    }

    // =====================================
    // Register Device
    // =====================================

    registerDevice(device) {

        const id =
            this.devices.length;

        const virtioDevice = {

            id,

            type:
                device.type,

            deviceID:
                device.deviceID,

            name:
                device.name,

            features:
                device.features || 0,

            queues: [],

            status: 0,

            config:
                device.config || {},

            irq:
                device.irq || 32 + id
        };

        this.devices.push(
            virtioDevice
        );

        // =====================================
        // PCI registration
        // =====================================

        if(this.pci) {

            this.pci.registerDevice({

                vendorID:
                    this.VENDOR_ID,

                deviceID:
                    device.deviceID,

                classCode:
                    0x02,

                subclass:
                    0x00,

                name:
                    device.name
            });
        }

        console.log(

            `[VIRTIO DEVICE]
${device.name}`
        );

        return virtioDevice;
    }

    // =====================================
    // Queue
    // =====================================

    createQueue(

        deviceID,
        size = 256
    ) {

        const queue = {

            deviceID,

            size,

            desc: [],

            avail: [],

            used: [],

            lastUsed: 0,

            ready: false
        };

        if(
            !this.queues.has(
                deviceID
            )
        ) {

            this.queues.set(
                deviceID,
                []
            );
        }

        this.queues
        .get(deviceID)
        .push(queue);

        console.log(

            `[VIRTQUEUE]
device=${deviceID}
size=${size}`
        );

        return queue;
    }

    // =====================================
    // Descriptor
    // =====================================

    addDescriptor(

        queue,
        addr,
        len,
        flags = 0,
        next = 0
    ) {

        queue.desc.push({

            addr,
            len,
            flags,
            next
        });
    }

    // =====================================
    // Submit Buffer
    // =====================================

    submit(

        deviceID,
        queueIndex,
        buffer
    ) {

        const queues =
            this.queues.get(
                deviceID
            );

        if(!queues) {

            return false;
        }

        const queue =
            queues[queueIndex];

        if(!queue) {

            return false;
        }

        queue.avail.push(
            buffer
        );

        console.log(

            `[VIRTIO SUBMIT]
device=${deviceID}
queue=${queueIndex}`
        );

        this.notify(
            deviceID,
            queueIndex
        );

        return true;
    }

    // =====================================
    // Notify Device
    // =====================================

    notify(

        deviceID,
        queueIndex
    ) {

        const device =
            this.devices.find(

                d => d.id === deviceID
            );

        if(!device) {

            return;
        }

        console.log(

            `[VIRTIO NOTIFY]
${device.name}`
        );

        switch(device.type) {

            // =====================================
            // Block
            // =====================================

            case "block":

                this.handleBlock(
                    device,
                    queueIndex
                );

                break;

            // =====================================
            // Network
            // =====================================

            case "net":

                this.handleNet(
                    device,
                    queueIndex
                );

                break;

            // =====================================
            // GPU
            // =====================================

            case "gpu":

                this.handleGPU(
                    device,
                    queueIndex
                );

                break;

            // =====================================
            // Console
            // =====================================

            case "console":

                this.handleConsole(
                    device,
                    queueIndex
                );

                break;
        }

        // IRQ
        this.raiseIRQ(
            device.irq
        );
    }

    // =====================================
    // IRQ
    // =====================================

    raiseIRQ(irqNum) {

        if(this.irq) {

            this.irq.raiseIRQ(
                irqNum
            );
        }

        console.log(

            `[VIRTIO IRQ]
${irqNum}`
        );
    }

    // =====================================
    // Block Device
    // =====================================

    createBlockDevice(storage) {

        return this.registerDevice({

            type: "block",

            deviceID: 0x1001,

            name: "VirtIO Block",

            storage
        });
    }

    handleBlock(
        device,
        queueIndex
    ) {

        console.log(
            "[VIRTIO BLOCK]"
        );
    }

    // =====================================
    // Network Device
    // =====================================

    createNetDevice(network) {

        return this.registerDevice({

            type: "net",

            deviceID: 0x1000,

            name: "VirtIO Network",

            network
        });
    }

    handleNet(
        device,
        queueIndex
    ) {

        console.log(
            "[VIRTIO NET]"
        );
    }

    // =====================================
    // GPU Device
    // =====================================

    createGPUDevice(drm) {

        return this.registerDevice({

            type: "gpu",

            deviceID: 0x1050,

            name: "VirtIO GPU",

            drm
        });
    }

    handleGPU(
        device,
        queueIndex
    ) {

        console.log(
            "[VIRTIO GPU]"
        );
    }

    // =====================================
    // Console Device
    // =====================================

    createConsoleDevice(
        terminal
    ) {

        return this.registerDevice({

            type: "console",

            deviceID: 0x1003,

            name: "VirtIO Console",

            terminal
        });
    }

    handleConsole(
        device,
        queueIndex
    ) {

        console.log(
            "[VIRTIO CONSOLE]"
        );
    }

    // =====================================
    // Memory Balloon
    // =====================================

    createBalloonDevice() {

        return this.registerDevice({

            type: "balloon",

            deviceID: 0x1002,

            name: "VirtIO Balloon"
        });
    }

    // =====================================
    // RNG
    // =====================================

    createRNGDevice() {

        return this.registerDevice({

            type: "rng",

            deviceID: 0x1005,

            name: "VirtIO RNG"
        });
    }

    // =====================================
    // Linux Driver Probe
    // =====================================

    probeLinux() {

        console.log(
            "[LINUX VIRTIO PROBE]"
        );

        return this.devices.map(

            device => ({

                name:
                    device.name,

                type:
                    device.type,

                deviceID:
                    device.deviceID
            })
        );
    }

    // =====================================
    // MMIO Read
    // =====================================

    mmioRead(addr) {

        console.log(

            `[VIRTIO MMIO READ]
0x${addr.toString(16)}`
        );

        return 0;
    }

    // =====================================
    // MMIO Write
    // =====================================

    mmioWrite(addr, value) {

        console.log(

            `[VIRTIO MMIO WRITE]
0x${addr.toString(16)}
=0x${value.toString(16)}`
        );
    }

    // =====================================
    // PCI Config
    // =====================================

    pciConfigRead(

        deviceID,
        offset
    ) {

        console.log(

            `[PCI CONFIG READ]
device=${deviceID}
offset=0x${offset.toString(16)}`
        );

        return 0;
    }

    pciConfigWrite(

        deviceID,
        offset,
        value
    ) {

        console.log(

            `[PCI CONFIG WRITE]
device=${deviceID}
offset=0x${offset.toString(16)}
value=0x${value.toString(16)}`
        );
    }

    // =====================================
    // Reset Device
    // =====================================

    reset(deviceID) {

        const device =
            this.devices.find(

                d => d.id === deviceID
            );

        if(!device) {

            return false;
        }

        device.status = 0;

        console.log(

            `[VIRTIO RESET]
${device.name}`
        );

        return true;
    }

    // =====================================
    // Device Status
    // =====================================

    setStatus(

        deviceID,
        status
    ) {

        const device =
            this.devices.find(

                d => d.id === deviceID
            );

        if(!device) {

            return false;
        }

        device.status =
            status;

        console.log(

            `[VIRTIO STATUS]
${device.name}
=0x${status.toString(16)}`
        );

        return true;
    }

    // =====================================
    // Dump
    // =====================================

    dump() {

        return {

            devices:
                this.devices,

            queues:
                this.queues.size
        };
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            vendorID:
                this.VENDOR_ID,

            devices:
                this.devices.length,

            queues:
                this.queues.size
        };
    }
}