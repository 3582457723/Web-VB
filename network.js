// network.js
// Virtual Network Card
// Ethernet + IPv4 + UDP/TCP Skeleton

class VirtualNetworkCard {

    constructor() {

        // =====================================
        // NIC INFO
        // =====================================

        this.name =
            "JS Virtual NIC";

        this.mac =
            this.generateMAC();

        this.ip =
            "192.168.0.100";

        this.gateway =
            "192.168.0.1";

        this.subnet =
            "255.255.255.0";

        // =====================================
        // Buffers
        // =====================================

        this.rxQueue = [];

        this.txQueue = [];

        // =====================================
        // Interrupt Callback
        // =====================================

        this.interruptHandler = null;

        // =====================================
        // Socket
        // =====================================

        this.socket = null;

        // =====================================
        // State
        // =====================================

        this.connected = false;

        console.log(
            "Virtual NIC Ready"
        );

        console.log(
            "MAC:",
            this.mac
        );
    }

    // =====================================
    // Generate MAC Address
    // =====================================

    generateMAC() {

        const hex = () =>
            Math.floor(
                Math.random() * 256
            )
            .toString(16)
            .padStart(2, "0");

        return [
            "52",
            "54",
            "00",
            hex(),
            hex(),
            hex()
        ].join(":");
    }

    // =====================================
    // Connect WebSocket Backend
    // =====================================

    connect(url) {

        console.log(
            "Connecting:",
            url
        );

        this.socket =
            new WebSocket(url);

        this.socket.binaryType =
            "arraybuffer";

        this.socket.onopen = () => {

            this.connected = true;

            console.log(
                "NIC Connected"
            );
        };

        this.socket.onclose = () => {

            this.connected = false;

            console.log(
                "NIC Disconnected"
            );
        };

        this.socket.onerror = err => {

            console.error(
                "NIC Error",
                err
            );
        };

        this.socket.onmessage = event => {

            const packet =
                new Uint8Array(
                    event.data
                );

            this.receive(packet);
        };
    }

    // =====================================
    // Send Raw Packet
    // =====================================

    send(packet) {

        if(!this.connected) {

            console.warn(
                "NIC Not Connected"
            );

            return;
        }

        this.txQueue.push(packet);

        this.socket.send(packet);

        console.log(
            "TX",
            packet.length,
            "bytes"
        );
    }

    // =====================================
    // Receive Packet
    // =====================================

    receive(packet) {

        this.rxQueue.push(packet);

        console.log(
            "RX",
            packet.length,
            "bytes"
        );

        if(this.interruptHandler) {

            this.interruptHandler(
                packet
            );
        }
    }

    // =====================================
    // Register IRQ
    // =====================================

    onInterrupt(handler) {

        this.interruptHandler =
            handler;
    }

    // =====================================
    // Ethernet Frame
    // =====================================

    createEthernetFrame(
        dstMAC,
        etherType,
        payload
    ) {

        const frame =
            new Uint8Array(
                14 + payload.length
            );

        // Destination MAC
        dstMAC
        .split(":")
        .forEach((x, i) => {

            frame[i] =
                parseInt(x, 16);
        });

        // Source MAC
        this.mac
        .split(":")
        .forEach((x, i) => {

            frame[6 + i] =
                parseInt(x, 16);
        });

        // EtherType
        frame[12] =
            (etherType >> 8) & 0xFF;

        frame[13] =
            etherType & 0xFF;

        // Payload
        frame.set(payload, 14);

        return frame;
    }

    // =====================================
    // IPv4 Packet
    // =====================================

    createIPv4Packet(
        dstIP,
        protocol,
        payload
    ) {

        const packet =
            new Uint8Array(
                20 + payload.length
            );

        // Version + IHL
        packet[0] = 0x45;

        // Total Length
        const len =
            packet.length;

        packet[2] =
            (len >> 8) & 0xFF;

        packet[3] =
            len & 0xFF;

        // TTL
        packet[8] = 64;

        // Protocol
        packet[9] = protocol;

        // Source IP
        this.ip
        .split(".")
        .forEach((x, i) => {

            packet[12 + i] =
                parseInt(x);
        });

        // Destination IP
        dstIP
        .split(".")
        .forEach((x, i) => {

            packet[16 + i] =
                parseInt(x);
        });

        // Payload
        packet.set(payload, 20);

        return packet;
    }

    // =====================================
    // UDP Packet
    // =====================================

    createUDP(
        srcPort,
        dstPort,
        payload
    ) {

        const packet =
            new Uint8Array(
                8 + payload.length
            );

        packet[0] =
            (srcPort >> 8) & 0xFF;

        packet[1] =
            srcPort & 0xFF;

        packet[2] =
            (dstPort >> 8) & 0xFF;

        packet[3] =
            dstPort & 0xFF;

        const len =
            packet.length;

        packet[4] =
            (len >> 8) & 0xFF;

        packet[5] =
            len & 0xFF;

        packet.set(payload, 8);

        return packet;
    }

    // =====================================
    // TCP Skeleton
    // =====================================

    createTCP(
        srcPort,
        dstPort,
        payload
    ) {

        const packet =
            new Uint8Array(
                20 + payload.length
            );

        packet[0] =
            (srcPort >> 8) & 0xFF;

        packet[1] =
            srcPort & 0xFF;

        packet[2] =
            (dstPort >> 8) & 0xFF;

        packet[3] =
            dstPort & 0xFF;

        // Data Offset
        packet[12] = 0x50;

        packet.set(payload, 20);

        return packet;
    }

    // =====================================
    // Simple Ping
    // =====================================

    ping(ip) {

        console.log(
            "PING",
            ip
        );

        const payload =
            new TextEncoder()
            .encode("PING");

        const ipv4 =
            this.createIPv4Packet(
                ip,
                1,
                payload
            );

        const frame =
            this.createEthernetFrame(
                "ff:ff:ff:ff:ff:ff",
                0x0800,
                ipv4
            );

        this.send(frame);
    }

    // =====================================
    // Send UDP
    // =====================================

    sendUDP(
        ip,
        port,
        text
    ) {

        const payload =
            new TextEncoder()
            .encode(text);

        const udp =
            this.createUDP(
                12345,
                port,
                payload
            );

        const ipv4 =
            this.createIPv4Packet(
                ip,
                17,
                udp
            );

        const frame =
            this.createEthernetFrame(
                "ff:ff:ff:ff:ff:ff",
                0x0800,
                ipv4
            );

        this.send(frame);
    }

    // =====================================
    // Poll RX
    // =====================================

    poll() {

        if(
            this.rxQueue.length === 0
        ) {

            return null;
        }

        return this.rxQueue.shift();
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            name:
                this.name,

            mac:
                this.mac,

            ip:
                this.ip,

            connected:
                this.connected,

            rxQueue:
                this.rxQueue.length,

            txQueue:
                this.txQueue.length
        };
    }
}