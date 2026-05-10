// devfs.js
// Linux-like /dev Device Filesystem

class DeviceFile {

    constructor(options = {}) {

        // =====================================
        // Basic
        // =====================================

        this.name =
            options.name || "device";

        this.path =
            options.path || "/dev/device";

        this.type =
            options.type || "char";

        // char
        // block

        // =====================================
        // Device ID
        // =====================================

        this.major =
            options.major || 0;

        this.minor =
            options.minor || 0;

        // =====================================
        // Permissions
        // =====================================

        this.mode =
            options.mode || 0o666;

        // =====================================
        // Driver
        // =====================================

        this.driver =
            options.driver || null;

        // =====================================
        // Buffers
        // =====================================

        this.buffer = [];

        // =====================================
        // State
        // =====================================

        this.opened = false;

        console.log(
            "Device Registered:",
            this.path
        );
    }

    // =====================================
    // Open
    // =====================================

    open() {

        this.opened = true;

        if(
            this.driver &&
            this.driver.open
        ) {

            this.driver.open();
        }

        return true;
    }

    // =====================================
    // Close
    // =====================================

    close() {

        this.opened = false;

        if(
            this.driver &&
            this.driver.close
        ) {

            this.driver.close();
        }

        return true;
    }

    // =====================================
    // Read
    // =====================================

    read(size = 1) {

        if(
            this.driver &&
            this.driver.read
        ) {

            return this.driver
            .read(size);
        }

        return this.buffer
        .splice(0, size);
    }

    // =====================================
    // Write
    // =====================================

    write(data) {

        if(
            this.driver &&
            this.driver.write
        ) {

            return this.driver
            .write(data);
        }

        this.buffer.push(...data);

        return data.length;
    }

    // =====================================
    // ioctl
    // =====================================

    ioctl(cmd, arg) {

        if(
            this.driver &&
            this.driver.ioctl
        ) {

            return this.driver
            .ioctl(
                cmd,
                arg
            );
        }

        return null;
    }

    // =====================================
    // Poll
    // =====================================

    poll() {

        if(
            this.driver &&
            this.driver.poll
        ) {

            return this.driver
            .poll();
        }

        return this.buffer.length;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            path:
                this.path,

            type:
                this.type,

            major:
                this.major,

            minor:
                this.minor,

            opened:
                this.opened
        };
    }
}

// =====================================
// DEVFS
// =====================================

class DevFS {

    constructor(options = {}) {

        // =====================================
        // VFS
        // =====================================

        this.vfs =
            options.vfs;

        // =====================================
        // Devices
        // =====================================

        this.devices =
            new Map();

        // =====================================
        // FD
        // =====================================

        this.openDevices =
            new Map();

        this.nextFD = 100;

        // =====================================
        // Device Drivers
        // =====================================

        this.drivers = {};

        // =====================================
        // Init
        // =====================================

        this.init();

        console.log(
            "DEVFS Ready"
        );
    }

    // =====================================
    // Init
    // =====================================

    init() {

        // Create /dev
        this.vfs.mkdir("/dev");

        // =====================================
        // Standard Devices
        // =====================================

        this.registerDevice({

            name: "null",

            path: "/dev/null",

            major: 1,
            minor: 3,

            driver: {

                read: () => [],

                write: data =>
                    data.length
            }
        });

        this.registerDevice({

            name: "zero",

            path: "/dev/zero",

            major: 1,
            minor: 5,

            driver: {

                read: size =>

                    new Uint8Array(
                        size
                    ),

                write: data =>
                    data.length
            }
        });

        this.registerDevice({

            name: "random",

            path: "/dev/random",

            major: 1,
            minor: 8,

            driver: {

                read: size => {

                    const arr =
                        new Uint8Array(
                            size
                        );

                    crypto
                    .getRandomValues(
                        arr
                    );

                    return arr;
                }
            }
        });

        this.registerDevice({

            name: "tty",

            path: "/dev/tty",

            major: 5,
            minor: 0
        });

        this.registerDevice({

            name: "fb0",

            path: "/dev/fb0",

            major: 29,
            minor: 0
        });

        this.registerDevice({

            name: "sda",

            path: "/dev/sda",

            type: "block",

            major: 8,
            minor: 0
        });

        this.registerDevice({

            name: "keyboard",

            path: "/dev/input0",

            major: 13,
            minor: 0
        });

        this.registerDevice({

            name: "mouse",

            path: "/dev/mouse0",

            major: 13,
            minor: 1
        });

        this.registerDevice({

            name: "net0",

            path: "/dev/net0",

            major: 9,
            minor: 0
        });
    }

