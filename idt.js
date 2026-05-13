// idt.js
// x86-64 Interrupt Descriptor Table
// For Web-VB Linux Compatibility

class IDT {

    constructor(cpu, pic, apic) {

        this.cpu = cpu;

        this.pic = pic;

        this.apic = apic;

        // =====================================
        // IDT Entries
        // =====================================

        this.entries = new Array(256);

        // =====================================
        // IDTR
        // =====================================

        this.idtr = {

            base: 0,
            limit: 0
        };

        // =====================================
        // Gate Types
        // =====================================

        this.INTERRUPT_GATE = 0x8E;
        this.TRAP_GATE      = 0x8F;

        // =====================================
        // ISR Table
        // =====================================

        this.handlers = {};

        console.log(
            "IDT Ready"
        );
    }

    // =====================================
    // Create Descriptor
    // =====================================

    createEntry(

        offset,
        selector,
        typeAttr
    ) {

        return {

            offsetLow:
                offset & 0xFFFF,

            selector,

            ist: 0,

            typeAttr,

            offsetMid:
                (offset >> 16)
                & 0xFFFF,

            offsetHigh:
                (offset >> 32)
                & 0xFFFFFFFF,

            zero: 0
        };
    }

    // =====================================
    // Set Gate
    // =====================================

    setGate(

        vector,
        handler,
        type =
            this.INTERRUPT_GATE
    ) {

        const offset =
            handler.address
            ||
            0x100000
            +
            (vector * 0x100);

        this.entries[vector] =

            this.createEntry(

                offset,

                this.cpu.cs
                ||
                0x08,

                type
            );

        this.handlers[vector] =
            handler;

        console.log(

            `[IDT]
vector=${vector}
offset=0x${offset.toString(16)}`
        );
    }

    // =====================================
    // Initialize
    // =====================================

    init() {

        // =====================================
        // CPU Exceptions
        // =====================================

        this.installExceptions();

        // =====================================
        // Hardware IRQ
        // =====================================

        this.installIRQs();

        // =====================================
        // Syscall
        // =====================================

        this.installSyscall();

        // =====================================
        // Load
        // =====================================

        this.load();

        console.log(
            "x86-64 IDT Initialized"
        );
    }

    // =====================================
    // CPU Exceptions
    // =====================================

    installExceptions() {

        const exceptions = [

            "DE",
            "DB",
            "NMI",
            "BP",
            "OF",
            "BR",
            "UD",
            "NM",
            "DF",
            "CSO",
            "TS",
            "NP",
            "SS",
            "GP",
            "PF",
            "RES",
            "MF",
            "AC",
            "MC",
            "XM",
            "VE"
        ];

        for(
            let i = 0;
            i < exceptions.length;
            i++
        ) {

            this.setGate(

                i,

                () => {

                    this.exception(
                        i,
                        exceptions[i]
                    );
                }
            );
        }
    }

    // =====================================
    // IRQs
    // =====================================

    installIRQs() {

        for(
            let irq = 0;
            irq < 16;
            irq++
        ) {

            const vector =
                32 + irq;

            this.setGate(

                vector,

                () => {

                    this.irq(irq);
                }
            );
        }
    }

    // =====================================
    // Linux Syscall
    // int 0x80
    // =====================================

    installSyscall() {

        this.setGate(

            0x80,

            () => {

                this.syscall();
            },

            this.TRAP_GATE
        );
    }

    // =====================================
    // LIDT
    // =====================================

    load() {

        this.idtr.base =
            0x2000;

        this.idtr.limit =
            (256 * 16) - 1;

        console.log(

            `[LIDT]
BASE=0x${this.idtr.base.toString(16)}
LIMIT=0x${this.idtr.limit.toString(16)}`
        );
    }

    // =====================================
    // Trigger Interrupt
    // =====================================

