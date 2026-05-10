// bios.js
// Simple Virtual BIOS

class BIOS {

    constructor(cpu, ram, disk) {

        this.cpu = cpu;
        this.ram = ram;
        this.disk = disk;

        this.bootAddress = 0x7C00;

        this.bootDrive = 0x80;

        console.log("BIOS Ready");
    }

    // =====================================
    // POST
    // =====================================

    post() {

        console.log("==== JS BIOS ====");
        console.log("Performing POST...");

        if(!this.cpu) {
            throw new Error("CPU Missing");
        }

        if(!this.ram) {
            throw new Error("RAM Missing");
        }

        if(!this.disk) {
            throw new Error("Disk Missing");
        }

        console.log("CPU OK");
        console.log("RAM OK");
        console.log("DISK OK");

        console.log("POST Complete");
    }

    // =====================================
    // Boot Sector Load
    // =====================================

    loadBootSector() {

        console.log(
            "Loading boot sector..."
        );

        const sector =
            this.disk.readSector(0);

        for(
            let i = 0;
            i < sector.length;
            i++
        ) {

            this.cpu.mem[
                this.bootAddress + i
            ] = sector[i];
        }

        console.log(
            "Boot sector loaded"
        );
    }

    // =====================================
    // CPU Init
    // =====================================

    initializeCPU() {

        console.log(
            "Initializing CPU..."
        );

        this.cpu.rip =
            BigInt(this.bootAddress);

        this.cpu.rsp = 0x80000n;

        console.log(
            "RIP =",
            this.cpu.rip.toString(16)
        );
    }

    // =====================================
    // Boot
    // =====================================

    boot() {

        this.post();

        this.loadBootSector();

        this.initializeCPU();

        console.log("Booting...");

        this.cpu.run();
    }
}