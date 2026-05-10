// process.js
// Virtual Process Manager
// Linux-like Process System

class Process {

    constructor(options = {}) {

        // =====================================
        // PID / PPID
        // =====================================

        this.pid =
            options.pid || 0;

        this.ppid =
            options.ppid || 0;

        // =====================================
        // Name
        // =====================================

        this.name =
            options.name
            || "process";

        // =====================================
        // State
        // =====================================

        this.state = "READY";

        // READY
        // RUNNING
        // SLEEPING
        // ZOMBIE
        // TERMINATED

        // =====================================
        // Memory
        // =====================================

        this.memory = {

            codeStart: 0x400000,

            heapStart: 0x800000,

            stackTop: 0xFFFF0000,

            heapSize: 0,

            stackSize: 0x10000
        };

        // =====================================
        // Registers
        // =====================================

        this.registers = {

            rip: 0,
            rsp: this.memory.stackTop,

            rax: 0,
            rbx: 0,
            rcx: 0,
            rdx: 0,

            rsi: 0,
            rdi: 0
        };

        // =====================================
        // File Descriptors
        // =====================================

        this.fdTable = {

            0: "stdin",
            1: "stdout",
            2: "stderr"
        };

        // =====================================
        // Threads
        // =====================================

        this.threads = [];

        // =====================================
        // Exit Code
        // =====================================

        this.exitCode = 0;

        // =====================================
        // Environment
        // =====================================

        this.env = {};

        // =====================================
        // Working Directory
        // =====================================

        this.cwd = "/";

        // =====================================
        // ELF Entry
        // =====================================

        this.entry =
            options.entry || 0;

        // =====================================
        // Arguments
        // =====================================

        this.args =
            options.args || [];

        // =====================================
        // Runtime
        // =====================================

        this.startTime =
            performance.now();

        this.cpuTime = 0;

        console.log(
            "Process Created:",
            this.pid,
            this.name
        );
    }

    // =====================================
    // Clone Process
    // =====================================

    fork(newPID) {

        const child =
            new Process({

                pid: newPID,

                ppid: this.pid,

                name: this.name
            });

        // Copy Registers
        child.registers =
            structuredClone(
                this.registers
            );

        // Copy Memory Layout
        child.memory =
            structuredClone(
                this.memory
            );

        // Copy FDs
        child.fdTable =
            structuredClone(
                this.fdTable
            );

        // Copy ENV
        child.env =
            structuredClone(
                this.env
            );

        // Child return value
        child.registers.rax = 0;

        return child;
    }

    // =====================================
    // Execute New Program
    // =====================================

    exec(
        elf,
        cpu
    ) {

        this.entry =
            elf.entryPoint;

        this.registers.rip =
            elf.entryPoint;

        this.state =
            "READY";

        cpu.registers =
            structuredClone(
                this.registers
            );

        console.log(

            "EXEC",

            this.name,

            "0x" +
            elf.entryPoint
            .toString(16)
        );
    }

    // =====================================
    // Exit
    // =====================================

    exit(code = 0) {

        this.exitCode = code;

        this.state =
            "ZOMBIE";

        console.log(

            "Process Exit:",
            this.pid,
            code
        );
    }

    // =====================================
    // Kill
    // =====================================

    kill() {

        this.state =
            "TERMINATED";

        console.log(

            "Process Killed:",
            this.pid
        );
    }

    // =====================================
    // Sleep
    // =====================================

    sleep(ms) {

        this.state =
            "SLEEPING";

        this.sleepUntil =
            performance.now() + ms;
    }

    // =====================================
    // Wake
    // =====================================

    wake() {

        if(
            this.state ===
            "SLEEPING"
        ) {

            this.state =
                "READY";
        }
    }

    // =====================================
    // Heap Allocation
    // =====================================

    malloc(size) {

        const addr =

            this.memory.heapStart
            +
            this.memory.heapSize;

        this.memory.heapSize +=
            size;

        return addr;
    }

    // =====================================
    // Stack Push
    // =====================================

    push64(value) {

        this.registers.rsp -= 8;

        return this.registers.rsp;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            pid:
                this.pid,

            ppid:
                this.ppid,

            name:
                this.name,

            state:
                this.state,

            rip:
                "0x" +
                this.registers.rip
                .toString(16),

            rsp:
                "0x" +
                this.registers.rsp
                .toString(16),

            runtime:
                (
                    performance.now()
                    -
                    this.startTime
                ).toFixed(2),

            heap:
                this.memory.heapSize
        };
    }
}

