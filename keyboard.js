// keyboard.js
// Virtual PS/2 Keyboard
// IRQ1 + Scancode + Key State

class VirtualKeyboard {

    constructor(interruptController) {

        // =====================================
        // Interrupt Controller
        // =====================================

        this.interrupts =
            interruptController;

        // =====================================
        // Key States
        // =====================================

        this.keys = {};

        // =====================================
        // Input Buffer
        // =====================================

        this.buffer = [];

        // =====================================
        // PS/2 Enabled
        // =====================================

        this.enabled = true;

        // =====================================
        // Keyboard Layout
        // =====================================

        this.layout = "US";

        // =====================================
        // Scancode Set 1
        // =====================================

        this.scancodeMap = {

            "Escape": 0x01,

            "Digit1": 0x02,
            "Digit2": 0x03,
            "Digit3": 0x04,
            "Digit4": 0x05,
            "Digit5": 0x06,
            "Digit6": 0x07,
            "Digit7": 0x08,
            "Digit8": 0x09,
            "Digit9": 0x0A,
            "Digit0": 0x0B,

            "Minus": 0x0C,
            "Equal": 0x0D,
            "Backspace": 0x0E,

            "Tab": 0x0F,

            "KeyQ": 0x10,
            "KeyW": 0x11,
            "KeyE": 0x12,
            "KeyR": 0x13,
            "KeyT": 0x14,
            "KeyY": 0x15,
            "KeyU": 0x16,
            "KeyI": 0x17,
            "KeyO": 0x18,
            "KeyP": 0x19,

            "BracketLeft": 0x1A,
            "BracketRight": 0x1B,

            "Enter": 0x1C,

            "ControlLeft": 0x1D,

            "KeyA": 0x1E,
            "KeyS": 0x1F,
            "KeyD": 0x20,
            "KeyF": 0x21,
            "KeyG": 0x22,
            "KeyH": 0x23,
            "KeyJ": 0x24,
            "KeyK": 0x25,
            "KeyL": 0x26,

            "Semicolon": 0x27,
            "Quote": 0x28,
            "Backquote": 0x29,

            "ShiftLeft": 0x2A,

            "Backslash": 0x2B,

            "KeyZ": 0x2C,
            "KeyX": 0x2D,
            "KeyC": 0x2E,
            "KeyV": 0x2F,
            "KeyB": 0x30,
            "KeyN": 0x31,
            "KeyM": 0x32,

            "Comma": 0x33,
            "Period": 0x34,
            "Slash": 0x35,

            "ShiftRight": 0x36,

            "AltLeft": 0x38,

            "Space": 0x39,

            "CapsLock": 0x3A,

            "F1": 0x3B,
            "F2": 0x3C,
            "F3": 0x3D,
            "F4": 0x3E,
            "F5": 0x3F,
            "F6": 0x40,
            "F7": 0x41,
            "F8": 0x42,
            "F9": 0x43,
            "F10": 0x44,

            "ArrowUp": 0x48,
            "ArrowLeft": 0x4B,
            "ArrowRight": 0x4D,
            "ArrowDown": 0x50
        };

        // =====================================
        // Setup
        // =====================================

        this.setup();

        console.log(
            "Virtual Keyboard Ready"
        );
    }

    // =====================================
    // Setup Browser Events
    // =====================================

    setup() {

        window.addEventListener(
            "keydown",
            e => {

                this.keyDown(e);
            }
        );

        window.addEventListener(
            "keyup",
            e => {

                this.keyUp(e);
            }
        );
    }

    // =====================================
    // Key Down
    // =====================================

    keyDown(event) {

        if(!this.enabled) {
            return;
        }

        const code =
            event.code;

        // Prevent repeat spam
        if(this.keys[code]) {
            return;
        }

        this.keys[code] = true;

        const scancode =
            this.scancodeMap[code];

        if(scancode === undefined) {

            console.warn(
                "Unknown key:",
                code
            );

            return;
        }

        // Push scancode
        this.buffer.push(scancode);

        // IRQ1
        if(this.interrupts) {

            this.interrupts.keyboard(
                scancode
            );
        }

        console.log(
            "KEY DOWN",
            code,
            scancode.toString(16)
        );

        event.preventDefault();
    }

    // =====================================
    // Key Up
    // =====================================

    keyUp(event) {

        if(!this.enabled) {
            return;
        }

        const code =
            event.code;

        this.keys[code] = false;

        const scancode =
            this.scancodeMap[code];

        if(scancode === undefined) {
            return;
        }

        // PS/2 break code
        const breakCode =
            scancode | 0x80;

        this.buffer.push(
            breakCode
        );

        // IRQ1
        if(this.interrupts) {

            this.interrupts.keyboard(
                breakCode
            );
        }

        console.log(
            "KEY UP",
            code,
            breakCode.toString(16)
        );

        event.preventDefault();
    }

    // =====================================
    // Read Scancode
    // =====================================

    readScancode() {

        if(
            this.buffer.length === 0
        ) {

            return null;
        }

        return this.buffer.shift();
    }

    // =====================================
    // Peek Buffer
    // =====================================

    peek() {

        return this.buffer[0] || null;
    }

    // =====================================
    // Clear Buffer
    // =====================================

    clearBuffer() {

        this.buffer = [];

        console.log(
            "Keyboard Buffer Cleared"
        );
    }

    // =====================================
    // Is Key Pressed
    // =====================================

    isPressed(code) {

        return !!this.keys[code];
    }

    // =====================================
    // Enable Keyboard
    // =====================================

    enable() {

        this.enabled = true;

        console.log(
            "Keyboard Enabled"
        );
    }

    // =====================================
    // Disable Keyboard
    // =====================================

    disable() {

        this.enabled = false;

        console.log(
            "Keyboard Disabled"
        );
    }

    // =====================================
    // Inject Key
    // =====================================

    inject(scancode) {

        this.buffer.push(scancode);

        if(this.interrupts) {

            this.interrupts.keyboard(
                scancode
            );
        }
    }

    // =====================================
    // Translate ASCII
    // =====================================

    ascii(scancode) {

        const asciiMap = {

            0x1E: "a",
            0x30: "b",
            0x2E: "c",
            0x20: "d",
            0x12: "e",
            0x21: "f",
            0x22: "g",
            0x23: "h",
            0x17: "i",
            0x24: "j",
            0x25: "k",
            0x26: "l",
            0x32: "m",
            0x31: "n",
            0x18: "o",
            0x19: "p",
            0x10: "q",
            0x13: "r",
            0x1F: "s",
            0x14: "t",
            0x16: "u",
            0x2F: "v",
            0x11: "w",
            0x2D: "x",
            0x15: "y",
            0x2C: "z",

            0x02: "1",
            0x03: "2",
            0x04: "3",
            0x05: "4",
            0x06: "5",
            0x07: "6",
            0x08: "7",
            0x09: "8",
            0x0A: "9",
            0x0B: "0",

            0x39: " ",
            0x1C: "\n"
        };

        return asciiMap[scancode]
            || null;
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            enabled:
                this.enabled,

            bufferSize:
                this.buffer.length,

            pressedKeys:
                Object.keys(this.keys)
                .filter(
                    k => this.keys[k]
                )
        };
    }
}