// init_executor.js
// Linux init process executor
// PID 1 userspace bootstrap

class InitExecutor {

    constructor(

        cpu,
        memory,
        ext4,
        vfs,
        processManager,
        elfLoader,
        syscall,
        terminal
    ) {

        this.cpu = cpu;

        this.memory = memory;

        this.ext4 = ext4;

        this.vfs = vfs;

        this.processManager =
            processManager;

        this.elfLoader =
            elfLoader;

        this.syscall = syscall;

        this.terminal =
            terminal;

        // =====================================
        // Init Paths
        // =====================================

        this.initCandidates = [

            "/sbin/init",

            "/etc/init",

            "/bin/init",

            "/bin/sh"
        ];

        // =====================================
        // Environment
        // =====================================

        this.environment = {

            PATH:
                "/bin:/usr/bin:/sbin:/usr/sbin",

            HOME:
                "/root",

            TERM:
                "linux",

            USER:
                "root"
        };

        // =====================================
        // Mounts
        // =====================================

        this.mounts = [];

        // =====================================
        // Boot State
        // =====================================

        this.booted = false;

        this.currentInit = null;

        console.log(
            "Init Executor Ready"
        );
    }

    // =====================================
    // Setup Root Filesystem
    // =====================================

    setupRootFS() {

        // =====================================
        // Linux dirs
        // =====================================

        const dirs = [

            "/bin",
            "/sbin",
            "/etc",
            "/proc",
            "/sys",
            "/dev",
            "/tmp",
            "/usr",
            "/usr/bin",
            "/usr/lib",
            "/var",
            "/root",
            "/home"
        ];

        for(
            const dir
            of dirs
        ) {

            this.ext4.mkdir(
                dir
            );
        }

        console.log(
            "[ROOTFS READY]"
        );
    }

    // =====================================
    // Setup /dev
    // =====================================

    setupDevFS() {

        const devices = [

            "/dev/null",
            "/dev/zero",
            "/dev/tty",
            "/dev/console",
            "/dev/sda"
        ];

        for(
            const dev
            of devices
        ) {

            this.ext4.create(
                dev
            );
        }

        console.log(
            "[DEVFS READY]"
        );
    }

    // =====================================
    // Setup /proc
    // =====================================

    setupProcFS() {

        const procFiles = [

            "/proc/cpuinfo",
            "/proc/meminfo",
            "/proc/version",
            "/proc/mounts"
        ];

        for(
            const file
            of procFiles
        ) {

            this.ext4.create(
                file
            );
        }

        this.ext4.writeFile(

            "/proc/version",

            new TextEncoder()
            .encode(

                "Linux version WebVB"
            )
        );

        console.log(
            "[PROCFS READY]"
        );
    }

    // =====================================
    // Setup /etc
    // =====================================

    setupEtc() {

        // passwd
        this.ext4.create(
            "/etc/passwd"
        );

        this.ext4.writeFile(

            "/etc/passwd",

            new TextEncoder()
            .encode(

                "root:x:0:0:root:/root:/bin/sh\n"
            )
        );

        // hostname
        this.ext4.create(
            "/etc/hostname"
        );

        this.ext4.writeFile(

            "/etc/hostname",

            new TextEncoder()
            .encode(
                "webvb\n"
            )
        );

        // fstab
        this.ext4.create(
            "/etc/fstab"
        );

        this.ext4.writeFile(

            "/etc/fstab",

            new TextEncoder()
            .encode(

                "/dev/sda / ext4 defaults 0 1\n"
            )
        );

        console.log(
            "[ETC READY]"
        );
    }

    // =====================================
    // Create Shell
    // =====================================

    createBuiltinShell() {

        this.ext4.create(
            "/bin/sh"
        );

        const shellCode =

            new TextEncoder()
            .encode(

`#!/bin/sh
echo "WebVB Linux"
`
            );

        this.ext4.writeFile(

            "/bin/sh",

            shellCode
        );

        console.log(
            "[BUILTIN SHELL]"
        );
    }

    // =====================================
    // Create Init
    // =====================================

    createBuiltinInit() {

        this.ext4.create(
            "/sbin/init"
        );

        const initCode =

            new TextEncoder()
            .encode(

`#!/bin/init
mount -a
echo "Boot OK"
exec /bin/sh
`
            );

        this.ext4.writeFile(

            "/sbin/init",

            initCode
        );

        console.log(
            "[BUILTIN INIT]"
        );
    }

    // =====================================
    // Find Init
    // =====================================

    findInit() {

        for(
            const path
            of this.initCandidates
        ) {

            const stat =
                this.ext4.stat(
                    path
                );

            if(stat) {

                console.log(

                    `[INIT FOUND]
${path}`
                );

                return path;
            }
        }

        return null;
    }

    // =====================================
    // Execute Script
    // =====================================

