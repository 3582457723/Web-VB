// interrupt.js
// Virtual x86 Interrupt Controller
// PIC + IDT + Exceptions + IRQ

class InterruptController {

    constructor(cpu) {

        this.cpu = cpu;

        // =====================================
        // IDT
        // =====================================

        this.idt = new Array(256);

        // =====================================
        // IRQ Mask
        // =====================================

        this.irqMask = new Array(16)
            .fill(false);

        // =====================================
        // Interrupt State
        // =====================================

        this.enabled = true;

        // =====================================
        // Interrupt Queue
        // =====================================

        this.queue = [];

        // =====================================
        // Exception Names
        // =====================================

        this.exceptionNames = {

            0:  "Divide Error",
            1:  "Debug",
            2:  "NMI",
            3:  "Breakpoint",
            4:  "Overflow",
            5:  "BOUND Range",
            6:  "Invalid Opcode",
            7:  "Device Not Available",
            8:  "Double Fault",
            9:  "Coprocessor Segment",
            10: "Invalid TSS",
            11: "Segment Not Present",
            12: "Stack Fault",
            13: "General Protection",
            14: "Page Fault",
            16: "x87 Floating Point",
            17: "Alignment Check",
            18: "Machine Check",
            19: "SIMD Floating Point"
        };

        console.log(
            "Interrupt Controller Ready"
        );
    }

    // =====================================
    // Enable Interrupts
    // =====================================

    sti() {

        this.enabled = true;

        console.log(
            "Interrupts Enabled"
        );
    }

    // =====================================
    // Disable Interrupts
    // =====================================

    cli() {

        this.enabled = false;

        console.log(
            "Interrupts Disabled"
        );
    }

    // =====================================
    // Register Handler
    // =====================================

    register(vector, handler) {

        this.idt[vector] = handler;

        console.log(
            "INT " +
            vector +
            " handler installed"
        );
    }

    // =====================================
    // Remove Handler
    // =====================================

    unregister(vector) {

        this.idt[vector] = null;

        console.log(
            "INT " +
            vector +
            " handler removed"
        );
    }

    // =====================================
    // Raise Interrupt
    // =====================================

    interrupt(vector, data = {}) {

        if(!this.enabled) {

            console.log(
                "Interrupt ignored"
            );

            return;
        }

        this.queue.push({
            vector,
            data
        });
    }

    // =====================================
    // Process Interrupt Queue
    // =====================================

    process() {

        if(!this.enabled) {
            return;
        }

        if(this.queue.length === 0) {
            return;
        }

        const intr =
            this.queue.shift();

        this.handle(
            intr.vector,
            intr.data
        );
    }

    // =====================================
    // Handle Interrupt
    // =====================================

    handle(vector, data = {}) {

        console.log(
            "INT",
            vector
        );

        // Push RIP
        this.cpu.push64(
            this.cpu.rip
        );

        // Push FLAGS
        this.cpu.push64(
            BigInt(
                this.packFlags()
            )
        );

        const handler =
            this.idt[vector];

        if(handler) {

            try {

                handler(
                    this.cpu,
                    data
                );

            } catch(err) {

                console.error(
                    "Interrupt Handler Error:",
                    err
                );

                this.exception(
                    13
                );
            }

        } else {

            console.warn(
                "Unhandled Interrupt:",
                vector
            );

            if(vector < 32) {

                this.exception(vector);
            }
        }
    }

    // =====================================
    // CPU Exception
    // =====================================

    exception(vector) {

        const name =
            this.exceptionNames[vector]
            || "Unknown Exception";

        console.error(
            "CPU Exception:",
            vector,
            name
        );

        // Triple Fault Simulation
        if(vector === 8) {

            console.error(
                "TRIPLE FAULT"
            );

            this.cpu.halted = true;

            return;
        }

        // Invalid Opcode Example
        if(vector === 6) {

            console.error(
                "Invalid instruction at RIP:",
                this.cpu.rip.toString(16)
            );
        }

        // Page Fault Example
        if(vector === 14) {

            console.error(
                "Page Fault"
            );
        }

        this.cpu.halted = true;
    }

    // =====================================
    // IRQ
    // =====================================

    irq(number, data = {}) {

        if(number < 0 || number > 15) {

            throw new Error(
                "Invalid IRQ"
            );
        }

        if(this.irqMask[number]) {

            console.log(
                "IRQ Masked:",
                number
            );

            return;
        }

        // PIC Mapping
        const vector =
            number < 8
            ? 32 + number
            : 40 + (number - 8);

        this.interrupt(
            vector,
            data
        );
    }

    // =====================================
    // Mask IRQ
    // =====================================

    maskIRQ(number) {

        this.irqMask[number] = true;
    }

    // =====================================
    // Unmask IRQ
    // =====================================

    unmaskIRQ(number) {

        this.irqMask[number] = false;
    }

    // =====================================
    // Pack FLAGS
    // =====================================

    packFlags() {

        let flags = 0;

        if(this.cpu.flags.zf) {
            flags |= (1 << 6);
        }

        if(this.cpu.flags.sf) {
            flags |= (1 << 7);
        }

        if(this.cpu.flags.cf) {
            flags |= (1 << 0);
        }

        if(this.cpu.flags.of) {
            flags |= (1 << 11);
        }

        return flags;
    }

    // =====================================
    // IRET
    // =====================================

    iret() {

        const flags =
            this.cpu.pop64();

        const rip =
            this.cpu.pop64();

        this.unpackFlags(
            Number(flags)
        );

        this.cpu.rip = rip;
    }

    // =====================================
    // Unpack FLAGS
    // =====================================

    unpackFlags(flags) {

        this.cpu.flags.cf =
            !!(flags & (1 << 0));

        this.cpu.flags.zf =
            !!(flags & (1 << 6));

        this.cpu.flags.sf =
            !!(flags & (1 << 7));

        this.cpu.flags.of =
            !!(flags & (1 << 11));
    }

    // =====================================
    // Timer Tick
    // =====================================

    tick() {

        // IRQ0 = Timer

        this.irq(0);
    }

    // =====================================
    // Keyboard Interrupt
    // =====================================

    keyboard(scancode) {

        // IRQ1 = Keyboard

        this.irq(1, {
            scancode
        });
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            enabled:
                this.enabled,

            pending:
                this.queue.length,

            handlers:
                this.idt.filter(
                    x => x
                ).length
        };
    }
}