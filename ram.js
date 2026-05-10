// ram.js
// 8GB Virtual RAM
// JavaScript Memory System

class RAM {

    constructor(sizeGB = 8) {

        // =========================
        // RAM SIZE
        // =========================

        this.size =
            sizeGB * 1024 * 1024 * 1024;

        // =========================
        // Allocate Memory
        // =========================

        console.log(
            "Allocating RAM:",
            sizeGB + "GB"
        );

        this.mem = new Uint8Array(this.size);

        console.log(
            "RAM Ready:",
            this.size,
            "bytes"
        );
    }

    // =====================================
    // Bounds Check
    // =====================================

    check(addr, bytes = 1) {

        if(addr < 0) {

            throw new Error(
                "Negative memory address"
            );
        }

        if(addr + bytes > this.size) {

            throw new Error(
                "Memory out of bounds: " +
                addr.toString(16)
            );
        }
    }

    // =====================================
    // Read
    // =====================================

    read8(addr) {

        this.check(addr, 1);

        return this.mem[addr];
    }

    read16(addr) {

        this.check(addr, 2);

        return (
            this.mem[addr] |
            (this.mem[addr + 1] << 8)
        );
    }

    read32(addr) {

        this.check(addr, 4);

        return (
            this.mem[addr] |
            (this.mem[addr + 1] << 8) |
            (this.mem[addr + 2] << 16) |
            (this.mem[addr + 3] << 24)
        ) >>> 0;
    }

    read64(addr) {

        this.check(addr, 8);

        let value = 0n;

        for(let i = 0; i < 8; i++) {

            value |= (
                BigInt(this.mem[addr + i])
                << BigInt(i * 8)
            );
        }

        return value;
    }

    // =====================================
    // Write
    // =====================================

    write8(addr, value) {

        this.check(addr, 1);

        this.mem[addr] =
            Number(value & 0xFF);
    }

    write16(addr, value) {

        this.check(addr, 2);

        this.mem[addr] =
            value & 0xFF;

        this.mem[addr + 1] =
            (value >> 8) & 0xFF;
    }

    write32(addr, value) {

        this.check(addr, 4);

        this.mem[addr] =
            value & 0xFF;

        this.mem[addr + 1] =
            (value >> 8) & 0xFF;

        this.mem[addr + 2] =
            (value >> 16) & 0xFF;

        this.mem[addr + 3] =
            (value >> 24) & 0xFF;
    }

    write64(addr, value) {

        this.check(addr, 8);

        for(let i = 0; i < 8; i++) {

            this.mem[addr + i] =
                Number(
                    (value >> BigInt(i * 8))
                    & 0xFFn
                );
        }
    }

    // =====================================
    // Block Copy
    // =====================================

    copy(from, to, length) {

        this.check(from, length);
        this.check(to, length);

        this.mem.copyWithin(
            to,
            from,
            from + length
        );
    }

    // =====================================
    // Fill
    // =====================================

    fill(addr, length, value = 0) {

        this.check(addr, length);

        this.mem.fill(
            value,
            addr,
            addr + length
        );
    }

    // =====================================
    // Load Binary
    // =====================================

    loadBinary(addr, data) {

        this.check(addr, data.length);

        this.mem.set(data, addr);
    }

    // =====================================
    // Dump Memory
    // =====================================

    dump(addr, length = 128) {

        this.check(addr, length);

        let out = "";

        for(let i = 0; i < length; i++) {

            if(i % 16 === 0) {

                out +=
                    "\n" +
                    (addr + i)
                    .toString(16)
                    .padStart(8, "0")
                    + ": ";
            }

            out +=
                this.mem[addr + i]
                .toString(16)
                .padStart(2, "0")
                + " ";
        }

        console.log(out);
    }

    // =====================================
    // Clear RAM
    // =====================================

    clear() {

        this.mem.fill(0);

        console.log("RAM Cleared");
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            sizeBytes: this.size,

            sizeGB:
                this.size /
                1024 /
                1024 /
                1024,

            usedApprox:
                this.mem.length
        };
    }
}

// =========================================
// Example
// =========================================

const ram = new RAM(8);

// Write

ram.write64(
    0x1000,
    0x123456789ABCDEFFn
);

// Read

console.log(
    ram.read64(0x1000)
    .toString(16)
);

// Dump

ram.dump(0x1000, 32);