    executeScript(path) {

        const data =
            this.ext4.readFile(
                path
            );

        if(!data) {

            return false;
        }

        const script =
            new TextDecoder()
            .decode(data);

        const lines =
            script.split("\n");

        for(
            const line
            of lines
        ) {

            this.executeCommand(
                line.trim()
            );
        }

        return true;
    }

    // =====================================
    // Execute Command
    // =====================================

    executeCommand(command) {

        if(!command) {

            return;
        }

        console.log(

            `[INIT CMD]
${command}`
        );

        // =====================================
        // echo
        // =====================================

        if(
            command.startsWith(
                "echo "
            )
        ) {

            const text =
                command.slice(5);

            this.println(text);

            return;
        }

        // =====================================
        // mount
        // =====================================

        if(
            command.startsWith(
                "mount"
            )
        ) {

            this.mountAll();

            return;
        }

        // =====================================
        // exec
        // =====================================

        if(
            command.startsWith(
                "exec "
            )
        ) {

            const file =
                command.slice(5);

            this.exec(file);

            return;
        }
    }

    // =====================================
    // Mount all
    // =====================================

    mountAll() {

        this.mounts.push({

            device:
                "/dev/sda",

            mountpoint:
                "/",

            fs:
                "ext4"
        });

        console.log(
            "[MOUNT ALL]"
        );
    }

    // =====================================
    // Execute ELF/Binary
    // =====================================

    exec(path) {

        const data =
            this.ext4.readFile(
                path
            );

        if(!data) {

            console.error(

                `[EXEC FAIL]
${path}`
            );

            return false;
        }

        // =====================================
        // ELF
        // =====================================

        if(

            data[0] === 0x7F
            &&
            data[1] === 0x45
            &&
            data[2] === 0x4C
            &&
            data[3] === 0x46
        ) {

            return this.execELF(
                path,
                data
            );
        }

        // =====================================
        // Script
        // =====================================

        return this.executeScript(
            path
        );
    }

    // =====================================
    // Execute ELF
    // =====================================

    execELF(

        path,
        data
    ) {

        if(!this.elfLoader) {

            return false;
        }

        const elf =

            this.elfLoader.load(
                data
            );

        const pid =

            this.processManager
            .createProcess({

                name:
                    path,

                entry:
                    elf.entry
            });

        console.log(

            `[EXEC ELF]
${path}
pid=${pid}`
        );

        return pid;
    }

    // =====================================
    // Spawn Shell
    // =====================================

    spawnShell() {

        console.log(
            "[SPAWN SHELL]"
        );

        this.exec("/bin/sh");
    }

    // =====================================
    // PID 1
    // =====================================

    startPID1() {

        const init =
            this.findInit();

        if(!init) {

            console.error(
                "Kernel panic - no init"
            );

            return false;
        }

        this.currentInit =
            init;

        const pid =

            this.processManager
            .createProcess({

                pid: 1,

                name:
                    init,

                uid: 0,

                gid: 0
            });

        console.log(

            `[PID1]
${init}`
        );

        this.exec(init);

        return pid;
    }

    // =====================================
    // Linux Boot
    // =====================================

    boot() {

        console.log(
            "[INIT BOOT]"
        );

        // =====================================
        // Root filesystem
        // =====================================

        this.setupRootFS();

        // =====================================
        // DevFS
        // =====================================

        this.setupDevFS();

        // =====================================
        // ProcFS
        // =====================================

        this.setupProcFS();

        // =====================================
        // /etc
        // =====================================

        this.setupEtc();

        // =====================================
        // Default binaries
        // =====================================

        this.createBuiltinShell();

        this.createBuiltinInit();

        // =====================================
        // Start PID 1
        // =====================================

        this.startPID1();

        this.booted = true;

        console.log(
            "[LINUX USERSPACE READY]"
        );

        return true;
    }

    // =====================================
    // Terminal Output
    // =====================================

    println(text) {

        if(this.terminal) {

            this.terminal.println(
                text
            );
        }

        console.log(text);
    }

    // =====================================
    // Panic
    // =====================================

    panic(message) {

        console.error(

            `[KERNEL PANIC]
${message}`
        );

        this.println(

            `Kernel panic: ${message}`
        );

        this.cpu.stop();
    }

    // =====================================
    // Environment
    // =====================================

    getenv(name) {

        return this.environment[
            name
        ];
    }

    setenv(

        name,
        value
    ) {

        this.environment[
            name
        ] = value;
    }

    // =====================================
    // Dump
    // =====================================

    dump() {

        return {

            booted:
                this.booted,

            init:
                this.currentInit,

            env:
                this.environment,

            mounts:
                this.mounts
        };
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            pid1:
                this.currentInit,

            mounted:
                this.mounts.length,

            booted:
                this.booted
        };
    }
}