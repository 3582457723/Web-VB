// apic.js
// Local APIC + IOAPIC
// SMP Interrupt Controller

// =====================================
// Local APIC
// =====================================

class LocalAPIC {

    constructor(cpu) {

        // =====================================
        // CPU
        // =====================================

        this.cpu = cpu;

        // =====================================
        // APIC ID
        // =====================================

        this.id =
            cpu.id || 0;

        // =====================================
        // Registers
        // =====================================

        this.registers = {

            spuriousVector: 0xFF,

            taskPriority: 0,

            eoi: 0,

            timerVector: 32,

            timerInitial: 0,

            timerCurrent: 0,

            timerDivide: 16,

            enabled: false
        };

        // =====================================
        // Interrupt Queue
        // =====================================

        this.interruptQueue = [];

        // =====================================
        // Timer
        // =====================================

        this.timerEnabled = false;

        this.timerInterval = null;

        console.log(
            "Local APIC Ready:",
            this.id
        );
    }

    // =====================================
    // Enable APIC
    // =====================================

    enable() {

        this.registers.enabled =
            true;

        console.log(
            "APIC Enabled",
            this.id
        );
    }

    // =====================================
    // Disable APIC
    // =====================================

    disable() {

        this.registers.enabled =
            false;

        console.log(
            "APIC Disabled",
            this.id
        );
    }

    // =====================================
    // Send Interrupt
    // =====================================

    interrupt(vector) {

        if(
            !this.registers.enabled
        ) {

            return;
        }

        this.interruptQueue.push(
            vector
        );

        console.log(

            "APIC IRQ",

            this.id,

            vector
        );
    }

    // =====================================
    // Process Interrupts
    // =====================================

    processInterrupts() {

        while(
            this.interruptQueue
            .length > 0
        ) {

            const vector =
                this.interruptQueue
                .shift();

            if(
                this.cpu &&
                this.cpu.interrupts
            ) {

                this.cpu.interrupts
                .interrupt(vector);
            }
        }
    }

    // =====================================
    // End Of Interrupt
    // =====================================

    eoi() {

        this.registers.eoi++;

        console.log(
            "EOI",
            this.id
        );
    }

    // =====================================
    // APIC Timer
    // =====================================

    startTimer(
        interval = 10
    ) {

        this.timerEnabled = true;

        this.registers
        .timerInitial =
            interval;

        this.registers
        .timerCurrent =
            interval;

        this.timerInterval =
            setInterval(() => {

                if(
                    !this.timerEnabled
                ) {

                    return;
                }

                this.registers
                .timerCurrent--;

                if(
                    this.registers
                    .timerCurrent <= 0
                ) {

                    this.interrupt(

                        this.registers
                        .timerVector
                    );

                    this.registers
                    .timerCurrent =
                        this.registers
                        .timerInitial;
                }

            }, 1);

        console.log(
            "APIC Timer Started"
        );
    }

    // =====================================
    // Stop Timer
    // =====================================

    stopTimer() {

        this.timerEnabled =
            false;

        clearInterval(
            this.timerInterval
        );

        console.log(
            "APIC Timer Stopped"
        );
    }

    // =====================================
    // Inter Processor Interrupt
    // =====================================

    sendIPI(
        targetAPIC,
        vector
    ) {

        console.log(

            "IPI",

            this.id,

            "->",

            targetAPIC.id,

            vector
        );

        targetAPIC
        .interrupt(vector);
    }

    // =====================================
    // Read Register
    // =====================================

    read(reg) {

        return (
            this.registers[reg]
            || 0
        );
    }

    // =====================================
    // Write Register
    // =====================================

    write(reg, value) {

        this.registers[reg] =
            value;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            id:
                this.id,

            enabled:
                this.registers.enabled,

            queuedInterrupts:
                this.interruptQueue
                .length,

            timer:
                this.timerEnabled
        };
    }
}

// =====================================
// IO APIC
// =====================================

class IOAPIC {

    constructor() {

        // =====================================
        // IRQ Routing
        // =====================================

        this.redirectionTable =
            new Map();

        // =====================================
        // Connected APICs
        // =====================================

        this.apics = [];

        console.log(
            "IOAPIC Ready"
        );
    }

    // =====================================
    // Connect Local APIC
    // =====================================

    connect(apic) {

        this.apics.push(apic);

        console.log(
            "IOAPIC Connected APIC",
            apic.id
        );
    }

    // =====================================
    // Route IRQ
    // =====================================

    routeIRQ(
        irq,
        apicID,
        vector
    ) {

        this.redirectionTable
        .set(

            irq,

            {

                apicID,
                vector
            }
        );

        console.log(

            "IRQ ROUTE",

            irq,

            "-> APIC",

            apicID,

            "VECTOR",

            vector
        );
    }

    // =====================================
    // Trigger IRQ
    // =====================================

    trigger(irq) {

        const route =
            this.redirectionTable
            .get(irq);

        if(!route) {

            console.warn(

                "No IRQ Route:",
                irq
            );

            return;
        }

        const apic =
            this.apics.find(

                a =>
                    a.id ===
                    route.apicID
            );

        if(!apic) {

            console.warn(
                "APIC Not Found"
            );

            return;
        }

        console.log(

            "IOAPIC IRQ",

            irq,

            "->",

            route.vector
        );

        apic.interrupt(
            route.vector
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            apics:
                this.apics.length,

            routes:
                this.redirectionTable
                .size
        };
    }
}

// =====================================
// APIC Manager
// =====================================

class APICManager {

    constructor() {

        // =====================================
        // Local APICs
        // =====================================

        this.localAPICs = [];

        // =====================================
        // IOAPIC
        // =====================================

        this.ioapic =
            new IOAPIC();

        console.log(
            "APIC Manager Ready"
        );
    }

    // =====================================
    // Create Local APIC
    // =====================================

    createLocalAPIC(cpu) {

        const apic =
            new LocalAPIC(cpu);

        this.localAPICs.push(apic);

        this.ioapic.connect(apic);

        return apic;
    }

    // =====================================
    // Broadcast Interrupt
    // =====================================

    broadcast(vector) {

        console.log(
            "APIC Broadcast",
            vector
        );

        for(
            const apic
            of this.localAPICs
        ) {

            apic.interrupt(
                vector
            );
        }
    }

    // =====================================
    // Send IPI
    // =====================================

    sendIPI(
        fromID,
        toID,
        vector
    ) {

        const from =
            this.localAPICs.find(

                a => a.id === fromID
            );

        const to =
            this.localAPICs.find(

                a => a.id === toID
            );

        if(
            !from || !to
        ) {

            return;
        }

        from.sendIPI(
            to,
            vector
        );
    }

    // =====================================
    // Process All
    // =====================================

    process() {

        for(
            const apic
            of this.localAPICs
        ) {

            apic.processInterrupts();
        }
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            localAPICs:
                this.localAPICs
                .length,

            ioapic:
                this.ioapic.info()
        };
    }
}