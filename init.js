// init.js
// First Userspace Init System
// PID 1

class InitSystem {

    constructor(options = {}) {

        // =====================================
        // Core Components
        // =====================================

        this.processManager =
            options.processManager;

        this.scheduler =
            options.scheduler;

        this.syscall =
            options.syscall;

        this.fs =
            options.fs;

        this.ext2 =
            options.ext2;

        this.textmode =
            options.textmode;

        this.network =
            options.network;

        // =====================================
        // Services
        // =====================================

        this.services = [];

        // =====================================
        // Boot State
        // =====================================

        this.booted = false;

        // =====================================
        // Runlevel
        // =====================================

        this.runlevel = 3;

        // =====================================
        // Logs
        // =====================================

        this.logs = [];

        console.log(
            "Init System Ready"
        );
    }

    // =====================================
    // Boot System
    // =====================================

    boot() {

        console.log(
            "INIT: Booting..."
        );

        this.log(
            "System Boot"
        );

        // Mount Filesystem
        this.mountFilesystem();

        // Setup Environment
        this.setupEnvironment();

        // Start Core Services
        this.startCoreServices();

        // Start Login Shell
        this.startShell();

        // Network
        this.startNetwork();

        // Boot Complete
        this.booted = true;

        this.log(
            "Boot Complete"
        );

        this.textmode.println(
            "[ OK ] System Boot Complete",
            10
        );
    }

    // =====================================
    // Mount FS
    // =====================================

    mountFilesystem() {

        try {

            this.ext2.mount();

            this.log(
                "EXT2 Mounted"
            );

            this.textmode.println(

                "[ OK ] Mounted EXT2",

                10
            );

        } catch(err) {

            this.textmode.println(

                "[FAIL] EXT2 Mount",

                12
            );

            console.error(err);
        }
    }

    // =====================================
    // Setup ENV
    // =====================================

    setupEnvironment() {

        const init =
            this.processManager
            .current;

        if(!init) {

            return;
        }

        init.env.PATH =
            "/bin:/usr/bin";

        init.env.HOME =
            "/root";

        init.env.USER =
            "root";

        init.cwd = "/";

        this.log(
            "Environment Ready"
        );
    }

    // =====================================
    // Start Core Services
    // =====================================

    startCoreServices() {

        // =====================================
        // Logger
        // =====================================

        this.startService({

            name: "logger",

            description:
                "Kernel Logger",

            start: () => {

                console.log(
                    "Logger Started"
                );
            }
        });

        // =====================================
        // Scheduler Monitor
        // =====================================

        this.startService({

            name: "sched",

            description:
                "Scheduler Service",

            start: () => {

                setInterval(() => {

                    this.scheduler
                    .cleanup();

                }, 5000);
            }
        });

        // =====================================
        // Process Cleaner
        // =====================================

        this.startService({

            name: "proc-clean",

            description:
                "Zombie Cleaner",

            start: () => {

                setInterval(() => {

                    this.processManager
                    .cleanup();

                }, 10000);
            }
        });
    }

    // =====================================
    // Start Service
    // =====================================

    startService(service) {

        console.log(

            "Starting Service:",

            service.name
        );

        service.running = true;

        service.start();

        this.services.push(service);

        this.textmode.println(

            "[ OK ] " +
            service.name,

            11
        );

        this.log(

            "Service Started: "
            + service.name
        );
    }

    // =====================================
    // Stop Service
    // =====================================

    stopService(name) {

        const service =
            this.services.find(

                s => s.name === name
            );

        if(!service) {

            return;
        }

        service.running = false;

        if(service.stop) {

            service.stop();
        }

        this.log(
            "Service Stopped: "
            + name
        );
    }

    // =====================================
    // Start Shell
    // =====================================

    startShell() {

        const shell =
            this.processManager
            .createProcess({

                name: "shell"
            });

        shell.env.PATH =
            "/bin:/usr/bin";

        shell.cwd = "/root";

        this.log(
            "Shell Started"
        );

        this.textmode.println(

            "[ OK ] Shell Started",

            10
        );

        return shell;
    }

    // =====================================
    // Network Startup
    // =====================================

    startNetwork() {

        if(!this.network) {

            return;
        }

        this.startService({

            name: "network",

            description:
                "Virtual Network",

            start: () => {

                console.log(
                    "Network Online"
                );
            }
        });
    }

    // =====================================
    // Shutdown
    // =====================================

    shutdown() {

        this.textmode.println(

            "System Shutting Down...",

            12
        );

        for(
            const service
            of this.services
        ) {

            this.stopService(
                service.name
            );
        }

        this.booted = false;

        this.log(
            "Shutdown"
        );
    }

    // =====================================
    // Reboot
    // =====================================

    reboot() {

        this.shutdown();

        this.textmode.println(

            "Rebooting...",

            14
        );

        setTimeout(() => {

            location.reload();

        }, 1000);
    }

    // =====================================
    // Kernel Panic
    // =====================================

    panic(message) {

        console.error(

            "KERNEL PANIC:",

            message
        );

        this.textmode.clear(1);

        this.textmode.println(

            "*** KERNEL PANIC ***",

            15
        );

        this.textmode.println(
            message,
            12
        );

        this.shutdown();
    }

    // =====================================
    // Run Command
    // =====================================

    exec(command) {

        console.log(
            "INIT EXEC:",
            command
        );

        const proc =
            this.processManager
            .createProcess({

                name: command
            });

        return proc;
    }

    // =====================================
    // Login
    // =====================================

    login(
        username,
        password
    ) {

        console.log(

            "LOGIN:",

            username
        );

        // Dummy login
        if(
            username === "root"
        ) {

            return true;
        }

        return false;
    }

    // =====================================
    // Log
    // =====================================

    log(text) {

        const entry = {

            time:
                new Date()
                .toISOString(),

            text
        };

        this.logs.push(entry);

        console.log(
            "[INIT]",
            text
        );
    }

    // =====================================
    // Show Logs
    // =====================================

    showLogs() {

        console.log(
            "=== INIT LOG ==="
        );

        for(
            const log
            of this.logs
        ) {

            console.log(

                log.time,

                log.text
            );
        }
    }

    // =====================================
    // Runlevel
    // =====================================

    setRunlevel(level) {

        this.runlevel = level;

        this.log(
            "Runlevel " + level
        );
    }

    // =====================================
    // Service List
    // =====================================

    serviceList() {

        return this.services.map(

            s => ({

                name:
                    s.name,

                running:
                    s.running
            })
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            booted:
                this.booted,

            runlevel:
                this.runlevel,

            services:
                this.services.length,

            logs:
                this.logs.length
        };
    }
}