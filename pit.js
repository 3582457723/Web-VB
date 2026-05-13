// pit.js
// Intel 8253/8254 PIT Emulator
// Programmable Interval Timer
// Linux Compatible

class PIT {

    constructor(

        cpu,
        pic,
        apic,
        scheduler
    ) {

        this.cpu = cpu;

        this.pic = pic;
        this.apic = apic;

        this.scheduler = scheduler;

        // =====================================
        // PIT Frequency
        // =====================================

        this.BASE_FREQUENCY =
            1193182;

        // =====================================
        // Channels
        // =====================================

        this.channels = [

            this.createChannel(),

            this.createChannel(),

            this.createChannel()
        ];

        // =====================================
        // I/O Ports
        // =====================================

        this.PORT_CH0 = 0x40;
        this.PORT_CH1 = 0x41;
        this.PORT_CH2 = 0x42;
        this.PORT_CMD = 0x43;

        // =====================================
        // IRQ
        // =====================================

        this.IRQ = 0;

        // =====================================
        // Runtime
        // =====================================

        this.running = false;

        this.interval = null;

        console.log(
            "PIT Ready"
        );
    }

    // =====================================
    // Create Channel
    // =====================================

    createChannel() {

        return {

            reload: 0,

            counter: 0,

            mode: 3,

            accessMode: 3,

            bcd: false,

            latched: false,

            latch: 0,

            writeState: 0,

            readState: 0,

            lowByte: 0,

            highByte: 0,

            enabled: false,

            output: 0,

            frequency: 18.2065
        };
    }

    // =====================================
    // Reset
    // =====================================

    reset() {

        for(
            let i = 0;
            i < 3;
            i++
        ) {

            this.channels[i] =
                this.createChannel();
        }

        console.log(
            "[PIT RESET]"
        );
    }

    // =====================================
    // Port Write
    // =====================================

    writePort(port, value) {

        switch(port) {

            // =====================================
            // Channel 0
            // =====================================

            case 0x40:

                this.writeChannel(
                    0,
                    value
                );

                break;

            // =====================================
            // Channel 1
            // =====================================

            case 0x41:

                this.writeChannel(
                    1,
                    value
                );

                break;

            // =====================================
            // Channel 2
            // =====================================

            case 0x42:

                this.writeChannel(
                    2,
                    value
                );

                break;

            // =====================================
            // Command
            // =====================================

            case 0x43:

                this.command(value);

                break;
        }
    }

    // =====================================
    // Port Read
    // =====================================

    readPort(port) {

        switch(port) {

            case 0x40:

                return this.readChannel(0);

            case 0x41:

                return this.readChannel(1);

            case 0x42:

                return this.readChannel(2);
        }

        return 0xFF;
    }

    // =====================================
    // Command Register
    // =====================================

    command(value) {

        const channel =
            (value >> 6) & 0x3;

        const access =
            (value >> 4) & 0x3;

        const mode =
            (value >> 1) & 0x7;

        const bcd =
            value & 1;

        // readback unsupported
        if(channel === 3) {

            console.warn(
                "[PIT] Readback unsupported"
            );

            return;
        }

        const ch =
            this.channels[channel];

        ch.accessMode =
            access;

        ch.mode =
            mode;

        ch.bcd =
            Boolean(bcd);

        ch.writeState = 0;
        ch.readState = 0;

        console.log(

            `[PIT CMD]
channel=${channel}
mode=${mode}
access=${access}`
        );
    }

    // =====================================
    // Write Channel
    // =====================================

    writeChannel(channel, value) {

        const ch =
            this.channels[channel];

        switch(ch.accessMode) {

            // =====================================
            // Low byte only
            // =====================================

            case 1:

                ch.reload =
                    (
                        ch.reload
                        &
                        0xFF00
                    )
                    |
                    value;

                this.reload(channel);

                break;

            // =====================================
            // High byte only
            // =====================================

            case 2:

                ch.reload =
                    (
                        ch.reload
                        &
                        0x00FF
                    )
                    |
                    (value << 8);

                this.reload(channel);

                break;

            // =====================================
            // Low + High
            // =====================================

            case 3:

                if(
                    ch.writeState === 0
                ) {

                    ch.lowByte =
                        value;

                    ch.writeState = 1;

                } else {

                    ch.highByte =
                        value;

                    ch.reload =

                        ch.lowByte
                        |
                        (
                            ch.highByte
                            << 8
                        );

                    ch.writeState = 0;

                    this.reload(channel);
                }

                break;
        }
    }