    interrupt(vector) {

        const handler =
            this.handlers[vector];

        if(!handler) {

            console.error(

                `[INT]
Unhandled vector ${vector}`
            );

            return;
        }

        console.log(

            `[INTERRUPT]
vector=${vector}`
        );

        // =====================================
        // Push State
        // =====================================

        this.pushState();

        // =====================================
        // Execute
        // =====================================

        handler();

        // =====================================
        // Return
        // =====================================

        this.iretq();
    }

    // =====================================
    // Push CPU State
    // =====================================

    pushState() {

        this.cpu.stack.push({

            rip:
                this.cpu.rip,

            cs:
                this.cpu.cs,

            rflags:
                this.cpu.rflags,

            rsp:
                this.cpu.rsp,

            ss:
                this.cpu.ss
        });
    }

    // =====================================
    // IRETQ
    // =====================================

    iretq() {

        const state =
            this.cpu.stack.pop();

        if(!state) {

            return;
        }

        this.cpu.rip =
            state.rip;

        this.cpu.cs =
            state.cs;

        this.cpu.rflags =
            state.rflags;

        this.cpu.rsp =
            state.rsp;

        this.cpu.ss =
            state.ss;

        console.log(
            "[IRETQ]"
        );
    }

    // =====================================
    // Exceptions
    // =====================================

    exception(vector, name) {

        console.error(

            `[EXCEPTION]
${name}
vector=${vector}`
        );

        switch(vector) {

            // =====================================
            // Page Fault
            // =====================================

            case 14:

                this.pageFault();

                break;

            // =====================================
            // General Protection
            // =====================================

            case 13:

                this.generalProtection();

                break;

            // =====================================
            // Invalid Opcode
            // =====================================

            case 6:

                this.invalidOpcode();

                break;

            default:

                this.cpu.halted = true;
        }
    }

    // =====================================
    // Page Fault
    // =====================================

    pageFault() {

        console.error(
            "[PAGE FAULT]"
        );

        this.cpu.halted = true;
    }

    // =====================================
    // GP Fault
    // =====================================

    generalProtection() {

        console.error(
            "[GENERAL PROTECTION]"
        );

        this.cpu.halted = true;
    }

    // =====================================
    // Invalid Opcode
    // =====================================

    invalidOpcode() {

        console.error(
            "[INVALID OPCODE]"
        );

        this.cpu.halted = true;
    }

    // =====================================
    // IRQ
    // =====================================

    irq(irq) {

        console.log(

            `[IRQ ${irq}]`
        );

        switch(irq) {

            // Timer
            case 0:

                if(
                    this.cpu.scheduler
                ) {

                    this.cpu.scheduler
                    .tick();
                }

                break;

            // Keyboard
            case 1:

                if(
                    this.cpu.keyboard
                ) {

                    this.cpu.keyboard
                    .interrupt();
                }

                break;
        }

        // =====================================
        // EOI
        // =====================================

        if(this.apic) {

            this.apic.eoi();

        } else if(this.pic) {

            this.pic.eoi(irq);
        }
    }

    // =====================================
    // Linux Syscall
    // =====================================

    syscall() {

        const syscallNumber =
            this.cpu.rax;

        const args = [

            this.cpu.rdi,
            this.cpu.rsi,
            this.cpu.rdx,
            this.cpu.r10,
            this.cpu.r8,
            this.cpu.r9
        ];

        console.log(

            `[SYSCALL]
${syscallNumber}`
        );

        if(
            this.cpu.linux
        ) {

            const ret =
                this.cpu.linux
                .syscall(

                    syscallNumber,
                    args
                );

            this.cpu.rax = ret;
        }
    }

    // =====================================
    // Raise IRQ
    // =====================================

    raiseIRQ(irq) {

        this.interrupt(
            32 + irq
        );
    }

    // =====================================
    // Raise Exception
    // =====================================

    raiseException(vector) {

        this.interrupt(
            vector
        );
    }

    // =====================================
    // Dump Entry
    // =====================================

    dump(vector) {

        return this.entries[
            vector
        ];
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            entries:
                this.entries.length,

            idtr:
                this.idtr,

            syscall:
                Boolean(
                    this.handlers[0x80]
                )
        };
    }
}