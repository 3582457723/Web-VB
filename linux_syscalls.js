// linux_syscalls.js
// Linux x86-64 Syscall Layer for Web-VB

class LinuxSyscalls {

    constructor(kernel) {

        this.kernel = kernel;

        // =====================================
        // File descriptors
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
        // Syscall table
        // =====================================

        this.table = {

            // =====================================
            // IO
            // =====================================

            0:  this.read.bind(this),
            1:  this.write.bind(this),
            2:  this.open.bind(this),
            3:  this.close.bind(this),

            // =====================================
            // Memory
            // =====================================

            9:  this.mmap.bind(this),
            11: this.munmap.bind(this),
            12: this.brk.bind(this),

            // =====================================
            // Process
            // =====================================

            39: this.getpid.bind(this),
            57: this.fork.bind(this),
            59: this.execve.bind(this),
            60: this.exit.bind(this),
            61: this.wait4.bind(this),

            // =====================================
            // Signals
            // =====================================

            62: this.kill.bind(this),

            // =====================================
            // System
            // =====================================

            63: this.uname.bind(this),

            // =====================================
            // FileSystem
            // =====================================

            80: this.chdir.bind(this),

            // =====================================
            // Time
            // =====================================

            35: this.nanosleep.bind(this),

            // =====================================
            // Network
            // =====================================

            41: this.socket.bind(this),
            42: this.connect.bind(this),
            44: this.sendto.bind(this),
            45: this.recvfrom.bind(this),

            // =====================================
            // Futex
            // =====================================

            202: this.futex.bind(this),

            // =====================================
            // epoll
            // =====================================

            213: this.epoll_create.bind(this),

            // =====================================
            // arch_prctl
            // =====================================

            158: this.arch_prctl.bind(this)
        };

        console.log(
            "Linux Syscalls Ready"
        );
    }

    // =====================================
    // Main syscall handler
    // =====================================

    syscall(
        number,
        args = []
    ) {

        const fn =
            this.table[number];

        if(!fn) {

            console.error(

                `[SYSCALL] Unknown ${number}`
            );

            return -38; // ENOSYS
        }

        try {

            return fn(...args);

        } catch(e) {

            console.error(
                e
            );

            return -1;
        }
    }

    // =====================================
    // read
    // syscall: 0
    // =====================================

    read(
        fd,
        buffer,
        count
    ) {

        console.log(

            `[read] fd=${fd}`
        );

        return 0;
    }

    // =====================================
    // write
    // syscall: 1
    // =====================================

    write(
        fd,
        buffer,
        count
    ) {

        let text = "";

        if(
            typeof buffer === "string"
        ) {

            text = buffer;

        } else {

            text =
                String(buffer);
        }

        // stdout
        if(fd === 1) {

            console.log(text);
        }

        // stderr
        if(fd === 2) {

            console.error(text);
        }

        return count;
    }

    // =====================================
    // open
    // syscall: 2
    // =====================================

    open(
        path,
        flags,
        mode
    ) {

        console.log(

            `[open] ${path}`
        );

        const fd =
            this.nextFD++;

        this.fdTable[fd] = {

            path,
            flags,
            mode,
            pos: 0
        };

        return fd;
    }

    // =====================================
    // close
    // syscall: 3
    // =====================================

    close(fd) {

        delete this.fdTable[fd];

        return 0;
    }

    // =====================================
    // mmap
    // syscall: 9
    // =====================================

    mmap(
        addr,
        length,
        prot,
        flags,
        fd,
        offset
    ) {

        console.log(

            `[mmap] ${length} bytes`
        );

        const ptr =
            this.kernel.kmalloc(
                length
            );

        return ptr.addr;
    }

    // =====================================
    // munmap
    // syscall: 11
    // =====================================

    munmap(
        addr,
        length
    ) {

        console.log(
            `[munmap] ${addr}`
        );

        return 0;
    }

    // =====================================
    // brk
    // syscall: 12
    // =====================================

    brk(addr) {

        return addr;
    }

    // =====================================
    // getpid
    // syscall: 39
    // =====================================

    getpid() {

        return 1;
    }

    // =====================================
    // fork
    // syscall: 57
    // =====================================

    fork() {

        console.log(
            "[fork]"
        );

        return Math.floor(
            Math.random() * 1000
        );
    }

    // =====================================
    // execve
    // syscall: 59
    // =====================================

    execve(
        path,
        argv,
        envp
    ) {

        console.log(

            `[execve] ${path}`
        );

        return this.kernel.exec(
            path,
            argv
        );
    }

    // =====================================
    // exit
    // syscall: 60
    // =====================================

    exit(code) {

        console.log(

            `[exit] ${code}`
        );

        return 0;
    }

    // =====================================
    // wait4
    // syscall: 61
    // =====================================

    wait4(
        pid,
        status,
        options,
        rusage
    ) {

        return pid;
    }

    // =====================================
    // kill
    // syscall: 62
    // =====================================

    kill(
        pid,
        signal
    ) {

        console.log(

            `[kill] pid=${pid}`
        );

        this.kernel.kill(pid);

        return 0;
    }

    // =====================================
    // uname
    // syscall: 63
    // =====================================

    uname(buffer) {

        return {

            sysname:
                "Linux",

            nodename:
                "web-vb",

            release:
                "6.0.0-webvb",

            version:
                "#1 SMP",

            machine:
                "x86_64"
        };
    }

    // =====================================
    // chdir
    // syscall: 80
    // =====================================

    chdir(path) {

        console.log(

            `[chdir] ${path}`
        );

        return 0;
    }

    // =====================================
    // nanosleep
    // syscall: 35
    // =====================================

    nanosleep(
        sec,
        nsec
    ) {

        return 0;
    }

    // =====================================
    // socket
    // syscall: 41
    // =====================================

    socket(
        domain,
        type,
        protocol
    ) {

        const fd =
            this.nextFD++;

        this.fdTable[fd] = {

            type: "socket",

            domain,
            socketType: type,
            protocol
        };

        console.log(
            "[socket]"
        );

        return fd;
    }

    // =====================================
    // connect
    // syscall: 42
    // =====================================

    connect(
        fd,
        addr,
        addrlen
    ) {

        console.log(
            "[connect]"
        );

        return 0;
    }

    // =====================================
    // sendto
    // syscall: 44
    // =====================================

    sendto(
        fd,
        buf,
        len,
        flags,
        dest,
        addrlen
    ) {

        console.log(
            "[sendto]"
        );

        return len;
    }

    // =====================================
    // recvfrom
    // syscall: 45
    // =====================================

    recvfrom(
        fd,
        buf,
        len,
        flags,
        src,
        addrlen
    ) {

        console.log(
            "[recvfrom]"
        );

        return 0;
    }

    // =====================================
    // futex
    // syscall: 202
    // =====================================

    futex(
        uaddr,
        op,
        val,
        timeout
    ) {

        console.log(
            "[futex]"
        );

        return 0;
    }

    // =====================================
    // epoll_create
    // syscall: 213
    // =====================================

    epoll_create(size) {

        const fd =
            this.nextFD++;

        this.fdTable[fd] = {

            type: "epoll"
        };

        return fd;
    }

    // =====================================
    // arch_prctl
    // syscall: 158
    // =====================================

    arch_prctl(
        code,
        addr
    ) {

        console.log(
            "[arch_prctl]"
        );

        return 0;
    }
}