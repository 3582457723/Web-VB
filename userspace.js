// userspace.js
// Userspace Runtime + ELF Loader + Program Execution

class UserProgram {

    constructor(options = {}) {

        // =====================================
        // Basic
        // =====================================

        this.pid =
            options.pid || 0;

        this.name =
            options.name
            || "program";

        this.entry =
            options.entry || 0;

        this.process =
            options.process;

        this.memory =
            options.memory;

        this.libc =
            options.libc;

        this.elf =
            options.elf;

        // =====================================
        // Runtime State
        // =====================================

        this.running = false;

        this.exitCode = 0;

        this.startedAt = 0;

        // =====================================
        // Signals
        // =====================================

        this.signalQueue = [];

        // =====================================
        // Threads
        // =====================================

        this.threads = [];

        console.log(
            "Userspace Program:",
            this.name
        );
    }

    // =====================================
    // Start Program
    // =====================================

    start() {

        this.running = true;

        this.startedAt =
            performance.now();

        console.log(

            "EXECUTE",

            this.name,

            "PID",

            this.pid
        );

        // Fake jump to ELF entry
        this.process
        .registers.rip =
            this.entry;

        // Main loop
        this.main();
    }

    // =====================================
    // Main
    // =====================================

    main() {

        this.libc.printf(

            "[USERSPACE] %s started",

            this.name
        );
    }

    // =====================================
    // Stop
    // =====================================

    stop(code = 0) {

        this.running = false;

        this.exitCode = code;

        this.process.exit(code);

        console.log(

            "Program Exit:",

            this.name,

            code
        );
    }

    // =====================================
    // Kill
    // =====================================

    kill() {

        this.signal(
            "SIGKILL"
        );
    }

    // =====================================
    // Signal
    // =====================================

    signal(sig) {

        this.signalQueue.push(sig);

        console.log(

            "Signal",

            sig,

            "->",

            this.name
        );

        this.handleSignals();
    }

    // =====================================
    // Handle Signals
    // =====================================

    handleSignals() {

        while(
            this.signalQueue
            .length > 0
        ) {

            const sig =
                this.signalQueue
                .shift();

            switch(sig) {

                case "SIGTERM":

                    this.stop(0);

                    break;

                case "SIGKILL":

                    this.stop(1);

                    break;

                case "SIGSEGV":

                    this.libc.printf(

                        "Segmentation Fault"
                    );

                    this.stop(139);

                    break;
            }
        }
    }

    // =====================================
    // Create Thread
    // =====================================

    createThread(fn) {

        const thread = {

            id:
                this.threads.length,

            fn,

            running: true
        };

        this.threads.push(thread);

        console.log(

            "Thread Created",

            thread.id
        );

        return thread;
    }

    // =====================================
    // Execute Threads
    // =====================================

    runThreads() {

        for(
            const thread
            of this.threads
        ) {

            if(thread.running) {

                thread.fn();
            }
        }
    }

    // =====================================
    // Runtime Info
    // =====================================

    info() {

        return {

            pid:
                this.pid,

            name:
                this.name,

            running:
                this.running,

            entry:
                "0x" +
                this.entry
                .toString(16),

            threads:
                this.threads.length,

            uptime:
                (
                    performance.now()
                    -
                    this.startedAt
                ).toFixed(2)
        };
    }
}

// =====================================
// Userspace Runtime
// =====================================

class UserSpace {

    constructor(options = {}) {

        // =====================================
        // Core
        // =====================================

        this.processManager =
            options.processManager;

        this.libc =
            options.libc;

        this.ext2 =
            options.ext2;

        this.elfLoader =
            options.elfLoader;

        this.scheduler =
            options.scheduler;

        // =====================================
        // Running Programs
        // =====================================

        this.programs = [];

        // =====================================
        // Current Program
        // =====================================

        this.current = null;

        console.log(
            "Userspace Runtime Ready"
        );
    }

    // =====================================
    // Execute ELF
    // =====================================

    exec(path, args = []) {

        console.log(
            "UserSpace EXEC:",
            path
        );

        // =====================================
        // Read ELF
        // =====================================

        const elfBinary =
            this.ext2.readFile(
                path
            );

        if(!elfBinary) {

            throw new Error(
                "ELF Not Found"
            );
        }

        // =====================================
        // Load ELF
        // =====================================

        this.elfLoader.reset();

        this.elfLoader.load(
            elfBinary
        );

        // =====================================
        // Create Process
        // =====================================

        const proc =
            this.processManager
            .createProcess({

                name: path,

                args,

                entry:
                    this.elfLoader
                    .entryPoint
            });

        // =====================================
        // Create User Program
        // =====================================

        const program =
            new UserProgram({

                pid:
                    proc.pid,

                name:
                    path,

                entry:
                    this.elfLoader
                    .entryPoint,

                process:
                    proc,

                libc:
                    this.libc,

                elf:
                    this.elfLoader
            });

        this.programs.push(
            program
        );

        this.current =
            program;

        // =====================================
        // Scheduler Task
        // =====================================

        this.scheduler
        .createTask({

            name:
                "userspace-" +
                proc.pid,

            entry: () => {

                if(
                    program.running
                ) {

                    program
                    .runThreads();
                }
            }
        });

        // =====================================
        // Start
        // =====================================

        program.start();

        return program;
    }

    // =====================================
    // Fork Current Program
    // =====================================

    fork() {

        if(!this.current) {

            return -1;
        }

        const childPID =
            this.processManager
            .fork();

        this.libc.printf(

            "Forked PID %d",

            childPID
        );

        return childPID;
    }

    // =====================================
    // Kill Program
    // =====================================

    kill(pid) {

        const prog =
            this.programs.find(

                p => p.pid === pid
            );

        if(!prog) {

            return false;
        }

        prog.kill();

        return true;
    }

    // =====================================
    // Signal Program
    // =====================================

    signal(pid, sig) {

        const prog =
            this.programs.find(

                p => p.pid === pid
            );

        if(!prog) {

            return false;
        }

        prog.signal(sig);

        return true;
    }

    // =====================================
    // List Programs
    // =====================================

    ps() {

        console.log(
            "=== USERSPACE ==="
        );

        for(
            const prog
            of this.programs
        ) {

            console.log(

                `[${prog.pid}]`,

                prog.name,

                prog.running
                    ? "RUNNING"
                    : "STOPPED"
            );
        }
    }

    // =====================================
    // Cleanup
    // =====================================

    cleanup() {

        this.programs =
            this.programs.filter(

                p => p.running
            );
    }

    // =====================================
    // Execute Shell Script
    // =====================================

    runScript(text) {

        const lines =
            text.split("\n");

        for(
            const line
            of lines
        ) {

            const cmd =
                line.trim();

            if(!cmd) {

                continue;
            }

            this.libc.printf(

                "SCRIPT> %s",

                cmd
            );

            switch(cmd) {

                case "clear":

                    console.clear();

                    break;

                case "ps":

                    this.ps();

                    break;

                case "reboot":

                    this.libc.reboot();

                    break;

                default:

                    this.exec(cmd);
            }
        }
    }

    // =====================================
    // Runtime Statistics
    // =====================================

    stats() {

        return {

            programs:
                this.programs.length,

            current:
                this.current
                ? this.current.pid
                : null
        };
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            runtime:
                "JS Userspace",

            programs:
                this.programs
                .map(

                    p => p.info()
                )
        };
    }
}