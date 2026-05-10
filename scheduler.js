// scheduler.js
// Virtual Task Scheduler
// Round Robin Multitasking

class Task {

    constructor(options = {}) {

        // =====================================
        // PID
        // =====================================

        this.pid =
            options.pid || 0;

        // =====================================
        // Name
        // =====================================

        this.name =
            options.name || "task";

        // =====================================
        // State
        // =====================================

        this.state = "READY";

        // READY
        // RUNNING
        // SLEEPING
        // TERMINATED

        // =====================================
        // Registers
        // =====================================

        this.registers = {

            rip: 0,
            rsp: 0,
            rax: 0,
            rbx: 0,
            rcx: 0,
            rdx: 0
        };

        // =====================================
        // Function
        // =====================================

        this.entry =
            options.entry ||
            (() => {});

        // =====================================
        // Priority
        // =====================================

        this.priority =
            options.priority || 1;

        // =====================================
        // Sleep
        // =====================================

        this.sleepUntil = 0;

        // =====================================
        // CPU Time
        // =====================================

        this.cpuTime = 0;

        // =====================================
        // Start Time
        // =====================================

        this.startTime =
            performance.now();

        // =====================================
        // Exit Code
        // =====================================

        this.exitCode = 0;

        console.log(
            "Task Created:",
            this.pid,
            this.name
        );
    }

    // =====================================
    // Run Task
    // =====================================

    run() {

        if(
            this.state ===
            "TERMINATED"
        ) {

            return;
        }

        this.state = "RUNNING";

        try {

            this.entry(this);

        } catch(err) {

            console.error(

                "TASK ERROR",
                this.pid,
                err
            );

            this.terminate(1);
        }
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
    // Terminate
    // =====================================

    terminate(code = 0) {

        this.state =
            "TERMINATED";

        this.exitCode = code;

        console.log(

            "Task Terminated:",
            this.pid,
            this.name
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            pid:
                this.pid,

            name:
                this.name,

            state:
                this.state,

            priority:
                this.priority,

            cpuTime:
                this.cpuTime,

            uptime:
                (
                    performance.now()
                    -
                    this.startTime
                ).toFixed(2)
        };
    }
}

// =====================================
// Scheduler
// =====================================

class Scheduler {

    constructor(timer) {

        // =====================================
        // Timer
        // =====================================

        this.timer = timer;

        // =====================================
        // Tasks
        // =====================================

        this.tasks = [];

        // =====================================
        // Current Task
        // =====================================

        this.current = null;

        // =====================================
        // PID Counter
        // =====================================

        this.nextPID = 1;

        // =====================================
        // Quantum
        // =====================================

        this.quantum = 10;

        // =====================================
        // Enabled
        // =====================================

        this.running = false;

        // =====================================
        // Statistics
        // =====================================

        this.contextSwitches = 0;

        // =====================================
        // Idle Task
        // =====================================

        this.idleTask =
            new Task({

                pid: 0,

                name: "idle",

                entry: () => {}
            });

        console.log(
            "Scheduler Ready"
        );
    }

    // =====================================
    // Start
    // =====================================

    start() {

        if(this.running) {
            return;
        }

        this.running = true;

        this.timer.onTick(() => {

            this.schedule();
        });

        console.log(
            "Scheduler Started"
        );
    }

    // =====================================
    // Stop
    // =====================================

    stop() {

        this.running = false;

        console.log(
            "Scheduler Stopped"
        );
    }

    // =====================================
    // Create Task
    // =====================================

    createTask(options = {}) {

        const task =
            new Task({

                pid:
                    this.nextPID++,

                ...options
            });

        this.tasks.push(task);

        return task;
    }

    // =====================================
    // Kill Task
    // =====================================

    killTask(pid) {

        const task =
            this.tasks.find(
                t => t.pid === pid
            );

        if(task) {

            task.terminate();
        }
    }

    // =====================================
    // Main Scheduler
    // =====================================

    schedule() {

        if(!this.running) {
            return;
        }

        // Wake sleeping tasks
        this.processSleep();

        // Find READY task
        const readyTasks =
            this.tasks.filter(

                t =>
                    t.state ===
                    "READY"
            );

        let nextTask =
            readyTasks[0];

        if(!nextTask) {

            nextTask =
                this.idleTask;
        }

        // Context Switch
        this.switchTask(
            nextTask
        );
    }

    // =====================================
    // Context Switch
    // =====================================

    switchTask(task) {

        // Save current task
        if(this.current) {

            if(
                this.current.state ===
                "RUNNING"
            ) {

                this.current.state =
                    "READY";
            }
        }

        // Switch
        this.current = task;

        this.contextSwitches++;

        // Run
        task.run();

        task.cpuTime +=
            this.quantum;

        // Auto READY
        if(
            task.state ===
            "RUNNING"
        ) {

            task.state =
                "READY";
        }
    }

    // =====================================
    // Sleep Queue
    // =====================================

    processSleep() {

        const now =
            performance.now();

        for(
            const task
            of this.tasks
        ) {

            if(
                task.state ===
                "SLEEPING"
            ) {

                if(
                    now >=
                    task.sleepUntil
                ) {

                    task.wake();
                }
            }
        }
    }

    // =====================================
    // Yield CPU
    // =====================================

    yield() {

        this.schedule();
    }

    // =====================================
    // Cleanup Dead Tasks
    // =====================================

    cleanup() {

        this.tasks =
            this.tasks.filter(

                t =>
                    t.state !==
                    "TERMINATED"
            );
    }

    // =====================================
    // Find Task
    // =====================================

    getTask(pid) {

        return this.tasks.find(
            t => t.pid === pid
        );
    }

    // =====================================
    // List Tasks
    // =====================================

    ps() {

        console.log(
            "=== TASKS ==="
        );

        for(
            const task
            of this.tasks
        ) {

            console.log(

                `[${task.pid}]`,
                task.name,
                task.state
            );
        }
    }

    // =====================================
    // Set Quantum
    // =====================================

    setQuantum(ms) {

        this.quantum = ms;

        console.log(
            "Quantum:",
            ms
        );
    }

    // =====================================
    // Total CPU Usage
    // =====================================

    totalCPUTime() {

        let total = 0;

        for(
            const task
            of this.tasks
        ) {

            total += task.cpuTime;
        }

        return total;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            running:
                this.running,

            tasks:
                this.tasks.length,

            current:
                this.current
                ? this.current.pid
                : null,

            contextSwitches:
                this.contextSwitches,

            quantum:
                this.quantum
        };
    }
}