    // =====================================
    // Register Device
    // =====================================

    registerDevice(options = {}) {

        const device =
            new DeviceFile(
                options
            );

        this.devices.set(

            device.path,

            device
        );

        // Add to VFS
        this.vfs.createFile(
            device.path,
            ""
        );

        return device;
    }

    // =====================================
    // Unregister Device
    // =====================================

    unregisterDevice(path) {

        this.devices.delete(path);

        this.vfs.deleteFile(path);
    }

    // =====================================
    // Open Device
    // =====================================

    open(path) {

        const dev =
            this.devices.get(path);

        if(!dev) {

            return -1;
        }

        dev.open();

        const fd =
            this.nextFD++;

        this.openDevices.set(

            fd,

            dev
        );

        return fd;
    }

    // =====================================
    // Close
    // =====================================

    close(fd) {

        const dev =
            this.openDevices.get(fd);

        if(!dev) {

            return false;
        }

        dev.close();

        this.openDevices.delete(fd);

        return true;
    }

    // =====================================
    // Read
    // =====================================

    read(fd, size = 1) {

        const dev =
            this.openDevices.get(fd);

        if(!dev) {

            return null;
        }

        return dev.read(size);
    }

    // =====================================
    // Write
    // =====================================

    write(fd, data) {

        const dev =
            this.openDevices.get(fd);

        if(!dev) {

            return false;
        }

        return dev.write(data);
    }

    // =====================================
    // ioctl
    // =====================================

    ioctl(fd, cmd, arg) {

        const dev =
            this.openDevices.get(fd);

        if(!dev) {

            return null;
        }

        return dev.ioctl(
            cmd,
            arg
        );
    }

    // =====================================
    // Register Driver
    // =====================================

    registerDriver(
        name,
        driver
    ) {

        this.drivers[name] =
            driver;
    }

    // =====================================
    // Attach Driver
    // =====================================

    attachDriver(
        path,
        driverName
    ) {

        const dev =
            this.devices.get(path);

        const driver =
            this.drivers
            [driverName];

        if(
            !dev ||
            !driver
        ) {

            return false;
        }

        dev.driver =
            driver;

        return true;
    }

    // =====================================
    // List Devices
    // =====================================

    ls() {

        return Array.from(

            this.devices.keys()
        );
    }

    // =====================================
    // Tree
    // =====================================

    tree() {

        console.log(
            "=== DEVFS ==="
        );

        for(
            const dev
            of this.devices
            .values()
        ) {

            console.log(

                `${dev.path}`,

                `[${dev.major}:${dev.minor}]`
            );
        }
    }

    // =====================================
    // Dynamic Device Creation
    // =====================================

    mknod(
        path,
        major,
        minor,
        type = "char"
    ) {

        return this
        .registerDevice({

            name:
                path.split("/")
                .pop(),

            path,

            major,
            minor,
            type
        });
    }

    // =====================================
    // Poll Devices
    // =====================================

    poll() {

        const events = [];

        for(
            const dev
            of this.devices
            .values()
        ) {

            const ready =
                dev.poll();

            if(ready > 0) {

                events.push({

                    device:
                        dev.path,

                    ready
                });
            }
        }

        return events;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            devices:
                this.devices.size,

            open:
                this.openDevices.size,

            drivers:
                Object.keys(
                    this.drivers
                ).length
        };
    }
}