// shell.js
// Virtual Shell / Terminal

class VirtualShell {

    constructor(options = {}) {

        // =====================================
        // Components
        // =====================================

        this.fs =
            options.fs;

        this.keyboard =
            options.keyboard;

        this.cpu =
            options.cpu;

        this.mmu =
            options.mmu;

        this.timer =
            options.timer;

        this.pci =
            options.pci;

        // =====================================
        // Terminal
        // =====================================

        this.outputElement =
            options.outputElement
            || null;

        // =====================================
        // Shell State
        // =====================================

        this.running = false;

        this.prompt = "jsvm";

        this.hostname = "virtualpc";

        this.user = "root";

        this.currentLine = "";

        this.history = [];

        this.historyIndex = 0;

        // =====================================
        // Commands
        // =====================================

        this.commands = {};

        this.registerBuiltins();

        console.log(
            "Virtual Shell Ready"
        );
    }

    // =====================================
    // Start Shell
    // =====================================

    start() {

        if(this.running) {
            return;
        }

        this.running = true;

        this.println(
            "JavaScript Virtual Machine"
        );

        this.println(
            "Type 'help'"
        );

        this.newPrompt();

        window.addEventListener(
            "keydown",
            e => {

                this.handleKey(e);
            }
        );
    }

    // =====================================
    // Stop Shell
    // =====================================

    stop() {

        this.running = false;
    }

    // =====================================
    // Prompt
    // =====================================

    newPrompt() {

        this.print(

            `\n${this.user}@${this.hostname}:${this.fs.cwd}$ `
        );
    }

    // =====================================
    // Print
    // =====================================

    print(text) {

        if(this.outputElement) {

            this.outputElement.textContent += text;

            this.outputElement.scrollTop =
                this.outputElement.scrollHeight;

        } else {

            console.log(text);
        }
    }

    // =====================================
    // Println
    // =====================================

    println(text = "") {

        this.print(text + "\n");
    }

    // =====================================
    // Handle Keyboard
    // =====================================

    handleKey(event) {

        if(!this.running) {
            return;
        }

        // Ignore ctrl shortcuts
        if(event.ctrlKey) {
            return;
        }

        const key = event.key;

        // ENTER
        if(key === "Enter") {

            this.println();

            const cmd =
                this.currentLine;

            this.history.push(cmd);

            this.historyIndex =
                this.history.length;

            this.execute(cmd);

            this.currentLine = "";

            this.newPrompt();

            event.preventDefault();

            return;
        }

        // BACKSPACE
        if(key === "Backspace") {

            if(
                this.currentLine.length > 0
            ) {

                this.currentLine =
                    this.currentLine.slice(0, -1);

                if(this.outputElement) {

                    this.outputElement.textContent =
                        this.outputElement
                        .textContent
                        .slice(0, -1);
                }
            }

            event.preventDefault();

            return;
        }

        // ARROW UP
        if(key === "ArrowUp") {

            if(this.history.length > 0) {

                this.historyIndex =
                    Math.max(
                        0,
                        this.historyIndex - 1
                    );

                this.replaceLine(
                    this.history[
                        this.historyIndex
                    ]
                );
            }

            event.preventDefault();

            return;
        }

        // ARROW DOWN
        if(key === "ArrowDown") {

            if(this.history.length > 0) {

                this.historyIndex =
                    Math.min(
                        this.history.length,
                        this.historyIndex + 1
                    );

                this.replaceLine(

                    this.history[
                        this.historyIndex
                    ] || ""
                );
            }

            event.preventDefault();

            return;
        }

        // NORMAL CHARACTER
        if(
            key.length === 1
        ) {

            this.currentLine += key;

            this.print(key);

            event.preventDefault();
        }
    }

    // =====================================
    // Replace Current Input Line
    // =====================================

    replaceLine(text) {

        if(!this.outputElement) {
            return;
        }

        const lines =
            this.outputElement
            .textContent
            .split("\n");

        lines[
            lines.length - 1
        ] =
            `${this.user}@${this.hostname}:${this.fs.cwd}$ ${text}`;

        this.outputElement.textContent =
            lines.join("\n");

        this.currentLine = text;
    }

    // =====================================
    // Execute Command
    // =====================================

    execute(line) {

        const parts =
            line.trim().split(" ");

        const cmd =
            parts[0];

        const args =
            parts.slice(1);

        if(!cmd) {
            return;
        }

        const fn =
            this.commands[cmd];

        if(!fn) {

            this.println(
                "Command not found: " + cmd
            );

            return;
        }

        try {

            fn(args);

        } catch(err) {

            this.println(
                "ERROR: " + err.message
            );
        }
    }

    // =====================================
    // Register Command
    // =====================================

    register(name, fn) {

        this.commands[name] = fn;
    }

    // =====================================
    // Built-in Commands
    // =====================================

    registerBuiltins() {

        // HELP
        this.register("help", () => {

            this.println(
                Object.keys(
                    this.commands
                ).join(" ")
            );
        });

        // CLEAR
        this.register("clear", () => {

            if(this.outputElement) {

                this.outputElement.textContent = "";
            }
        });

        // ECHO
        this.register("echo", args => {

            this.println(
                args.join(" ")
            );
        });

        // LS
        this.register("ls", args => {

            const path =
                args[0] || this.fs.cwd;

            const list =
                this.fs.ls(path);

            for(
                const item of list
            ) {

                this.println(item);
            }
        });

        // CD
        this.register("cd", args => {

            const path =
                args[0];

            if(!path) {

                this.println(
                    this.fs.cwd
                );

                return;
            }

            this.fs.cd(path);
        });

        // CAT
        this.register("cat", args => {

            const path =
                args[0];

            if(!path) {

                this.println(
                    "Usage: cat file"
                );

                return;
            }

            this.println(
                this.fs.readFile(path)
            );
        });

        // TOUCH
        this.register("touch", args => {

            const path =
                args[0];

            this.fs.createFile(
                path,
                ""
            );
        });

        // WRITE
        this.register("write", args => {

            const file =
                args[0];

            const text =
                args.slice(1)
                .join(" ");

            this.fs.writeFile(
                file,
                text
            );
        });

        // RM
        this.register("rm", args => {

            this.fs.deleteFile(
                args[0]
            );
        });

        // MKDIR
        this.register("mkdir", args => {

            this.fs.mkdir(
                args[0]
            );
        });

        // TREE
        this.register("tree", () => {

            this.fs.tree();
        });

        // CPUINFO
        this.register("cpuinfo", () => {

            this.println(
                JSON.stringify(
                    this.cpu.info(),
                    null,
                    2
                )
            );
        });

        // MEMINFO
        this.register("meminfo", () => {

            this.println(
                JSON.stringify(
                    this.mmu.info(),
                    null,
                    2
                )
            );
        });

        // PCI
        this.register("pci", () => {

            for(
                const dev
                of this.pci.devices
            ) {

                this.println(
                    JSON.stringify(
                        dev.info(),
                        null,
                        2
                    )
                );
            }
        });

        // UPTIME
        this.register("uptime", () => {

            this.println(

                this.timer
                .uptimeSeconds()
                + "s"
            );
        });

        // REBOOT
        this.register("reboot", () => {

            location.reload();
        });

        // SHUTDOWN
        this.register("shutdown", () => {

            this.println(
                "System Halted"
            );

            this.stop();
        });
    }
}