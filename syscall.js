// syscall.js
// Linux-like System Call Interface

class SyscallHandler {

    constructor(options = {}) {

        // =====================================
        // Core Components
        // =====================================

        this.cpu =
            options.cpu;

        this.mmu =
            options.mmu;

        this.fs =
            options.fs;

        this.scheduler =
            options.scheduler;

        this.textmode =
            options.textmode;

        this.network =
            options.network;

        // =====================================
        // Syscall Table
        // =====================================

        this.syscalls = {};

        // =====================================
        // File Descriptors
        // =====================================

        this.fdTable = {

            0: {
                type: "stdin"
            },

            1: {
                type: "stdout"
            },

            2: {
                type: "stderr"
            }
        };

        this.nextFD = 3;

        // =====================================
        // Register Builtins
        // =====================================

        this.registerBuiltins();

        console.log(
            "Syscall Handler Ready"
        );
    }

    // =====================================
    // Register Syscall
    // =====================================

    register(number, name, fn) {

        this.syscalls[number] = {

            name,
            fn
        };

        console.log(
            "SYSCALL",
            number,
            name
        );
    }

    // =====================================
    // Execute Syscall
    // =====================================

    syscall(
        number,
        args = []
    ) {

        const entry =
            this.syscalls[number];

        if(!entry) {

            console.warn(

                "Unknown syscall:",
                number
            );

            return -1;
        }

        try {

            return entry.fn(...args);

        } catch(err) {

            console.error(

                "Syscall Error:",
                entry.name,
                err
            );

            return -1;
        }
    }

    // =====================================
    // Read String From Virtual Memory
    // =====================================

    readString(addr) {

        let str = "";

        while(true) {

            const c =
                this.mmu.read8(addr++);

            if(c === 0) {
                break;
            }

            str +=
                String.fromCharCode(c);
        }

        return str;
    }

    // =====================================
    // Read Buffer
    // =====================================

    readBuffer(addr, size) {

        const data =
            new Uint8Array(size);

        for(
            let i = 0;
            i < size;
            i++
        ) {

            data[i] =
                this.mmu.read8(
                    addr + i
                );
        }

        return data;
    }

    // =====================================
    // Write Buffer
    // =====================================

    writeBuffer(addr, data) {

        for(
            let i = 0;
            i < data.length;
            i++
        ) {

            this.mmu.write8(

                addr + i,

                data[i]
            );
        }
    }

    // =====================================
    // Builtin Syscalls
    // =====================================

