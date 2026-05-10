// terminal.js
// Linux-like Virtual Terminal Emulator

class Terminal {

    constructor(options = {}) {

        // =====================================
        // Canvas
        // =====================================

        this.canvas =
            options.canvas;

        this.ctx =
            this.canvas
            .getContext("2d");

        // =====================================
        // Font
        // =====================================

        this.fontSize = 16;

        this.fontFamily =
            "monospace";

        this.ctx.font =
            `${this.fontSize}px ${this.fontFamily}`;

        // =====================================
        // Grid
        // =====================================

        this.cols =
            options.cols || 80;

        this.rows =
            options.rows || 25;

        this.charWidth = 9;

        this.charHeight = 18;

        // =====================================
        // Cursor
        // =====================================

        this.cursorX = 0;
        this.cursorY = 0;

        this.cursorVisible =
            true;

        // =====================================
        // Colors
        // =====================================

        this.foreground =
            "#00FF00";

        this.background =
            "#000000";

        // =====================================
        // Screen Buffer
        // =====================================

        this.buffer = [];

        // =====================================
        // Input
        // =====================================

        this.inputBuffer = "";

        this.commandHistory = [];

        this.historyIndex = 0;

        // =====================================
        // Shell
        // =====================================

        this.shell =
            options.shell || null;

        // =====================================
        // Userspace
        // =====================================

        this.userspace =
            options.userspace;

        // =====================================
        // Keyboard
        // =====================================

        this.keyboard =
            options.keyboard;

        // =====================================
        // Cursor Blink
        // =====================================

        this.cursorInterval =
            null;

        // =====================================
        // Initialize
        // =====================================

        this.initBuffer();

        this.installKeyboard();

        this.startCursorBlink();

        this.clear();

        console.log(
            "Terminal Ready"
        );
    }

    // =====================================
    // Initialize Buffer
    // =====================================

    initBuffer() {

        for(
            let y = 0;
            y < this.rows;
            y++
        ) {

            const row = [];

            for(
                let x = 0;
                x < this.cols;
                x++
            ) {

                row.push({

                    char: " ",

                    fg:
                        this.foreground,

                    bg:
                        this.background
                });
            }

            this.buffer.push(row);
        }
    }

    // =====================================
    // Clear
    // =====================================

    clear() {

        this.ctx.fillStyle =
            this.background;

        this.ctx.fillRect(

            0,
            0,

            this.canvas.width,
            this.canvas.height
        );

        for(
            let y = 0;
            y < this.rows;
            y++
        ) {

            for(
                let x = 0;
                x < this.cols;
                x++
            ) {

                this.buffer[y][x] = {

                    char: " ",

                    fg:
                        this.foreground,

                    bg:
                        this.background
                };
            }
        }

        this.cursorX = 0;
        this.cursorY = 0;

        this.render();
    }

    // =====================================
    // Render
    // =====================================

    render() {

        this.ctx.fillStyle =
            this.background;

        this.ctx.fillRect(

            0,
            0,

            this.canvas.width,
            this.canvas.height
        );

        this.ctx.font =
            `${this.fontSize}px ${this.fontFamily}`;

        for(
            let y = 0;
            y < this.rows;
            y++
        ) {

            for(
                let x = 0;
                x < this.cols;
                x++
            ) {

                const cell =
                    this.buffer[y][x];

                // Background
                this.ctx.fillStyle =
                    cell.bg;

                this.ctx.fillRect(

                    x * this.charWidth,

                    y * this.charHeight,

                    this.charWidth,

                    this.charHeight
                );

                // Text
                this.ctx.fillStyle =
                    cell.fg;

                this.ctx.fillText(

                    cell.char,

                    x * this.charWidth,

                    (
                        y + 1
                    )
                    * this.charHeight
                    - 4
                );
            }
        }

        // Cursor
        if(
            this.cursorVisible
        ) {

            this.ctx.fillStyle =
                "#FFFFFF";

            this.ctx.fillRect(

                this.cursorX
                * this.charWidth,

                (
                    this.cursorY + 1
                )
                * this.charHeight
                - 2,

                this.charWidth,

                2
            );
        }
    }

    // =====================================
    // Put Character
    // =====================================

    putChar(
        char,
        fg = this.foreground
    ) {

        if(char === "\n") {

            this.newLine();

            return;
        }

        if(
            this.cursorX >=
            this.cols
        ) {

            this.newLine();
        }

        this.buffer
        [
            this.cursorY
        ]
        [
            this.cursorX
        ] = {

            char,
            fg,
            bg:
                this.background
        };

        this.cursorX++;

        this.render();
    }

    // =====================================
    // Print
    // =====================================

    print(
        text,
        fg = this.foreground
    ) {

        for(
            const char
            of text
        ) {

            this.putChar(
                char,
                fg
            );
        }
    }

    // =====================================
    // println
    // =====================================

    println(
        text = "",
        fg = this.foreground
    ) {

        this.print(
            text + "\n",
            fg
        );
    }

    // =====================================
    // New Line
    // =====================================

    newLine() {

        this.cursorX = 0;

        this.cursorY++;

        // Scroll
        if(
            this.cursorY >=
            this.rows
        ) {

            this.scroll();

            this.cursorY =
                this.rows - 1;
        }
    }

