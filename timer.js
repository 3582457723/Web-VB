// timer.js
// Virtual PIT / HPET Timer
// IRQ0 Generator

class VirtualTimer {

    constructor(interruptController) {

        // =====================================
        // Interrupt Controller
        // =====================================

        this.interrupts =
            interruptController;

        // =====================================
        // PIT Frequency
        // =====================================

        this.frequency = 100;

        // =====================================
        // Tick Counter
        // =====================================

        this.ticks = 0;

        // =====================================
        // Running State
        // =====================================

        this.running = false;

        // =====================================
        // Interval ID
        // =====================================

        this.interval = null;

        // =====================================
        // High Precision Time
        // =====================================

        this.startTime =
            performance.now();

        // =====================================
        // Sleep Queue
        // =====================================

        this.sleepQueue = [];

        // =====================================
        // Timer Callbacks
        // =====================================

        this.callbacks = [];

        console.log(
            "Virtual Timer Ready"
        );
    }

    // =====================================
    // Start Timer
    // =====================================

    start() {

        if(this.running) {

            return;
        }

        this.running = true;

        const intervalMS =
            1000 / this.frequency;

        console.log(
            "Timer Started",
            this.frequency,
            "Hz"
        );

        this.interval =
            setInterval(() => {

                this.tick();

            }, intervalMS);
    }

    // =====================================
    // Stop Timer
    // =====================================

    stop() {

        if(!this.running) {

            return;
        }

        clearInterval(
            this.interval
        );

        this.running = false;

        console.log(
            "Timer Stopped"
        );
    }

    // =====================================
    // Timer Tick
    // =====================================

    tick() {

        this.ticks++;

        // IRQ0
        if(this.interrupts) {

            this.interrupts.tick();
        }

        // Process Sleep Queue
        this.processSleep();

        // Execute Callbacks
        this.processCallbacks();
    }

    // =====================================
    // Sleep Queue
    // =====================================

    processSleep() {

        const now =
            performance.now();

        this.sleepQueue =
            this.sleepQueue.filter(task => {

                if(now >= task.end) {

                    task.resolve();

                    return false;
                }

                return true;
            });
    }

    // =====================================
    // Timer Callbacks
    // =====================================

    processCallbacks() {

        for(
            const cb
            of this.callbacks
        ) {

            try {

                cb.fn();

            } catch(err) {

                console.error(
                    "Timer Callback Error",
                    err
                );
            }
        }
    }

    // =====================================
    // Sleep
    // =====================================

    sleep(ms) {

        return new Promise(resolve => {

            this.sleepQueue.push({

                end:
                    performance.now() + ms,

                resolve
            });
        });
    }

    // =====================================
    // Register Callback
    // =====================================

    onTick(fn) {

        const id =
            crypto.randomUUID();

        this.callbacks.push({

            id,
            fn
        });

        return id;
    }

    // =====================================
    // Remove Callback
    // =====================================

    removeCallback(id) {

        this.callbacks =
            this.callbacks.filter(
                x => x.id !== id
            );
    }

    // =====================================
    // Set Frequency
    // =====================================

    setFrequency(hz) {

        if(hz <= 0) {

            throw new Error(
                "Invalid frequency"
            );
        }

        this.frequency = hz;

        console.log(
            "Timer Frequency:",
            hz,
            "Hz"
        );

        // Restart timer
        if(this.running) {

            this.stop();

            this.start();
        }
    }

    // =====================================
    // Milliseconds Since Boot
    // =====================================

    uptimeMS() {

        return (
            performance.now() -
            this.startTime
        );
    }

    // =====================================
    // Seconds Since Boot
    // =====================================

    uptimeSeconds() {

        return (
            this.uptimeMS() / 1000
        ).toFixed(2);
    }

    // =====================================
    // PIT Divider
    // =====================================

    setDivider(divider) {

        const pitBase =
            1193182;

        const hz =
            pitBase / divider;

        this.setFrequency(hz);
    }

    // =====================================
    // Busy Wait
    // =====================================

    busyWait(ms) {

        const start =
            performance.now();

        while(
            performance.now() - start
            < ms
        ) {

            // Burn CPU
        }
    }

    // =====================================
    // HPET Time
    // =====================================

    hpet() {

        return performance.now();
    }

    // =====================================
    // Reset Tick Counter
    // =====================================

    resetTicks() {

        this.ticks = 0;

        console.log(
            "Ticks Reset"
        );
    }

    // =====================================
    // Get Tick Count
    // =====================================

    getTicks() {

        return this.ticks;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            running:
                this.running,

            frequency:
                this.frequency,

            ticks:
                this.ticks,

            uptime:
                this.uptimeSeconds(),

            sleepTasks:
                this.sleepQueue.length,

            callbacks:
                this.callbacks.length
        };
    }
}