// uefi.js
// Simple Virtual UEFI

class UEFI {

    constructor(cpu, ram, disk) {

        this.cpu = cpu;
        this.ram = ram;
        this.disk = disk;

        this.bootPath =
            "/EFI/BOOT/BOOTX64.EFI";

        this.secureBoot = false;

        console.log("UEFI Ready");
    }

    // =====================================
    // Firmware Init
    // =====================================

    initialize() {

        console.log(
            "Initializing UEFI..."
        );

        console.log(
            "Memory Map Ready"
        );

        console.log(
            "Boot Services Ready"
        );

        console.log(
            "Runtime Services Ready"
        );
    }

    // =====================================
    // EFI Loader
    // =====================================

    loadEFI() {

        console.log(
            "Loading EFI executable..."
        );

        const sector =
            this.disk.readSector(0);

        const loadAddr = 0x100000;

        for(
            let i = 0;
            i < sector.length;
            i++
        ) {

            this.cpu.mem[
                loadAddr + i
            ] = sector[i];
        }

        this.cpu.rip =
            BigInt(loadAddr);

        console.log(
            "EFI Loaded at",
            loadAddr.toString(16)
        );
    }

    // =====================================
    // Enable Secure Boot
    // =====================================

    enableSecureBoot() {

        this.secureBoot = true;

        console.log(
            "Secure Boot Enabled"
        );
    }

    // =====================================
    // Disable Secure Boot
    // =====================================

    disableSecureBoot() {

        this.secureBoot = false;

        console.log(
            "Secure Boot Disabled"
        );
    }

    // =====================================
    // Boot
    // =====================================

    boot() {

        this.initialize();

        this.loadEFI();

        console.log(
            "UEFI Booting..."
        );

        this.cpu.run();
    }
}