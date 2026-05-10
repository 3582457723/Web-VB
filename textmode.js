// textmode.js
// VGA Text Mode 80x25

class VGATextMode {

    constructor(options = {}) {

        // =====================================
        // Resolution
        // =====================================

        this.cols = 80;
        this.rows = 25;

        // =====================================
        // Video Memory
        // =====================================

        this.vram =
            new Array(
                this.cols * this.rows
            );

        // =====================================
        // Cursor
        // =====================================

        this.cursorX = 0;
        this.cursorY = 0;

        // =====================================
        // Default Colors
        // =====================================

        this.fg = 15;
        this.bg = 0;

        // =====================================
        // Canvas
        // =====================================

        this.canvas =
            options.canvas;

        this.ctx =
            this.canvas.getContext("2d");

        // =====================================
        // Font
        // =====================================

        this.fontWidth = 9;
        this.fontHeight = 16;

        // =====================================
        // VGA Palette
        // =====================================

        this.palette = [

            "#000000",
            "#0000AA",
            "#00AA00",
            "#00AAAA",
            "#AA0000",
            "#AA00AA",
            "#AA5500",
            "#AAAAAA",

            "#555555",
            "#5555FF",
            "#55FF55",
            "#55FFFF",
            "#FF5555",
            "#FF55FF",
            "#FFFF55",
            "#FFFFFF"
        ];

        // =====================================
        // Canvas Size
        // =====================================

        this.canvas.width =
            this.cols * this.fontWidth;

        this.canvas.height =
            this.rows * this.fontHeight;

        // =====================================
        // Font Setup
        // =====================================

        this.ctx.font =
            `${this.fontHeight}px monospace`;

        this.ctx.textBaseline =
            "top";

        // =====================================
        // Initialize
        // =====================================

        this.clear();

        console.log(
            "VGA Text Mode Ready"
        );
    }

    // =====================================
    // Clear Screen
    // =====================================

    clear() {

        for(
            let i = 0;
            i < this.vram.length;
            i++
        ) {

            this.vram[i] = {

                char: " ",
                fg: this.fg,
                bg: this.bg
            };
        }

        this.cursorX = 0;
        this.cursorY = 0;

        this.render();
    }

    // =====================================
    // Put Character
    // =====================================

    putChar(
        char,
        fg = this.fg,
        bg = this.bg
    ) {

        // NEWLINE
        if(char === "\n") {

            this.cursorX = 0;
            this.cursorY++;

            if(
                this.cursorY >= this.rows
            ) {

                this.scroll();
            }

            return;
        }

        // BACKSPACE
        if(char === "\b") {

            if(this.cursorX > 0) {

                this.cursorX--;

                this.writeAt(
                    this.cursorX,
                    this.cursorY,
                    " ",
                    fg,
                    bg
                );
            }

            return;
        }

        this.writeAt(
            this.cursorX,
            this.cursorY,
            char,
            fg,
            bg
        );

        this.cursorX++;

        // LINE WRAP
        if(
            this.cursorX >= this.cols
        ) {

            this.cursorX = 0;
            this.cursorY++;
        }

        // SCROLL
        if(
            this.cursorY >= this.rows
        ) {

            this.scroll();
        }
    }

    // =====================================
    // Write At
    // =====================================

    writeAt(
        x,
        y,
        char,
        fg = this.fg,
        bg = this.bg
    ) {

        if(
            x < 0 ||
            y < 0 ||
            x >= this.cols ||
            y >= this.rows
        ) {

            return;
        }

        const index =
            y * this.cols + x;

        this.vram[index] = {

            char,
            fg,
            bg
        };

        this.renderCell(x, y);
    }

    // =====================================
    // Print Text
    // =====================================

    print(
        text,
        fg = this.fg,
        bg = this.bg
    ) {

        for(
            const char
            of text
        ) {

            this.putChar(
                char,
                fg,
                bg
            );
        }
    }

    // =====================================
    // Print Line
    // =====================================

