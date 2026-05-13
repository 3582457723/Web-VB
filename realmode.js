// realmode.js
// x86 Real Mode Emulator
// For Linux Boot Compatibility

class RealMode {

    constructor(cpu, ram) {

        this.cpu = cpu;

        this.ram = ram;

        // =====================================
        // Real Mode State
        // =====================================

        this.enabled = true;

        // =====================================
        // 20-bit Address Space
        // =====================================

        this.MAX_ADDR = 0xFFFFF;

        // =====================================
        // BIOS Area
        // =====================================

        this.BIOS_START = 0xF0000;
        this.BIOS_ENTRY = 0xFFF0;

        // =====================================
        // Interrupt Vector Table
        // =====================================

        this.IVT_ADDR = 0x0000;

        console.log(
            "Real Mode Ready"
        );
    }

    // =====================================
    // Reset CPU
    // =====================================

    reset() {

        // =====================================
        // Reset Vector
        // =====================================

        this.cpu.cs  = 0xF000;
        this.cpu.ip  = 0xFFF0;

        this.cpu.ds  = 0;
        this.cpu.es  = 0;
        this.cpu.ss  = 0;

        this.cpu.fs  = 0;
        this.cpu.gs  = 0;

        this.cpu.sp  = 0x7C00;

        // =====================================
        // Flags
        // =====================================

        this.cpu.flags = {

            cf: 0,
            pf: 0,
            af: 0,
            zf: 0,
            sf: 0,
            tf: 0,
            if: 1,
            df: 0,
            of: 0
        };

        this.enabled = true;

        console.log(

            `[RESET]
CS:IP = ${this.hex(this.cpu.cs)}:${this.hex(this.cpu.ip)}`
        );
    }

    // =====================================
    // Segment:Offset -> Physical
    // =====================================

    physicalAddress(seg, off) {

        const addr =

            (
                (seg << 4)
                +
                off
            )
            &
            this.MAX_ADDR;

        return addr;
    }

    // =====================================
    // Fetch Address
    // =====================================

    getIP() {

        return this.physicalAddress(

            this.cpu.cs,

            this.cpu.ip
        );
    }

    // =====================================
    // Read
    // =====================================

    read8(seg, off) {

        return this.ram.read8(

            this.physicalAddress(
                seg,
                off
            )
        );
    }

    read16(seg, off) {

        return this.ram.read16(

            this.physicalAddress(
                seg,
                off
            )
        );
    }

    // =====================================
    // Write
    // =====================================

    write8(seg, off, value) {

        this.ram.write8(

            this.physicalAddress(
                seg,
                off
            ),

            value
        );
    }

    write16(seg, off, value) {

        this.ram.write16(

            this.physicalAddress(
                seg,
                off
            ),

            value
        );
    }

    // =====================================
    // Stack
    // =====================================

    push16(value) {

        this.cpu.sp =
            (this.cpu.sp - 2)
            & 0xFFFF;

        this.write16(

            this.cpu.ss,

            this.cpu.sp,

            value
        );
    }

    pop16() {

        const value =

            this.read16(

                this.cpu.ss,

                this.cpu.sp
            );

        this.cpu.sp =
            (this.cpu.sp + 2)
            & 0xFFFF;

        return value;
    }

    // =====================================
    // Fetch
    // =====================================

    fetch8() {

        const value =

            this.read8(

                this.cpu.cs,

                this.cpu.ip
            );

        this.cpu.ip =
            (this.cpu.ip + 1)
            & 0xFFFF;

        return value;
    }

    fetch16() {

        const value =

            this.read16(

                this.cpu.cs,

                this.cpu.ip
            );

        this.cpu.ip =
            (this.cpu.ip + 2)
            & 0xFFFF;

        return value;
    }

    // =====================================
    // Interrupt
    // =====================================

    interrupt(vector) {

        console.log(

            `[REALMODE INT]
0x${vector.toString(16)}`
        );

        // =====================================
        // Push FLAGS CS IP
        // =====================================

        this.push16(
            this.flagsToWord()
        );

        this.push16(
            this.cpu.cs
        );

        this.push16(
            this.cpu.ip
        );

        // =====================================
        // Load IVT
        // =====================================

        const addr =
            vector * 4;

        this.cpu.ip =
            this.ram.read16(addr);

        this.cpu.cs =
            this.ram.read16(addr + 2);
    }

    // =====================================
    // IRET
    // =====================================

    iret() {

        this.cpu.ip =
            this.pop16();

        this.cpu.cs =
            this.pop16();

        this.wordToFlags(
            this.pop16()
        );

        console.log(
            "[IRET]"
        );
    }

    // =====================================
    // FLAGS
    // =====================================

    flagsToWord() {

        const f =
            this.cpu.flags;

        let word = 0;

        word |= f.cf << 0;
        word |= f.pf << 2;
        word |= f.af << 4;
        word |= f.zf << 6;
        word |= f.sf << 7;
        word |= f.tf << 8;
        word |= f.if << 9;
        word |= f.df << 10;
        word |= f.of << 11;

        return word;
    }

