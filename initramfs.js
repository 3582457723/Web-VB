// initramfs.js
// Linux-like Initial RAM Filesystem

class InitRamFS {

    constructor(options = {}) {

        // =====================================
        // VFS
        // =====================================

        this.vfs =
            options.vfs;

        // =====================================
        // DEVFS
        // =====================================

        this.devfs =
            options.devfs;

        // =====================================
        // Kernel
        // =====================================

        this.kernel =
            options.kernel || {};

        // =====================================
        // Mounted
        // =====================================

        this.mounted = false;

        // =====================================
        // Boot Scripts
        // =====================================

        this.initScripts = [];

        // =====================================
        // Environment
        // =====================================

        this.env = {

            PATH:
                "/bin:/sbin:/usr/bin",

            HOME:
                "/root",

            TERM:
                "xterm"
        };

        // =====================================
        // Root Filesystem
        // =====================================

        this.root = {

            "/": "dir",

            "/bin": "dir",
            "/sbin": "dir",
            "/etc": "dir",
            "/proc": "dir",
            "/sys": "dir",
            "/tmp": "dir",
            "/root": "dir",
            "/usr": "dir",
            "/usr/bin": "dir",

            "/init": "file"
        };

        console.log(
            "InitRamFS Ready"
        );
    }

    // =====================================
    // Mount
    // =====================================

    mount() {

        if(this.mounted) {

            return;
        }

        console.log(
            "[initramfs] mounting..."
        );

        // =====================================
        // Create Directories
        // =====================================

        for(
            const path
            in this.root
        ) {

            if(
                this.root[path]
                === "dir"
            ) {

                this.vfs.mkdir(
                    path
                );

            } else {

                this.vfs.createFile(
                    path,
                    ""
                );
            }
        }

        // =====================================
        // Default Files
        // =====================================

        this.createDefaults();

        // =====================================
        // Mount DEVFS
        // =====================================

        if(this.devfs) {

            console.log(
                "[initramfs] mounting devfs"
            );
        }

        // =====================================
        // ProcFS
        // =====================================

        this.mountProcFS();

        // =====================================
        // SysFS
        // =====================================

        this.mountSysFS();

        this.mounted = true;

        console.log(
            "[initramfs] mounted"
        );
    }

    // =====================================
    // Default Files
    // =====================================

    createDefaults() {

        // =====================================
        // /etc
        // =====================================

        this.vfs.createFile(

            "/etc/hostname",

            "jslinux"
        );

        this.vfs.createFile(

            "/etc/passwd",

            "root:x:0:0:root:/root:/bin/sh"
        );

        this.vfs.createFile(

            "/etc/fstab",

            "/dev/sda / ext2 defaults 0 1"
        );

        // =====================================
        // Init Script
        // =====================================

        this.vfs.writeFile(

            "/init",

`#!/bin/sh

echo "Booting JavaScript Linux..."

mount /proc
mount /sys
mount /dev

echo "Starting system..."

exec /bin/sh
`
        );

        // =====================================
        // Shell
        // =====================================

        this.vfs.createFile(

            "/bin/sh",

            "# shell binary"
        );

        this.vfs.createFile(

            "/bin/ls",

            "# ls binary"
        );

        this.vfs.createFile(

            "/bin/cat",

            "# cat binary"
        );

        this.vfs.createFile(

            "/bin/echo",

            "# echo binary"
        );

        this.vfs.createFile(

            "/bin/login",

            "# login binary"
        );

        // =====================================
        // Kernel Logs
        // =====================================

        this.vfs.createFile(

            "/var/log/dmesg",

            ""
        );
    }

    // =====================================
    // ProcFS
    // =====================================

    mountProcFS() {

        this.vfs.mkdir("/proc");

        this.vfs.createFile(

            "/proc/cpuinfo",

            this.cpuInfo()
        );

        this.vfs.createFile(

            "/proc/meminfo",

            this.memInfo()
        );

        this.vfs.createFile(

            "/proc/version",

            "JavaScript Linux Kernel 0.1"
        );

        this.vfs.createFile(

            "/proc/uptime",

            "0.00 0.00"
        );
    }

    // =====================================
    // SysFS
    // =====================================

    mountSysFS() {

        this.vfs.mkdir("/sys");

        this.vfs.mkdir(
            "/sys/devices"
        );

        this.vfs.mkdir(
            "/sys/kernel"
        );

        this.vfs.createFile(

            "/sys/kernel/osrelease",

            "0.1-jslinux"
        );
    }

    // =====================================
    // CPU Info
    // =====================================

    cpuInfo() {

        return `
processor : 0
vendor_id : JavaScriptVM
model name : JS x86-64 CPU
cpu MHz    : 3000
cache size : 8192 KB
`;
    }

    // =====================================
    // Memory Info
    // =====================================

    memInfo() {

        return `
MemTotal:       8388608 kB
MemFree:        4194304 kB
Buffers:        524288 kB
Cached:         1048576 kB
`;
    }

    // =====================================
    // Execute Init
    // =====================================

    boot() {

        if(
            !this.mounted
        ) {

            this.mount();
        }

        console.log(
            "[initramfs] booting..."
        );

        // =====================================
        // Execute /init
        // =====================================

        const initScript =
            this.vfs.readFile(
                "/init"
            );

        console.log(
            initScript
        );

        // =====================================
        // Run Init Scripts
        // =====================================

        for(
            const script
            of this.initScripts
        ) {

            try {

                script();

            } catch(e) {

                console.error(
                    "[init error]",
                    e
                );
            }
        }

        console.log(
            "[initramfs] system ready"
        );
    }

    // =====================================
    // Add Init Script
    // =====================================

    addInitScript(fn) {

        this.initScripts
        .push(fn);
    }

    // =====================================
    // Extract Archive
    // =====================================

    extract(archive) {

        console.log(
            "[initramfs] extracting..."
        );

        for(
            const path
            in archive
        ) {

            const entry =
                archive[path];

            if(
                entry.type
                === "dir"
            ) {

                this.vfs.mkdir(
                    path
                );

            } else {

                this.vfs.createFile(

                    path,

                    entry.content
                );
            }
        }

        console.log(
            "[initramfs] extracted"
        );
    }

    // =====================================
    // Pack
    // =====================================

    pack() {

        const archive = {};

        const files =
            this.vfs.list(
                "/"
            );

        for(
            const file
            of files
        ) {

            archive[file] = {

                type: "file",

                content:
                    this.vfs.readFile(
                        file
                    )
            };
        }

        return archive;
    }

    // =====================================
    // Environment
    // =====================================

    setEnv(key, value) {

        this.env[key] =
            value;
    }

    getEnv(key) {

        return this.env[key];
    }

    // =====================================
    // Pivot Root
    // =====================================

    pivotRoot(newRoot) {

        console.log(

            "[initramfs] switching root ->",

            newRoot
        );

        this.vfs.mount(
            "/",
            newRoot
        );
    }

    // =====================================
    // Kernel Module Load
    // =====================================

    insmod(name, module) {

        if(
            !this.kernel.modules
        ) {

            this.kernel.modules =
                {};
        }

        this.kernel.modules[
            name
        ] = module;

        console.log(

            "[kernel] module loaded:",

            name
        );
    }

    // =====================================
    // dmesg
    // =====================================

    dmesg(message) {

        const current =

            this.vfs.readFile(
                "/var/log/dmesg"
            );

        this.vfs.writeFile(

            "/var/log/dmesg",

            current
            + "\n"
            + message
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            mounted:
                this.mounted,

            env:
                this.env,

            scripts:
                this.initScripts
                .length
        };
    }
}