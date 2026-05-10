// libc.js
// Minimal C Standard Library
// Linux-like Userspace Runtime

class LibC {

    constructor(options = {}) {

        // =====================================
        // Core
        // =====================================

        this.syscall =
            options.syscall;

        this.mmu =
            options.mmu;

        this.processManager =
            options.processManager;

        // =====================================
        // Heap
        // =====================================

        this.heapBase =
            0x900000;

        this.heapTop =
            this.heapBase;

        // =====================================
        // errno
        // =====================================

        this.errno = 0;

        // =====================================
        // STDIO
        // =====================================

        this.stdin = 0;
        this.stdout = 1;
        this.stderr = 2;

        console.log(
            "LibC Ready"
        );
    }

    // =====================================
    // malloc
    // =====================================

    malloc(size) {

        const addr =
            this.heapTop;

        this.heapTop += size;

        console.log(

            "malloc",

            size,

            "->",

            "0x" +
            addr.toString(16)
        );

        return addr;
    }

    // =====================================
    // calloc
    // =====================================

    calloc(count, size) {

        const total =
            count * size;

        const addr =
            this.malloc(total);

        for(
            let i = 0;
            i < total;
            i++
        ) {

            this.mmu.write8(
                addr + i,
                0
            );
        }

        return addr;
    }

    // =====================================
    // free
    // =====================================

    free(addr) {

        console.log(
            "free",
            addr
        );

        // Simple allocator
        // no reuse yet
    }

    // =====================================
    // memcpy
    // =====================================

    memcpy(
        dest,
        src,
        size
    ) {

        for(
            let i = 0;
            i < size;
            i++
        ) {

            const byte =
                this.mmu.read8(
                    src + i
                );

            this.mmu.write8(
                dest + i,
                byte
            );
        }

        return dest;
    }

    // =====================================
    // memset
    // =====================================

    memset(
        dest,
        value,
        size
    ) {

        for(
            let i = 0;
            i < size;
            i++
        ) {

            this.mmu.write8(
                dest + i,
                value
            );
        }

        return dest;
    }

    // =====================================
    // strcmp
    // =====================================

    strcmp(aAddr, bAddr) {

        let i = 0;

        while(true) {

            const a =
                this.mmu.read8(
                    aAddr + i
                );

            const b =
                this.mmu.read8(
                    bAddr + i
                );

            if(a !== b) {

                return a - b;
            }

            if(a === 0) {

                return 0;
            }

            i++;
        }
    }

    // =====================================
    // strlen
    // =====================================

    strlen(addr) {

        let len = 0;

        while(

            this.mmu.read8(
                addr + len
            ) !== 0
        ) {

            len++;
        }

        return len;
    }

    // =====================================
    // strcpy
    // =====================================

    strcpy(dest, src) {

        let i = 0;

        while(true) {

            const byte =
                this.mmu.read8(
                    src + i
                );

            this.mmu.write8(
                dest + i,
                byte
            );

            if(byte === 0) {

                break;
            }

            i++;
        }

        return dest;
    }

    // =====================================
    // strcat
    // =====================================

    strcat(dest, src) {

        const len =
            this.strlen(dest);

        this.strcpy(
            dest + len,
            src
        );

        return dest;
    }

    // =====================================
    // write
    // =====================================

    write(
        fd,
        addr,
        size
    ) {

        return this.syscall
        .syscall(

            1,

            [
                fd,
                addr,
                size
            ]
        );
    }

    // =====================================
    // puts
    // =====================================

    puts(text) {

        const encoder =
            new TextEncoder();

        const bytes =
            encoder.encode(
                text + "\n"
            );

        const addr =
            this.malloc(
                bytes.length
            );

        for(
            let i = 0;
            i < bytes.length;
            i++
        ) {

            this.mmu.write8(

                addr + i,

                bytes[i]
            );
        }

        return this.write(

            this.stdout,

            addr,

            bytes.length
        );
    }

    // =====================================
    // printf
    // =====================================

    printf(
        format,
        ...args
    ) {

        let index = 0;

        const text =
            format.replace(

                /%[sdx]/g,

                token => {

                    const arg =
                        args[index++];

                    switch(token) {

                        case "%d":
                            return Number(arg);

                        case "%x":
                            return Number(arg)
                            .toString(16);

                        case "%s":
                            return String(arg);

                        default:
                            return token;
                    }
                }
            );

        return this.puts(text);
    }

    // =====================================
    // open
    // =====================================

    open(
        pathAddr,
        flags = 0
    ) {

        return this.syscall
        .syscall(

            2,

            [
                pathAddr,
                flags
            ]
        );
    }

    // =====================================
    // read
    // =====================================

    read(
        fd,
        buffer,
        size
    ) {

        return this.syscall
        .syscall(

            0,

            [
                fd,
                buffer,
                size
            ]
        );
    }

    // =====================================
    // close
    // =====================================

    close(fd) {

        return this.syscall
        .syscall(

            3,

            [fd]
        );
    }

    // =====================================
    // sleep
    // =====================================

    sleep(seconds) {

        return this.syscall
        .syscall(

            35,

            [seconds]
        );
    }

    // =====================================
    // getpid
    // =====================================

    getpid() {

        return this.syscall
        .syscall(39);
    }

    // =====================================
    // fork
    // =====================================

    fork() {

        return this.processManager
        .fork();
    }

    // =====================================
    // exit
    // =====================================

    exit(code = 0) {

        return this.syscall
        .syscall(

            60,

            [code]
        );
    }

    // =====================================
    // reboot
    // =====================================

    reboot() {

        return this.syscall
        .syscall(169);
    }

    // =====================================
    // getenv
    // =====================================

    getenv(key) {

        const proc =
            this.processManager
            .current;

        if(!proc) {

            return null;
        }

        return proc.env[key]
            || null;
    }

    // =====================================
    // setenv
    // =====================================

    setenv(
        key,
        value
    ) {

        const proc =
            this.processManager
            .current;

        if(!proc) {

            return;
        }

        proc.env[key] =
            value;
    }

    // =====================================
    // atoi
    // =====================================

    atoi(addr) {

        let str = "";

        let i = 0;

        while(true) {

            const byte =
                this.mmu.read8(
                    addr + i
                );

            if(byte === 0) {

                break;
            }

            str +=
                String
                .fromCharCode(byte);

            i++;
        }

        return parseInt(str);
    }

    // =====================================
    // itoa
    // =====================================

    itoa(number) {

        return String(number);
    }

    // =====================================
    // strdup
    // =====================================

    strdup(addr) {

        const len =
            this.strlen(addr);

        const newAddr =
            this.malloc(
                len + 1
            );

        this.strcpy(
            newAddr,
            addr
        );

        return newAddr;
    }

    // =====================================
    // rand
    // =====================================

    rand() {

        return Math.floor(

            Math.random()
            * 0x7FFFFFFF
        );
    }

    // =====================================
    // srand
    // =====================================

    srand(seed) {

        console.log(
            "srand",
            seed
        );
    }

    // =====================================
    // abort
    // =====================================

    abort() {

        console.error(
            "Program Aborted"
        );

        this.exit(1);
    }

    // =====================================
    // perror
    // =====================================

    perror(text) {

        console.error(

            text,

            "errno",

            this.errno
        );
    }

    // =====================================
    // uname
    // =====================================

    uname() {

        const addr =
            this.malloc(64);

        this.syscall
        .syscall(

            63,

            [addr]
        );

        return addr;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            heapBase:
                "0x" +
                this.heapBase
                .toString(16),

            heapTop:
                "0x" +
                this.heapTop
                .toString(16),

            errno:
                this.errno
        };
    }
}