// =====================================
// Process Manager
// =====================================

class ProcessManager {

    constructor(options = {}) {

        // =====================================
        // Core
        // =====================================

        this.cpu =
            options.cpu;

        this.mmu =
            options.mmu;

        this.scheduler =
            options.scheduler;

        this.syscall =
            options.syscall;

        this.elf =
            options.elf;

        // =====================================
        // Process Table
        // =====================================

        this.processes = [];

        // =====================================
        // PID
        // =====================================

        this.nextPID = 1;

        // =====================================
        // Current Process
        // =====================================

        this.current = null;

        console.log(
            "Process Manager Ready"
        );

        // Init Process
        this.createInit();
    }

    // =====================================
    // Create Init Process
    // =====================================

    createInit() {

        const init =
            this.createProcess({

                name: "init"
            });

        this.current = init;
    }

    // =====================================
    // Create Process
    // =====================================

    createProcess(options = {}) {

        const proc =
            new Process({

                pid:
                    this.nextPID++,

                ...options
            });

        this.processes.push(proc);

        // Scheduler Task
        this.scheduler
        .createTask({

            name:
                "proc-" + proc.pid,

            entry: () => {

                this.runProcess(proc);
            }
        });

        return proc;
    }

    // =====================================
    // Run Process
    // =====================================

    runProcess(proc) {

        if(
            proc.state ===
            "TERMINATED"
        ) {

            return;
        }

        this.current = proc;

        proc.state =
            "RUNNING";

        // Load CPU registers
        this.cpu.registers =
            structuredClone(
                proc.registers
            );

        // Fake execution
        this.executeInstruction();

        // Save CPU registers
        proc.registers =
            structuredClone(
                this.cpu.registers
            );

        // Back to READY
        if(
            proc.state ===
            "RUNNING"
        ) {

            proc.state =
                "READY";
        }

        proc.cpuTime += 1;
    }

    // =====================================
    // Fake CPU Execute
    // =====================================

    executeInstruction() {

        this.cpu.registers.rip++;
    }

    // =====================================
    // Fork
    // =====================================

    fork() {

        if(!this.current) {

            return -1;
        }

        const child =
            this.current.fork(
                this.nextPID++
            );

        this.processes.push(child);

        console.log(

            "FORK",

            this.current.pid,

            "->",

            child.pid
        );

        return child.pid;
    }

    // =====================================
    // Exec ELF
    // =====================================

    exec(path) {

        if(!this.current) {

            return -1;
        }

        const data =
            this.loadELFFile(path);

        this.elf.reset();

        this.elf.load(data);

        this.current.exec(
            this.elf,
            this.cpu
        );

        return 0;
    }

    // =====================================
    // Load ELF File
    // =====================================

    loadELFFile(path) {

        const content =
            fetch(path);

        console.log(
            "Load ELF:",
            path
        );

        return content;
    }

    // =====================================
    // Exit
    // =====================================

    exit(code = 0) {

        if(!this.current) {

            return;
        }

        this.current.exit(code);
    }

    // =====================================
    // Kill
    // =====================================

    kill(pid) {

        const proc =
            this.get(pid);

        if(proc) {

            proc.kill();
        }
    }

    // =====================================
    // Wait
    // =====================================

    wait(pid) {

        const proc =
            this.get(pid);

        if(!proc) {

            return -1;
        }

        return proc.exitCode;
    }

    // =====================================
    // Get Process
    // =====================================

    get(pid) {

        return this.processes.find(

            p => p.pid === pid
        );
    }

    // =====================================
    // Process List
    // =====================================

    ps() {

        console.log(
            "=== PROCESS LIST ==="
        );

        for(
            const proc
            of this.processes
        ) {

            console.log(

                `[${proc.pid}]`,

                proc.name,

                proc.state
            );
        }
    }

    // =====================================
    // Cleanup Zombies
    // =====================================

    cleanup() {

        this.processes =
            this.processes.filter(

                p =>
                    p.state !==
                    "TERMINATED"
            );
    }

    // =====================================
    // Environment Variable
    // =====================================

    setenv(key, value) {

        if(this.current) {

            this.current.env[key] =
                value;
        }
    }

    // =====================================
    // Get ENV
    // =====================================

    getenv(key) {

        if(!this.current) {

            return null;
        }

        return (
            this.current.env[key]
            || null
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            processes:
                this.processes.length,

            current:
                this.current
                ? this.current.pid
                : null,

            nextPID:
                this.nextPID
        };
    }
}