    println(
        text = "",
        fg = this.fg,
        bg = this.bg
    ) {

        this.print(
            text + "\n",
            fg,
            bg
        );
    }

    // =====================================
    // Scroll
    // =====================================

    scroll() {

        for(
            let y = 1;
            y < this.rows;
            y++
        ) {

            for(
                let x = 0;
                x < this.cols;
                x++
            ) {

                const from =
                    y * this.cols + x;

                const to =
                    (y - 1)
                    * this.cols
                    + x;

                this.vram[to] =
                    this.vram[from];
            }
        }

        // Clear last line
        for(
            let x = 0;
            x < this.cols;
            x++
        ) {

            this.vram[
                (this.rows - 1)
                * this.cols
                + x
            ] = {

                char: " ",
                fg: this.fg,
                bg: this.bg
            };
        }

        this.cursorY =
            this.rows - 1;

        this.render();
    }

    // =====================================
    // Render Full Screen
    // =====================================

    render() {

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

                this.renderCell(x, y);
            }
        }

        this.renderCursor();
    }

    // =====================================
    // Render Cell
    // =====================================

    renderCell(x, y) {

        const index =
            y * this.cols + x;

        const cell =
            this.vram[index];

        const px =
            x * this.fontWidth;

        const py =
            y * this.fontHeight;

        // Background
        this.ctx.fillStyle =
            this.palette[cell.bg];

        this.ctx.fillRect(

            px,
            py,

            this.fontWidth,
            this.fontHeight
        );

        // Text
        this.ctx.fillStyle =
            this.palette[cell.fg];

        this.ctx.fillText(

            cell.char,

            px,
            py
        );
    }

    // =====================================
    // Render Cursor
    // =====================================

    renderCursor() {

        const px =
            this.cursorX
            * this.fontWidth;

        const py =
            this.cursorY
            * this.fontHeight;

        this.ctx.fillStyle =
            "#FFFFFF";

        this.ctx.fillRect(

            px,
            py + this.fontHeight - 2,

            this.fontWidth,
            2
        );
    }

    // =====================================
    // Set Colors
    // =====================================

    setColor(fg, bg) {

        this.fg = fg;
        this.bg = bg;
    }

    // =====================================
    // Move Cursor
    // =====================================

    moveCursor(x, y) {

        this.cursorX = Math.max(
            0,
            Math.min(
                this.cols - 1,
                x
            )
        );

        this.cursorY = Math.max(
            0,
            Math.min(
                this.rows - 1,
                y
            )
        );

        this.render();
    }

    // =====================================
    // Draw Box
    // =====================================

    box(
        x,
        y,
        w,
        h,
        fg = 15,
        bg = 0
    ) {

        for(
            let i = x;
            i < x + w;
            i++
        ) {

            this.writeAt(
                i,
                y,
                "-",
                fg,
                bg
            );

            this.writeAt(
                i,
                y + h - 1,
                "-",
                fg,
                bg
            );
        }

        for(
            let i = y;
            i < y + h;
            i++
        ) {

            this.writeAt(
                x,
                i,
                "|",
                fg,
                bg
            );

            this.writeAt(
                x + w - 1,
                i,
                "|",
                fg,
                bg
            );
        }

        this.writeAt(
            x,
            y,
            "+"
        );

        this.writeAt(
            x + w - 1,
            y,
            "+"
        );

        this.writeAt(
            x,
            y + h - 1,
            "+"
        );

        this.writeAt(
            x + w - 1,
            y + h - 1,
            "+"
        );
    }

    // =====================================
    // Boot Screen
    // =====================================

    bootScreen() {

        this.clear();

        this.setColor(15, 1);

        this.println(
            "JavaScript Virtual Machine"
        );

        this.setColor(10, 0);

        this.println(
            "Booting..."
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            mode:
                "80x25 VGA",

            cols:
                this.cols,

            rows:
                this.rows,

            cursorX:
                this.cursorX,

            cursorY:
                this.cursorY
        };
    }
}