    registerBuiltins() {

        // =====================================
        // exit
        // syscall 60
        // =====================================

        this.register(

            60,

            "exit",

            code => {

                const task =
                    this.scheduler.current;

                if(task) {

                    task.terminate(code);
                }

                return 0;
            }
        );

        // =====================================
        // write
        // syscall 1
        // =====================================

        this.register(

            1,

            "write",

            (
                fd,
                buffer,
                count
            ) => {

                const bytes =
                    this.readBuffer(
                        buffer,
                        count
                    );

                let text = "";

                for(
                    const b
                    of bytes
                ) {

                    text +=
                        String
                        .fromCharCode(b);
                }

                // stdout
                if(fd === 1) {

                    this.textmode
                    .print(text);
                }

                // stderr
                if(fd === 2) {

                    this.textmode
                    .print(
                        "[ERR] " + text,
                        12
                    );
                }

                return count;
            }
        );

        // =====================================
        // open
        // syscall 2
        // =====================================

        this.register(

            2,

            "open",

            (
                pathnameAddr,
                flags
            ) => {

                const path =
                    this.readString(
                        pathnameAddr
                    );

                const fd =
                    this.nextFD++;

                this.fdTable[fd] = {

                    type: "file",

                    path,

                    flags,

                    offset: 0
                };

                console.log(
                    "OPEN",
                    path
                );

                return fd;
            }
        );

        // =====================================
        // read
        // syscall 0
        // =====================================

        this.register(

            0,

            "read",

            (
                fd,
                buffer,
                count
            ) => {

                const file =
                    this.fdTable[fd];

                if(!file) {

                    return -1;
                }

                if(
                    file.type !== "file"
                ) {

                    return -1;
                }

                const content =
                    this.fs.readFile(
                        file.path
                    );

                const encoder =
                    new TextEncoder();

                const data =
                    encoder.encode(
                        content
                    );

                const slice =
                    data.slice(

                        file.offset,

                        file.offset
                        + count
                    );

                this.writeBuffer(
                    buffer,
                    slice
                );

                file.offset +=
                    slice.length;

                return slice.length;
            }
        );

        // =====================================
        // close
        // syscall 3
        // =====================================

        this.register(

            3,

            "close",

            fd => {

                delete this.fdTable[fd];

                return 0;
            }
        );

        // =====================================
        // getpid
        // syscall 39
        // =====================================

        this.register(

            39,

            "getpid",

            () => {

                const task =
                    this.scheduler.current;

                return task
                    ? task.pid
                    : 0;
            }
        );

        // =====================================
        // sleep
        // syscall 35
        // =====================================

        this.register(

            35,

            "sleep",

            seconds => {

                const task =
                    this.scheduler.current;

                if(task) {

                    task.sleep(
                        seconds * 1000
                    );
                }

                return 0;
            }
        );

        // =====================================
        // mkdir
        // syscall 83
        // =====================================

        this.register(

            83,

            "mkdir",

            (
                pathAddr
            ) => {

                const path =
                    this.readString(
                        pathAddr
                    );

                this.fs.mkdir(path);

                return 0;
            }
        );

        // =====================================
        // unlink
        // syscall 87
        // =====================================

        this.register(

            87,

            "unlink",

            (
                pathAddr
            ) => {

                const path =
                    this.readString(
                        pathAddr
                    );

                this.fs.deleteFile(
                    path
                );

                return 0;
            }
        );

        // =====================================
        // reboot
        // syscall 169
        // =====================================

        this.register(

            169,

            "reboot",

            () => {

                location.reload();

                return 0;
            }
        );

        // =====================================
        // socket
        // syscall 41
        // =====================================

        this.register(

            41,

            "socket",

            (
                domain,
                type,
                protocol
            ) => {

                const fd =
                    this.nextFD++;

                this.fdTable[fd] = {

                    type: "socket",

                    domain,
                    socketType: type,
                    protocol
                };

                console.log(
                    "SOCKET",
                    fd
                );

                return fd;
            }
        );

        // =====================================
        // send
        // syscall 44
        // =====================================

        this.register(

            44,

            "send",

            (
                fd,
                buffer,
                size
            ) => {

                const socket =
                    this.fdTable[fd];

                if(!socket) {

                    return -1;
                }

                const data =
                    this.readBuffer(
                        buffer,
                        size
                    );

                this.network.send(
                    data
                );

                return size;
            }
        );

        // =====================================
        // uname
        // syscall 63
        // =====================================

        this.register(

            63,

            "uname",

            addr => {

                const text =
                    "JSVM Linux";

                const encoder =
                    new TextEncoder();

                const data =
                    encoder.encode(
                        text + "\0"
                    );

                this.writeBuffer(
                    addr,
                    data
                );

                return 0;
            }
        );
    }

    // =====================================
    // Trigger From CPU
    // =====================================

    handleCPUInterrupt() {

        // Linux x86_64 syscall ABI

        const number =
            this.cpu.registers.rax;

        const args = [

            this.cpu.registers.rdi,
            this.cpu.registers.rsi,
            this.cpu.registers.rdx,
            this.cpu.registers.r10,
            this.cpu.registers.r8,
            this.cpu.registers.r9
        ];

        const result =
            this.syscall(
                number,
                args
            );

        // Return value
        this.cpu.registers.rax =
            result;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            syscalls:
                Object.keys(
                    this.syscalls
                ).length,

            fds:
                Object.keys(
                    this.fdTable
                ).length
        };
    }
}