    // =====================================
    // Read Channel
    // =====================================

    readChannel(channel) {

        const ch =
            this.channels[channel];

        const value =
            ch.counter;

        switch(ch.accessMode) {

            // low
            case 1:

                return value & 0xFF;

            // high
            case 2:

                return (
                    value >> 8
                ) & 0xFF;

            // low/high
            case 3:

                if(
                    ch.readState === 0
                ) {

                    ch.readState = 1;

                    return value & 0xFF;

                } else {

                    ch.readState = 0;

                    return (
                        value >> 8
                    ) & 0xFF;
                }
        }

        return 0;
    }

    // =====================================
    // Reload
    // =====================================

    reload(channel) {

        const ch =
            this.channels[channel];

        if(ch.reload === 0) {

            ch.reload = 0x10000;
        }

        ch.counter =
            ch.reload;

        ch.enabled = true;

        ch.frequency =

            this.BASE_FREQUENCY
            /
            ch.reload;

        console.log(

            `[PIT RELOAD]
channel=${channel}
reload=${ch.reload}
freq=${ch.frequency.toFixed(2)}Hz`
        );
    }

    // =====================================
    // Tick
    // =====================================

    tick() {

        for(
            let i = 0;
            i < 3;
            i++
        ) {

            const ch =
                this.channels[i];

            if(
                !ch.enabled
            ) {

                continue;
            }

            ch.counter--;

            if(
                ch.counter <= 0
            ) {

                ch.counter =
                    ch.reload;

                ch.output ^= 1;

                // =====================================
                // IRQ0
                // =====================================

                if(i === 0) {

                    this.raiseIRQ();
                }
            }
        }
    }

    // =====================================
    // IRQ
    // =====================================

    raiseIRQ() {

        // APIC preferred
        if(this.apic) {

            this.apic.raiseIRQ(
                this.IRQ
            );

        } else if(this.pic) {

            this.pic.raiseIRQ(
                this.IRQ
            );
        }

        // scheduler
        if(
            this.scheduler
        ) {

            this.scheduler.tick();
        }

        console.log(
            "[PIT IRQ0]"
        );
    }

    // =====================================
    // Start
    // =====================================

    start(hz = 1000) {

        if(this.running) {

            return;
        }

        this.running = true;

        const interval =
            1000 / hz;

        this.interval =

            setInterval(() => {

                this.tick();

            }, interval);

        console.log(

            `[PIT START]
${hz}Hz`
        );
    }

    // =====================================
    // Stop
    // =====================================

    stop() {

        if(!this.running) {

            return;
        }

        clearInterval(
            this.interval
        );

        this.running = false;

        console.log(
            "[PIT STOP]"
        );
    }

    // =====================================
    // Linux PIT Setup
    // =====================================

    setupLinuxTimer() {

        // =====================================
        // 100Hz
        // divisor = 1193182 / 100
        // =====================================

        const divisor =
            Math.floor(
                this.BASE_FREQUENCY
                / 100
            );

        // channel 0
        this.command(
            0x36
        );

        // low
        this.writeChannel(
            0,
            divisor & 0xFF
        );

        // high
        this.writeChannel(
            0,
            (
                divisor >> 8
            ) & 0xFF
        );

        console.log(
            "[LINUX PIT]"
        );
    }

    // =====================================
    // Sleep
    // =====================================

    async sleep(ms) {

        return new Promise(

            resolve => {

                setTimeout(
                    resolve,
                    ms
                );
            }
        );
    }

    // =====================================
    // Wait Ticks
    // =====================================

    async waitTicks(ticks) {

        const ch =
            this.channels[0];

        const ms =

            (
                ticks
                /
                ch.frequency
            )
            * 1000;

        await this.sleep(ms);
    }

    // =====================================
    // Speaker
    // =====================================

    speakerEnable() {

        console.log(
            "[PC SPEAKER ON]"
        );
    }

    speakerDisable() {

        console.log(
            "[PC SPEAKER OFF]"
        );
    }

    // =====================================
    // Debug
    // =====================================

    dump(channel = 0) {

        const ch =
            this.channels[channel];

        return {

            channel,

            reload:
                ch.reload,

            counter:
                ch.counter,

            mode:
                ch.mode,

            frequency:
                ch.frequency,

            enabled:
                ch.enabled,

            output:
                ch.output
        };
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            baseFrequency:
                this.BASE_FREQUENCY,

            running:
                this.running,

            channels:
                this.channels.length,

            irq:
                this.IRQ
        };
    }
}