    wordToFlags(word) {

        const f =
            this.cpu.flags;

        f.cf =
            (word >> 0) & 1;

        f.pf =
            (word >> 2) & 1;

        f.af =
            (word >> 4) & 1;

        f.zf =
            (word >> 6) & 1;

        f.sf =
            (word >> 7) & 1;

        f.tf =
            (word >> 8) & 1;

        f.if =
            (word >> 9) & 1;

        f.df =
            (word >> 10) & 1;

        f.of =
            (word >> 11) & 1;
    }

    // =====================================
    // Enable A20
    // =====================================

    enableA20() {

        this.MAX_ADDR =
            0xFFFFFFFF;

        console.log(
            "[A20 ENABLED]"
        );
    }

    // =====================================
    // Protected Mode
    // =====================================

    enterProtectedMode() {

        this.cpu.cr0 |= 1;

        this.enabled = false;

        console.log(
            "[ENTER PROTECTED MODE]"
        );
    }

    // =====================================
    // BIOS Boot Sector
    // =====================================

    loadBootSector(buffer) {

        const boot =
            new Uint8Array(buffer);

        for(
            let i = 0;
            i < 512;
            i++
        ) {

            this.ram.write8(

                0x7C00 + i,

                boot[i]
            );
        }

        // jump
        this.cpu.cs = 0x0000;
        this.cpu.ip = 0x7C00;

        console.log(
            "[BOOT SECTOR LOADED]"
        );
    }

    // =====================================
    // BIOS INT Services
    // =====================================

    biosInterrupt(vector) {

        switch(vector) {

            // =====================================
            // Video
            // =====================================

            case 0x10:

                this.int10();

                break;

            // =====================================
            // Disk
            // =====================================

            case 0x13:

                this.int13();

                break;

            // =====================================
            // Keyboard
            // =====================================

            case 0x16:

                this.int16();

                break;

            default:

                console.warn(

                    `[BIOS INT]
0x${vector.toString(16)}
not implemented`
                );
        }
    }

    // =====================================
    // INT10
    // =====================================

    int10() {

        const ah =
            (this.cpu.ax >> 8)
            & 0xFF;

        switch(ah) {

            // teletype output
            case 0x0E:

                const ch =
                    this.cpu.ax & 0xFF;

                process.stdout?.write?.(
                    String.fromCharCode(ch)
                );

                break;
        }
    }

    // =====================================
    // INT13
    // =====================================

    int13() {

        console.log(
            "[INT13 DISK]"
        );
    }

    // =====================================
    // INT16
    // =====================================

    int16() {

        console.log(
            "[INT16 KEYBOARD]"
        );
    }

    // =====================================
    // Execute Step
    // =====================================

    step() {

        const opcode =
            this.fetch8();

        switch(opcode) {

            // =====================================
            // NOP
            // =====================================

            case 0x90:

                break;

            // =====================================
            // CLI
            // =====================================

            case 0xFA:

                this.cpu.flags.if = 0;

                break;

            // =====================================
            // STI
            // =====================================

            case 0xFB:

                this.cpu.flags.if = 1;

                break;

            // =====================================
            // HLT
            // =====================================

            case 0xF4:

                this.cpu.halted = true;

                break;

            // =====================================
            // INT imm8
            // =====================================

            case 0xCD:

                const vector =
                    this.fetch8();

                this.biosInterrupt(
                    vector
                );

                break;

            // =====================================
            // JMP short
            // =====================================

            case 0xEB:

                const rel8 =
                    this.fetch8();

                this.cpu.ip +=
                    (
                        rel8 << 24
                    ) >> 24;

                break;

            default:

                console.warn(

                    `[REALMODE]
Unknown opcode
0x${opcode.toString(16)}`
                );
        }
    }

    // =====================================
    // Run
    // =====================================

    run(cycles = 100000) {

        let count = 0;

        while(

            !this.cpu.halted
            &&
            this.enabled
            &&
            count < cycles
        ) {

            this.step();

            count++;
        }

        console.log(

            `[REALMODE STOP]
cycles=${count}`
        );
    }

    // =====================================
    // Helpers
    // =====================================

    hex(v) {

        return "0x"
            +
            v.toString(16)
            .padStart(4, "0");
    }

    // =====================================
    // Debug
    // =====================================

    dump() {

        return {

            cs:
                this.hex(this.cpu.cs),

            ip:
                this.hex(this.cpu.ip),

            ds:
                this.hex(this.cpu.ds),

            es:
                this.hex(this.cpu.es),

            ss:
                this.hex(this.cpu.ss),

            sp:
                this.hex(this.cpu.sp),

            addr:
                "0x"
                +
                this.getIP()
                .toString(16)
        };
    }
}