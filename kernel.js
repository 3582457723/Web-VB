// kernel.js
// Web-VB Unified Kernel

class Kernel {

    constructor(options = {}) {

        // =====================================
        // Version
        // =====================================

        this.name =
            options.name
            || "WebVB Kernel";

        this.version =
            options.version
            || "0.1.0";

        // =====================================
        // Hardware
        // =====================================

        this.cpu =
            options.cpu;

        this.ram =
            options.ram;

        this.gpu =
            options.gpu;

        this.storage =
            options.storage;

        this.network =
            options.network;

        this.usb =
            options.usb;

        this.audio =
            options.audio;

        // =====================================
        // Core Systems
        // =====================================

        this.scheduler =
            options.scheduler;

        this.process =
            options.process;

        this.syscall =
            options.syscall;

        this.vfs =
            options.vfs;

        this.devfs =
            options.devfs;

        this.initramfs =
            options.initramfs;

        this.shell =
            options.shell;

        this.framebuffer =
            options.framebuffer;

        this.windowmanager =
            options.windowmanager;

        this.wayland =
            options.wayland;

        // =====================================
        // Runtime
        // =====================================

        this.running = false;

        this.booted = false;

        this.bootTime = 0;

        this.ticks = 0;

        // =====================================
        // Processes
        // =====================================

        this.processTable =
            [];

        this.nextPID = 1;

        // =====================================
        // IRQ
        // =====================================

        this.interruptQueue =
            [];

        // =====================================
        // Drivers
        // =====================================

        this.drivers = [];

        // =====================================
        // Modules
        // =====================================

        this.modules = [];

        // =====================================
        // Event Bus
        // =====================================

        this.events = {};

        // =====================================
        // Kernel Heap
        // =====================================

        this.heap = {

            used: 0,

            total:
                64
                *
                1024
                *
                1024
        };

        console.log(
            `${this.name} ${this.version}`
        );
    }

    // =====================================
    // Boot
    // =====================================

    boot() {

        if(this.booted) {

            return;
        }

        console.log(
            "[KERNEL] Booting..."
        );

        this.bootTime =
            Date.now();

        // =====================================
        // Initialize
        // =====================================

        this.initCPU();

        this.initMemory();

        this.initDevices();

        this.initFS();

        this.initDrivers();

        this.initNetwork();

        this.initDisplay();

        this.initUserspace();

        // =====================================
        // Start Scheduler
        // =====================================

        this.startScheduler();

        // =====================================
        // Start Init
        // =====================================

        this.exec("/sbin/init");

        this.running = true;

        this.booted = true;

        console.log(
            "[KERNEL] Boot Complete"
        );
    }

    // =====================================
    // CPU
    // =====================================

    initCPU() {

        if(!this.cpu) {

            return;
        }

        console.log(
            "[KERNEL] CPU Init"
        );

        this.cpu.start();
    }

    // =====================================
    // Memory
    // =====================================

    initMemory() {

        if(!this.ram) {

            return;
        }

        console.log(
            "[KERNEL] Memory Init"
        );

        console.log(

            `[RAM] ${
                this.ram.size
                /
                1024
                /
                1024
            } MB`
        );
    }

    // =====================================
    // Devices
    // =====================================

    initDevices() {

        console.log(
            "[KERNEL] Device Init"
        );

        // USB
        if(this.usb) {

            console.log(
                "[USB] Ready"
            );
        }

        // Audio
        if(this.audio) {

            console.log(
                "[AUDIO] Ready"
            );
        }

        // GPU
        if(this.gpu) {

            console.log(
                "[GPU] Ready"
            );
        }
    }

    // =====================================
    // FileSystem
    // =====================================

    initFS() {

        console.log(
            "[KERNEL] FileSystem Init"
        );

        if(this.vfs) {

            // Mount root
            this.vfs.mount(

                "/",

                this.initramfs
            );
        }

        if(this.devfs) {

            this.vfs.mount(

                "/dev",

                this.devfs
            );
        }
    }

    // =====================================
    // Drivers
    // =====================================

    initDrivers() {

        console.log(
            "[KERNEL] Driver Init"
        );

        for(
            const d
            of this.drivers
        ) {

            if(d.init) {

                d.init();
            }
        }
    }

    // =====================================
    // Network
    // =====================================

    initNetwork() {

        if(!this.network) {

            return;
        }

        console.log(
            "[KERNEL] Network Init"
        );

        this.network.enable();
    }

    // =====================================
    // Display
    // =====================================

    initDisplay() {

        console.log(
            "[KERNEL] Display Init"
        );

        if(this.framebuffer) {

            this.framebuffer.clear(
                0x000000
            );
        }

        if(this.wayland) {

            this.wayland.start();
        }
    }

