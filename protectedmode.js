// protectedmode.js
// x86 Protected Mode Emulator
// 32bit mode for Linux boot

class ProtectedMode {

    constructor(cpu, ram, gdt, idt, paging) {

        this.cpu = cpu;
        this.ram = ram;

        this.gdt = gdt;
        this.idt = idt;
        this.paging = paging;

        this.enabled = false;

        console.log(
            "Protected Mode Ready"
        );
    }

    // =====================================
    // Enter Protected Mode
    // =====================================

    enter() {

        // PE bit
        this.cpu.cr0 |= 0x1;

        this.enabled = true;

        // flat segments
        this.cpu.cs = this.gdt.kernelCode;
        this.cpu.ds = this.gdt.kernelData;
        this.cpu.es = this.gdt.kernelData;
        this.cpu.fs = this.gdt.kernelData;
        this.cpu.gs = this.gdt.kernelData;
        this.cpu.ss = this.gdt.kernelData;

        // 32bit stack
        this.cpu.esp = 0x800000;

        // protected mode entry
        this.cpu.eip = 0x00100000;

        console.log(
            "[PROTECTED MODE ENABLED]"
        );
    }

    // =====================================
    // Exit Protected Mode
    // =====================================

    exit() {

        this.cpu.cr0 &= ~0x1;

        this.enabled = false;

        console.log(
            "[PROTECTED MODE DISABLED]"
        );
    }

    // =====================================
    // Paging
    // =====================================

    enablePaging() {

        // PG bit
        this.cpu.cr0 |= 0x80000000;

        console.log(
            "[PAGING ENABLED]"
        );
    }

    disablePaging() {

        this.cpu.cr0 &= ~0x80000000;

        console.log(
            "[PAGING DISABLED]"
        );
    }

    // =====================================
    // PAE
    // =====================================

    enablePAE() {

        // CR4.PAE
        this.cpu.cr4 |= (1 << 5);

        console.log(
            "[PAE ENABLED]"
        );
    }

    // =====================================
    // Load CR3
    // =====================================

    loadCR3(addr) {

        this.cpu.cr3 = addr;

        console.log(

            `[CR3]
0x${addr.toString(16)}`
        );
    }

    // =====================================
    // Address Translation
    // =====================================

    translate(addr) {

        // paging off
        if(
            !(this.cpu.cr0 & 0x80000000)
        ) {

            return addr;
        }

        return this.paging.translate(
            this.cpu.cr3,
            addr
        );
    }

    // =====================================
    // Memory Access
    // =====================================

    read8(addr) {

        return this.ram.read8(
            this.translate(addr)
        );
    }

    read16(addr) {

        return this.ram.read16(
            this.translate(addr)
        );
    }

    read32(addr) {

        return this.ram.read32(
            this.translate(addr)
        );
    }

    write8(addr, value) {

        this.ram.write8(
            this.translate(addr),
            value
        );
    }

    write16(addr, value) {

        this.ram.write16(
            this.translate(addr),
            value
        );
    }

    write32(addr, value) {

        this.ram.write32(
            this.translate(addr),
            value
        );
    }

    // =====================================
    // Stack
    // =====================================

    push32(value) {

        this.cpu.esp -= 4;

        this.write32(
            this.cpu.esp,
            value
        );
    }

    pop32() {

        const value =
            this.read32(
                this.cpu.esp
            );

        this.cpu.esp += 4;

        return value;
    }

    // =====================================
    // Interrupt
    // =====================================

    interrupt(vector) {

        console.log(

            `[PMODE INT]
0x${vector.toString(16)}`
        );

        this.push32(
            this.cpu.eflags
        );

        this.push32(
            this.cpu.cs
        );

        this.push32(
            this.cpu.eip
        );

        this.idt.interrupt(
            vector
        );
    }

    // =====================================
    // IRET
    // =====================================

    iret() {

        this.cpu.eip =
            this.pop32();

        this.cpu.cs =
            this.pop32();

        this.cpu.eflags =
            this.pop32();

        console.log(
            "[IRET]"
        );
    }

    // =====================================
    // Far Jump
    // =====================================

    farJump(selector, offset) {

        this.cpu.cs = selector;
        this.cpu.eip = offset;

        console.log(

            `[FAR JMP]
${selector.toString(16)}:${offset.toString(16)}`
        );
    }

    // =====================================
    // Execute Step
    // =====================================

    step() {

        const opcode =
            this.read8(
                this.cpu.eip
            );

        this.cpu.eip++;

        switch(opcode) {

            // NOP
            case 0x90:

                break;

            // CLI
            case 0xFA:

                this.cpu.if = 0;

                break;

            // STI
            case 0xFB:

                this.cpu.if = 1;

                break;

            // HLT
            case 0xF4:

                this.cpu.halted = true;

                break;

            // INT imm8
            case 0xCD:

                const vector =
                    this.read8(
                        this.cpu.eip
                    );

                this.cpu.eip++;

                this.interrupt(
                    vector
                );

                break;

            // JMP rel32
            case 0xE9:

                const rel =
                    this.read32(
                        this.cpu.eip
                    );

                this.cpu.eip += 4;

                this.cpu.eip += rel;

                break;

            default:

                console.warn(

                    `[PMODE]
Unknown opcode
0x${opcode.toString(16)}`
                );
        }
    }

    // =====================================
    // Run
    // =====================================

    run(cycles = 1000000) {

        let count = 0;

        while(

            this.enabled
            &&
            !this.cpu.halted
            &&
            count < cycles
        ) {

            this.step();

            count++;
        }

        console.log(

            `[PMODE STOP]
cycles=${count}`
        );
    }

    // =====================================
    // Switch to Long Mode
    // =====================================

    enterLongMode() {

        // PAE required
        this.enablePAE();

        // Long mode enable
        this.cpu.efer |= (1 << 8);

        // paging
        this.enablePaging();

        this.cpu.longMode = true;

        console.log(
            "[LONG MODE READY]"
        );
    }

    // =====================================
    // Debug
    // =====================================

    dump() {

        return {

            eip:
                "0x"
                +
                this.cpu.eip.toString(16),

            esp:
                "0x"
                +
                this.cpu.esp.toString(16),

            cr0:
                "0x"
                +
                this.cpu.cr0.toString(16),

            cr3:
                "0x"
                +
                this.cpu.cr3.toString(16),

            cr4:
                "0x"
                +
                this.cpu.cr4.toString(16),

            paging:
                Boolean(
                    this.cpu.cr0
                    &
                    0x80000000
                ),

            pae:
                Boolean(
                    this.cpu.cr4
                    &
                    (1 << 5)
                )
        };
    }

    // =====================================
    // Linux Setup
    // =====================================

    setupLinuxBoot() {

        // Linux protected entry
        this.cpu.eip = 0x100000;

        // stack
        this.cpu.esp = 0x800000;

        // boot params
        this.cpu.esi = 0x9000;

        console.log(
            "[LINUX PMODE SETUP]"
        );
    }
}