    // =====================================
    // Scroll
    // =====================================

    scroll() {

        this.buffer.shift();

        const row = [];

        for(
            let x = 0;
            x < this.cols;
            x++
        ) {

            row.push({

                char: " ",

                fg:
                    this.foreground,

                bg:
                    this.background
            });
        }

        this.buffer.push(row);
    }

    // =====================================
    // Backspace
    // =====================================

    backspace() {

        if(
            this.cursorX <= 0
        ) {

            return;
        }

        this.cursorX--;

        this.buffer
        [
            this.cursorY
        ]
        [
            this.cursorX
        ] = {

            char: " ",

            fg:
                this.foreground,

            bg:
                this.background
        };

        this.render();
    }

    // =====================================
    // Prompt
    // =====================================

    prompt() {

        this.print(
            "root@jslinux:~# ",
            "#00FFFF"
        );
    }

    // =====================================
    // Execute Command
    // =====================================

    execute(command) {

        command =
            command.trim();

        if(!command) {

            this.prompt();

            return;
        }

        this.commandHistory
        .push(command);

        this.historyIndex =
            this.commandHistory
            .length;

        const args =
            command.split(" ");

        const cmd =
            args[0];

        switch(cmd) {

            case "help":

                this.println(
                    "help clear echo ls ps reboot"
                );

                break;

            case "clear":

                this.clear();

                break;

            case "echo":

                this.println(
                    args
                    .slice(1)
                    .join(" ")
                );

                break;

            case "ps":

                if(
                    this.userspace
                ) {

                    this.userspace.ps();
                }

                break;

            case "reboot":

                location.reload();

                break;

            case "ls":

                this.println(

                    "/bin /dev /etc /home /root"

                );

                break;

            default:

                if(
                    this.userspace
                ) {

                    try {

                        this.userspace
                        .exec(cmd);

                    } catch(err) {

                        this.println(

                            "Command not found",

                            "#FF0000"
                        );
                    }

                } else {

                    this.println(

                        "Unknown command",

                        "#FF0000"
                    );
                }
        }

        this.prompt();
    }

    // =====================================
    // Keyboard Input
    // =====================================

    installKeyboard() {

        window.addEventListener(

            "keydown",

            e => {

                // Backspace
                if(
                    e.key ===
                    "Backspace"
                ) {

                    if(
                        this.inputBuffer
                        .length > 0
                    ) {

                        this.inputBuffer =

                            this.inputBuffer
                            .slice(0, -1);

                        this.backspace();
                    }

                    e.preventDefault();

                    return;
                }

                // Enter
                if(
                    e.key ===
                    "Enter"
                ) {

                    this.println();

                    this.execute(
                        this.inputBuffer
                    );

                    this.inputBuffer = "";

                    return;
                }

                // Arrow Up
                if(
                    e.key ===
                    "ArrowUp"
                ) {

                    if(
                        this.commandHistory
                        .length > 0
                    ) {

                        this.inputBuffer =
                            this.commandHistory
                            [
                                Math.max(
                                    0,

                                    --this.historyIndex
                                )
                            ];

                        this.redrawInput();
                    }

                    return;
                }

                // Arrow Down
                if(
                    e.key ===
                    "ArrowDown"
                ) {

                    if(
                        this.commandHistory
                        .length > 0
                    ) {

                        this.historyIndex =
                            Math.min(

                                this.commandHistory
                                .length - 1,

                                this.historyIndex + 1
                            );

                        this.inputBuffer =
                            this.commandHistory
                            [
                                this.historyIndex
                            ];

                        this.redrawInput();
                    }

                    return;
                }

                // Normal Char
                if(
                    e.key.length === 1
                ) {

                    this.inputBuffer +=
                        e.key;

                    this.putChar(
                        e.key
                    );
                }
            }
        );
    }

    // =====================================
    // Redraw Input
    // =====================================

    redrawInput() {

        while(
            this.cursorX > 17
        ) {

            this.backspace();
        }

        this.print(
            this.inputBuffer
        );
    }

    // =====================================
    // Cursor Blink
    // =====================================

    startCursorBlink() {

        this.cursorInterval =
            setInterval(() => {

                this.cursorVisible =
                    !this.cursorVisible;

                this.render();

            }, 500);
    }

    // =====================================
    // Stop Cursor Blink
    // =====================================

    stopCursorBlink() {

        clearInterval(
            this.cursorInterval
        );
    }

    // =====================================
    // Resize
    // =====================================

    resize(
        cols,
        rows
    ) {

        this.cols = cols;
        this.rows = rows;

        this.buffer = [];

        this.initBuffer();

        this.render();
    }

    // =====================================
    // ANSI Color
    // =====================================

    color(code) {

        const colors = {

            30: "#000000",
            31: "#FF0000",
            32: "#00FF00",
            33: "#FFFF00",
            34: "#0000FF",
            35: "#FF00FF",
            36: "#00FFFF",
            37: "#FFFFFF"
        };

        return colors[code]
            || this.foreground;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            cols:
                this.cols,

            rows:
                this.rows,

            cursorX:
                this.cursorX,

            cursorY:
                this.cursorY,

            history:
                this.commandHistory
                .length
        };
    }
}