    // =====================================
    // Userspace
    // =====================================

    initUserspace() {

        console.log(
            "[KERNEL] Userspace Init"
        );
    }

    // =====================================
    // Scheduler
    // =====================================

    startScheduler() {

        console.log(
            "[KERNEL] Scheduler Start"
        );

        setInterval(() => {

            this.tick();

        }, 1);
    }

    // =====================================
    // Tick
    // =====================================

    tick() {

        if(!this.running) {

            return;
        }

        this.ticks++;

        // Process Scheduler
        if(this.scheduler) {

            this.scheduler.tick();
        }

        // Interrupts
        this.handleInterrupts();
    }

    // =====================================
    // Interrupt
    // =====================================

    interrupt(
        irq,
        data = null
    ) {

        this.interruptQueue.push({

            irq,
            data
        });
    }

    // =====================================
    // Handle IRQ
    // =====================================

    handleInterrupts() {

        while(

            this.interruptQueue
            .length > 0
        ) {

            const irq =
                this.interruptQueue
                .shift();

            console.log(

                `[IRQ] ${irq.irq}`
            );

            this.emit(

                "interrupt",

                irq
            );
        }
    }

    // =====================================
    // Execute Process
    // =====================================

    exec(
        path,
        args = []
    ) {

        const pid =
            this.nextPID++;

        const proc = {

            pid,

            path,

            args,

            state:
                "running",

            started:
                Date.now()
        };

        this.processTable.push(
            proc
        );

        console.log(

            `[EXEC] PID=${pid} ${path}`
        );

        return pid;
    }

    // =====================================
    // Kill
    // =====================================

    kill(pid) {

        const index =
            this.processTable
            .findIndex(

                p =>
                p.pid === pid
            );

        if(index === -1) {

            return false;
        }

        this.processTable.splice(
            index,
            1
        );

        console.log(

            `[KILL] PID=${pid}`
        );

        return true;
    }

    // =====================================
    // Syscall
    // =====================================

    syscallCall(
        num,
        args = []
    ) {

        if(!this.syscall) {

            return -1;
        }

        return this.syscall
        .handle(
            num,
            args
        );
    }

    // =====================================
    // Memory Allocate
    // =====================================

    kmalloc(size) {

        this.heap.used += size;

        return {

            addr:
                Math.floor(
                    Math.random()
                    * 0xffffffff
                ),

            size
        };
    }

    // =====================================
    // Memory Free
    // =====================================

    kfree(ptr) {

        this.heap.used -=
            ptr.size;
    }

    // =====================================
    // Module Load
    // =====================================

    loadModule(module) {

        this.modules.push(
            module
        );

        if(module.init) {

            module.init(
                this
            );
        }

        console.log(
            "[MODULE] Loaded"
        );
    }

    // =====================================
    // Driver Register
    // =====================================

    registerDriver(driver) {

        this.drivers.push(
            driver
        );

        console.log(
            "[DRIVER] Registered"
        );
    }

    // =====================================
    // Event
    // =====================================

    on(
        event,
        callback
    ) {

        if(!this.events[event]) {

            this.events[event] = [];
        }

        this.events[event]
        .push(callback);
    }

    emit(
        event,
        data
    ) {

        const list =
            this.events[event];

        if(!list) {

            return;
        }

        for(
            const cb
            of list
        ) {

            cb(data);
        }
    }

    // =====================================
    // Panic
    // =====================================

    panic(msg) {

        console.error(

            `[KERNEL PANIC]
${msg}`
        );

        this.running = false;

        throw new Error(msg);
    }

    // =====================================
    // Shutdown
    // =====================================

    shutdown() {

        console.log(
            "[KERNEL] Shutdown"
        );

        this.running = false;

        if(this.cpu) {

            this.cpu.stop();
        }
    }

    // =====================================
    // Reboot
    // =====================================

    reboot() {

        console.log(
            "[KERNEL] Reboot"
        );

        this.shutdown();

        this.boot();
    }

    // =====================================
    // Uptime
    // =====================================

    uptime() {

        return Math.floor(

            (
                Date.now()
                -
                this.bootTime
            )
            /
            1000
        );
    }

    // =====================================
    // ps
    // =====================================

    ps() {

        return this.processTable;
    }

    // =====================================
    // top
    // =====================================

    top() {

        return {

            uptime:
                this.uptime(),

            processes:
                this.processTable
                .length,

            memoryUsed:
                this.heap.used,

            memoryTotal:
                this.heap.total,

            ticks:
                this.ticks
        };
    }

    // =====================================
    // dmesg
    // =====================================

    dmesg() {

        return [

            `${this.name}`,

            `uptime=${this.uptime()}`,

            `ticks=${this.ticks}`
        ];
    }
}