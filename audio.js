// audio.js
// Virtual Audio Subsystem + Sound Card

class AudioBuffer {

    constructor(
        sampleRate = 44100,
        channels = 2
    ) {

        // =====================================
        // Audio Format
        // =====================================

        this.sampleRate =
            sampleRate;

        this.channels =
            channels;

        // =====================================
        // PCM Data
        // =====================================

        this.samples = [];

        console.log(
            "AudioBuffer Ready"
        );
    }

    // =====================================
    // Push Sample
    // =====================================

    push(left, right = left) {

        this.samples.push(
            left,
            right
        );
    }

    // =====================================
    // Clear
    // =====================================

    clear() {

        this.samples = [];
    }

    // =====================================
    // Float32Array
    // =====================================

    toFloat32Array() {

        return new Float32Array(
            this.samples
        );
    }

    // =====================================
    // Duration
    // =====================================

    duration() {

        return (
            this.samples.length
            /
            this.channels
            /
            this.sampleRate
        );
    }
}

// =====================================
// Virtual Sound Card
// =====================================

class VirtualSoundCard {

    constructor(options = {}) {

        // =====================================
        // Audio Context
        // =====================================

        this.audioContext =
            new (
                window.AudioContext
                ||
                window.webkitAudioContext
            )();

        // =====================================
        // Master Volume
        // =====================================

        this.masterGain =
            this.audioContext
            .createGain();

        this.masterGain.connect(
            this.audioContext
            .destination
        );

        this.masterGain.gain.value =
            1.0;

        // =====================================
        // Mixer
        // =====================================

        this.channels = [];

        // =====================================
        // Device Info
        // =====================================

        this.sampleRate =
            this.audioContext
            .sampleRate;

        this.enabled = true;

        console.log(
            "Virtual Sound Card Ready"
        );
    }

    // =====================================
    // Create Channel
    // =====================================

    createChannel() {

        const gain =
            this.audioContext
            .createGain();

        gain.connect(
            this.masterGain
        );

        const channel = {

            gain,
            volume: 1.0,
            muted: false
        };

        this.channels.push(
            channel
        );

        return channel;
    }

    // =====================================
    // Play Buffer
    // =====================================

    playBuffer(audioBuffer) {

        if(!this.enabled) {

            return;
        }

        const samples =
            audioBuffer
            .toFloat32Array();

        const buffer =
            this.audioContext
            .createBuffer(

                audioBuffer.channels,

                samples.length
                /
                audioBuffer.channels,

                audioBuffer.sampleRate
            );

        for(
            let ch = 0;
            ch < audioBuffer.channels;
            ch++
        ) {

            const data =
                buffer.getChannelData(ch);

            for(
                let i = 0;
                i < data.length;
                i++
            ) {

                data[i] =
                    samples[
                        i
                        *
                        audioBuffer.channels
                        + ch
                    ] || 0;
            }
        }

        const source =
            this.audioContext
            .createBufferSource();

        source.buffer =
            buffer;

        source.connect(
            this.masterGain
        );

        source.start();

        return source;
    }

    // =====================================
    // Beep
    // =====================================

    beep(
        frequency = 440,
        duration = 200
    ) {

        const osc =
            this.audioContext
            .createOscillator();

        const gain =
            this.audioContext
            .createGain();

        osc.frequency.value =
            frequency;

        osc.type = "square";

        osc.connect(gain);

        gain.connect(
            this.masterGain
        );

        osc.start();

        setTimeout(() => {

            osc.stop();

        }, duration);
    }

    // =====================================
    // Tone
    // =====================================

    tone(
        frequency = 440,
        duration = 500,
        type = "sine"
    ) {

        const osc =
            this.audioContext
            .createOscillator();

        osc.type = type;

        osc.frequency.value =
            frequency;

        osc.connect(
            this.masterGain
        );

        osc.start();

        setTimeout(() => {

            osc.stop();

        }, duration);
    }

    // =====================================
    // Noise
    // =====================================

    noise(duration = 500) {

        const buffer =
            this.audioContext
            .createBuffer(

                1,

                this.sampleRate
                * duration
                / 1000,

                this.sampleRate
            );

        const data =
            buffer.getChannelData(0);

        for(
            let i = 0;
            i < data.length;
            i++
        ) {

            data[i] =
                Math.random()
                * 2
                - 1;
        }

        const source =
            this.audioContext
            .createBufferSource();

        source.buffer =
            buffer;

        source.connect(
            this.masterGain
        );

        source.start();
    }

    // =====================================
    // WAV
    // =====================================

    playWav(arrayBuffer) {

        this.audioContext
        .decodeAudioData(

            arrayBuffer.slice(0),

            decoded => {

                const source =
                    this.audioContext
                    .createBufferSource();

                source.buffer =
                    decoded;

                source.connect(
                    this.masterGain
                );

                source.start();
            }
        );
    }

    // =====================================
    // MP3
    // =====================================

    playMP3(arrayBuffer) {

        this.playWav(
            arrayBuffer
        );
    }

    // =====================================
    // PCM Stream
    // =====================================

    streamPCM(
        samples,
        sampleRate = 44100
    ) {

        const buffer =
            new AudioBuffer(
                sampleRate,
                2
            );

        for(
            const s
            of samples
        ) {

            buffer.push(
                s.left,
                s.right
            );
        }

        return this.playBuffer(
            buffer
        );
    }

    // =====================================
    // Volume
    // =====================================

    setVolume(v) {

        this.masterGain
        .gain.value = v;
    }

    // =====================================
    // Mute
    // =====================================

    mute() {

        this.masterGain
        .gain.value = 0;
    }

    // =====================================
    // Unmute
    // =====================================

    unmute() {

        this.masterGain
        .gain.value = 1;
    }

    // =====================================
    // Enable
    // =====================================

    enable() {

        this.enabled = true;
    }

    // =====================================
    // Disable
    // =====================================

    disable() {

        this.enabled = false;
    }

    // =====================================
    // Resume
    // =====================================

    async resume() {

        if(
            this.audioContext
            .state
            === "suspended"
        ) {

            await this.audioContext
            .resume();
        }
    }

    // =====================================
    // Suspend
    // =====================================

    async suspend() {

        await this.audioContext
        .suspend();
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            sampleRate:
                this.sampleRate,

            channels:
                this.channels.length,

            enabled:
                this.enabled,

            state:
                this.audioContext
                .state
        };
    }
}

// =====================================
// Linux-like Audio Driver
// =====================================

class AudioDriver {

    constructor(soundCard) {

        this.soundCard =
            soundCard;

        this.opened = false;

        console.log(
            "Audio Driver Ready"
        );
    }

    // =====================================
    // Open
    // =====================================

    open() {

        this.opened = true;

        this.soundCard.resume();
    }

    // =====================================
    // Close
    // =====================================

    close() {

        this.opened = false;
    }

    // =====================================
    // Write PCM
    // =====================================

    write(data) {

        if(!this.opened) {

            return 0;
        }

        this.soundCard
        .streamPCM(data);

        return data.length;
    }

    // =====================================
    // ioctl
    // =====================================

    ioctl(cmd, arg) {

        switch(cmd) {

            case "SET_VOLUME":

                this.soundCard
                .setVolume(arg);

                break;

            case "BEEP":

                this.soundCard
                .beep(arg);

                break;

            case "MUTE":

                this.soundCard
                .mute();

                break;

            case "UNMUTE":

                this.soundCard
                .unmute();

                break;
        }
    }

    // =====================================
    // Read
    // =====================================

    read() {

        return null;
    }
}