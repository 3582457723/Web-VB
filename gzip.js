// gzip.js
// Minimal GZIP/DEFLATE Reader
// For Linux initramfs support

class GZIP {

    constructor() {

        // =====================================
        // GZIP
        // =====================================

        this.ID1 = 0x1F;
        this.ID2 = 0x8B;

        // =====================================
        // Compression Methods
        // =====================================

        this.DEFLATE = 8;

        console.log(
            "GZIP Ready"
        );
    }

    // =====================================
    // Helpers
    // =====================================

    u8(buf, off) {

        return new DataView(buf)
            .getUint8(off);
    }

    u16(buf, off) {

        return new DataView(buf)
            .getUint16(off, true);
    }

    u32(buf, off) {

        return new DataView(buf)
            .getUint32(off, true);
    }

    // =====================================
    // Parse Header
    // =====================================

    parseHeader(buffer) {

        const id1 =
            this.u8(buffer, 0);

        const id2 =
            this.u8(buffer, 1);

        if(
            id1 !== this.ID1
            ||
            id2 !== this.ID2
        ) {

            throw new Error(
                "Invalid gzip"
            );
        }

        const method =
            this.u8(buffer, 2);

        if(
            method !== this.DEFLATE
        ) {

            throw new Error(
                "Unsupported compression"
            );
        }

        const flags =
            this.u8(buffer, 3);

        const mtime =
            this.u32(buffer, 4);

        const xfl =
            this.u8(buffer, 8);

        const os =
            this.u8(buffer, 9);

        let offset = 10;

        // =====================================
        // FEXTRA
        // =====================================

        if(flags & 0x04) {

            const xlen =
                this.u16(
                    buffer,
                    offset
                );

            offset +=
                2 + xlen;
        }

        // =====================================
        // FNAME
        // =====================================

        if(flags & 0x08) {

            while(
                this.u8(buffer, offset)
                !== 0
            ) {

                offset++;
            }

            offset++;
        }

        // =====================================
        // FCOMMENT
        // =====================================

        if(flags & 0x10) {

            while(
                this.u8(buffer, offset)
                !== 0
            ) {

                offset++;
            }

            offset++;
        }

        // =====================================
        // FHCRC
        // =====================================

        if(flags & 0x02) {

            offset += 2;
        }

        console.log(

            `[GZIP]
method=${method}
flags=0x${flags.toString(16)}
dataOffset=${offset}`
        );

        return {

            method,
            flags,
            mtime,
            xfl,
            os,
            dataOffset: offset
        };
    }

    // =====================================
    // Inflate
    // =====================================

    inflate(buffer) {

        const header =
            this.parseHeader(
                buffer
            );

        // =====================================
        // Footer
        // =====================================

        const footerOffset =
            buffer.byteLength - 8;

        const crc32 =
            this.u32(
                buffer,
                footerOffset
            );

        const isize =
            this.u32(
                buffer,
                footerOffset + 4
            );

        console.log(

            `[GZIP FOOTER]
crc32=0x${crc32.toString(16)}
size=${isize}`
        );

        // =====================================
        // DEFLATE DATA
        // =====================================

        const deflateData =

            new Uint8Array(

                buffer,

                header.dataOffset,

                footerOffset
                -
                header.dataOffset
            );

        // =====================================
        // Browser Native
        // =====================================

        if(
            typeof DecompressionStream
            !== "undefined"
        ) {

            return this.inflateNative(
                deflateData
            );
        }

        // =====================================
        // Fallback
        // =====================================

        return this.inflateStored(
            deflateData,
            isize
        );
    }

    // =====================================
    // Browser Native Inflate
    // =====================================

    async inflateNative(data) {

        const ds =
            new DecompressionStream(
                "deflate"
            );

        const stream =

            new Blob([data])
            .stream()
            .pipeThrough(ds);

        const response =
            new Response(stream);

        const buffer =
            await response.arrayBuffer();

        console.log(

            `[INFLATE]
${buffer.byteLength} bytes`
        );

        return new Uint8Array(
            buffer
        );
    }

    // =====================================
    // Minimal Stored Blocks
    // Only supports no compression
    // =====================================

    inflateStored(

        data,
        expectedSize
    ) {

        let offset = 0;

        const output =
            new Uint8Array(
                expectedSize
            );

        let outPos = 0;

        while(
            offset < data.length
        ) {

            const header =
                data[offset++];

            const bfinal =
                header & 1;

            const btype =
                (header >> 1)
                & 0x3;

            // =====================================
            // Stored block only
            // =====================================

            if(btype !== 0) {

                throw new Error(

                    "Only stored blocks supported"
                );
            }

            // align
            offset++;

            const len =
                data[offset]
                |
                (
                    data[offset + 1]
                    << 8
                );

            offset += 4;

            for(
                let i = 0;
                i < len;
                i++
            ) {

                output[outPos++] =
                    data[offset++];
            }

            if(bfinal) {

                break;
            }
        }

        console.log(

            `[INFLATE STORED]
${outPos} bytes`
        );

        return output;
    }

    // =====================================
    // Gunzip
    // =====================================

    async gunzip(buffer) {

        const result =
            await this.inflate(
                buffer
            );

        console.log(
            "[GUNZIP DONE]"
        );

        return result;
    }

    // =====================================
    // Check gzip
    // =====================================

    isGzip(buffer) {

        return (

            this.u8(buffer, 0)
            === this.ID1

            &&

            this.u8(buffer, 1)
            === this.ID2
        );
    }

    // =====================================
    // Extract File Name
    // =====================================

    filename(buffer) {

        const flags =
            this.u8(buffer, 3);

        if(!(flags & 0x08)) {

            return null;
        }

        let offset = 10;

        let name = "";

        while(
            this.u8(buffer, offset)
            !== 0
        ) {

            name +=
                String.fromCharCode(

                    this.u8(
                        buffer,
                        offset
                    )
                );

            offset++;
        }

        return name;
    }

    // =====================================
    // CRC32
    // =====================================

    crc32(data) {

        let crc =
            0xFFFFFFFF;

        for(
            let i = 0;
            i < data.length;
            i++
        ) {

            crc ^= data[i];

            for(
                let j = 0;
                j < 8;
                j++
            ) {

                const mask =
                    -(crc & 1);

                crc =
                    (
                        crc >>> 1
                    )
                    ^
                    (
                        0xEDB88320
                        & mask
                    );
            }
        }

        return (~crc) >>> 0;
    }

    // =====================================
    // Verify
    // =====================================

    async verify(buffer) {

        const footer =
            buffer.byteLength - 8;

        const expected =
            this.u32(
                buffer,
                footer
            );

        const data =
            await this.gunzip(
                buffer
            );

        const actual =
            this.crc32(data);

        return actual === expected;
    }

    // =====================================
    // Info
    // =====================================

    info(buffer) {

        const header =
            this.parseHeader(
                buffer
            );

        return {

            gzip: true,

            method:
                header.method,

            flags:
                header.flags,

            filename:
                this.filename(
                    buffer
                ),

            mtime:
                header.mtime
        };
    }
}