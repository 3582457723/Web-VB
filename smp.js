// smp.js
// Symmetric Multi Processing
// Multi Core CPU System

// =====================================
// CPU Core
// =====================================

class CPUCore {

    constructor(options = {}) {

        // =====================================
        // ID
        // =====================================

        this.id =
            options.id || 0;

        // =====================================
        // Main CPU
        // =====================================

        this.cpu =
            options.cpu;

        // =====================================
        // APIC
        // =====================================

        this.apic =
            options.apic;

        // =====================================
        // Scheduler
        // =====================================

        this.scheduler =
            options.scheduler;

        // =====================================
        // State
        // =====================================

        this.state = "STOPPED";

        // STOPPED
        // RUNNING
        // HALTED

        // =====================================
        // Current Process
        // =====================================

        this.currentProcess =
            null;

        // =====================================
        // Statistics
        // =====================================

        this.cycles = 0;

        this.instructions = 0;

        // =====================================
        // Clock
        // =====================================

        this.clockHz =
            options.clockHz
            || 3000000000;

        // =====================================
        // Thread
        // =====================================

        this.interval = null;

        console.log(
            "CPU Core Ready:",
            this.id
        );
    }

    // =====================================
    // Start Core
    // =====================================

    start() {

        if(
            this.state ===
            "RUNNING"
        ) {

            return;
        }

        this.state = "RUNNING";

        this.interval =
            setInterval(() => {

                this.tick();

            }, 1);

        console.log(
            "CPU Core Started:",
            this.id
        );
    }

    // =====================================
    // Stop Core
    // =====================================

    stop() {

        this.state =
            "STOPPED";

        clearInterval(
            this.interval
        );

        console.log(
            "CPU Core Stopped:",
            this.id
        );
    }

    // =====================================
    // Halt
    // =====================================

    halt() {

        this.state =
            "HALTED";

        console.log(
            "CPU HALT:",
            this.id
        );
    }

    // =====================================
    // Resume
    // =====================================

    resume() {

        if(
            this.state ===
            "HALTED"
        ) {

            this.state =
                "RUNNING";
        }
    }

    // =====================================
    // CPU Tick
    // =====================================

    tick() {

        if(
            this.state !==
            "RUNNING"
        ) {

            return;
        }

        // Process APIC IRQs
        if(this.apic) {

            this.apic
            .processInterrupts();
        }

        // Scheduler
        if(this.scheduler) {

            this.scheduler
            .schedule();
        }

        // Execute CPU
        if(
            this.cpu &&
            this.cpu.step
        ) {

            this.cpu.step();

            this.instructions++;
        }

        this.cycles++;
    }

    // =====================================
    // Assign Process
    // =====================================

    assignProcess(proc) {

        this.currentProcess =
            proc;

        console.log(

            "CPU",

            this.id,

            "Assigned PID",

            proc.pid
        );
    }

    // =====================================
    // Send IPI
    // =====================================

    sendIPI(
        target,
        vector
    ) {

        if(
            !this.apic
        ) {

            return;
        }

        this.apic.sendIPI(

            target.apic,

            vector
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            id:
                this.id,

            state:
                this.state,

            cycles:
                this.cycles,

            instructions:
                this.instructions,

            currentProcess:
                this.currentProcess
                ? this.currentProcess.pid
                : null
        };
    }
}

// =====================================
// SMP System
// =====================================

class SMPSystem {

    constructor(options = {}) {

        // =====================================
        // APIC Manager
        // =====================================

        this.apicManager =
            options.apicManager;

        // =====================================
        // Core List
        // =====================================

        this.cores = [];

        // =====================================
        // Boot CPU
        // =====================================

        this.bsp = null;

        // =====================================
        // Started
        // =====================================

        this.started = false;

        console.log(
            "SMP System Ready"
        );
    }

    // =====================================
    // Add CPU Core
    // =====================================

    addCore(cpu, scheduler) {

        const apic =
            this.apicManager
            .createLocalAPIC(cpu);

        apic.enable();

        const core =
            new CPUCore({

                id:
                    this.cores.length,

                cpu,

                apic,

                scheduler
            });

        this.cores.push(core);

        // BSP
        if(
            this.cores.length === 1
        ) {

            this.bsp = core;
        }

        console.log(
            "SMP Core Added:",
            core.id
        );

        return core;
    }

    // =====================================
    // Boot SMP
    // =====================================

    boot() {

        if(this.started) {

            return;
        }

        this.started = true;

        console.log(
            "Booting SMP..."
        );

        for(
            const core
            of this.cores
        ) {

            core.start();
        }
    }

    // =====================================
    // Shutdown SMP
    // =====================================

    shutdown() {

        for(
            const core
            of this.cores
        ) {

            core.stop();
        }

        this.started = false;

        console.log(
            "SMP Shutdown"
        );
    }

    // =====================================
    // Get Core
    // =====================================

    getCore(id) {

        return this.cores.find(

            c => c.id === id
        );
    }

    // =====================================
    // Broadcast IPI
    // =====================================

    broadcastIPI(vector) {

        console.log(
            "Broadcast IPI",
            vector
        );

        for(
            const core
            of this.cores
        ) {

            core.apic
            .interrupt(vector);
        }
    }

    // =====================================
    // Send IPI
    // =====================================

    sendIPI(
        from,
        to,
        vector
    ) {

        const source =
            this.getCore(from);

        const target =
            this.getCore(to);

        if(
            !source ||
            !target
        ) {

            return;
        }

        source.sendIPI(
            target,
            vector
        );
    }

    // =====================================
    // Load Balance
    // =====================================

    loadBalance(processes) {

        let index = 0;

        for(
            const proc
            of processes
        ) {

            const core =
                this.cores[
                    index %
                    this.cores.length
                ];

            core.assignProcess(
                proc
            );

            index++;
        }

        console.log(
            "Load Balanced"
        );
    }

    // =====================================
    // Halt Core
    // =====================================

    haltCore(id) {

        const core =
            this.getCore(id);

        if(core) {

            core.halt();
        }
    }

    // =====================================
    // Resume Core
    // =====================================

    resumeCore(id) {

        const core =
            this.getCore(id);

        if(core) {

            core.resume();
        }
    }

    // =====================================
    // Total Statistics
    // =====================================

    stats() {

        let totalCycles = 0;
        let totalInstructions = 0;

        for(
            const core
            of this.cores
        ) {

            totalCycles +=
                core.cycles;

            totalInstructions +=
                core.instructions;
        }

        return {

            cores:
                this.cores.length,

            cycles:
                totalCycles,

            instructions:
                totalInstructions,

            running:
                this.started
        };
    }

    // =====================================
    // CPU Usage
    // =====================================

    cpuUsage() {

        return this.cores.map(

            core => ({

                core:
                    core.id,

                state:
                    core.state,

                process:
                    core.currentProcess
                    ? core.currentProcess
                    .name
                    : "idle"
            })
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            cores:
                this.cores
                .map(

                    c => c.info()
                ),

            bsp:
                this.bsp
                ? this.bsp.id
                : null,

            started:
                this.started
        };
    }
}