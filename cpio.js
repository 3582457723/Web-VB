// cpio.js
// Linux initramfs CPIO parser
// newc format support

class CPIO {

    constructor(vfs = null) {

        this.vfs = vfs;

        // =====================================
        // newc magic
        // =====================================

        this.MAGIC_NEWC =
            "070701";

        this.MAGIC_CRC =
            "070702";

        console.log(
            "CPIO Ready"
        );
    }

    // =====================================
    // Helpers
    // =====================================

    hex(str) {

        return parseInt(
            str,
            16
        );
    }

    align4(value) {

        return (
            value + 3
        ) & ~3;
    }

    str(bytes) {

        let s = "";

        for(
            let i = 0;
            i < bytes.length;
            i++
        ) {

            if(bytes[i] === 0) {

                break;
            }

            s += String.fromCharCode(
                bytes[i]
            );
        }

        return s;
    }

    slice(data, off, len) {

        return data.slice(
            off,
            off + len
        );
    }

    // =====================================
    // Parse Header
    // =====================================

    parseHeader(data, offset) {

        const header =
            this.str(
                this.slice(
                    data,
                    offset,
                    110
                )
            );

        const magic =
            header.slice(0, 6);

        if(
            magic !== this.MAGIC_NEWC
            &&
            magic !== this.MAGIC_CRC
        ) {

            throw new Error(

                `Invalid CPIO magic: ${magic}`
            );
        }

        return {

            magic,

            ino:
                this.hex(
                    header.slice(6, 14)
                ),

            mode:
                this.hex(
                    header.slice(14, 22)
                ),

            uid:
                this.hex(
                    header.slice(22, 30)
                ),

            gid:
                this.hex(
                    header.slice(30, 38)
                ),

            nlink:
                this.hex(
                    header.slice(38, 46)
                ),

            mtime:
                this.hex(
                    header.slice(46, 54)
                ),

            filesize:
                this.hex(
                    header.slice(54, 62)
                ),

            devmajor:
                this.hex(
                    header.slice(62, 70)
                ),

            devminor:
                this.hex(
                    header.slice(70, 78)
                ),

            rdevmajor:
                this.hex(
                    header.slice(78, 86)
                ),

            rdevminor:
                this.hex(
                    header.slice(86, 94)
                ),

            namesize:
                this.hex(
                    header.slice(94, 102)
                ),

            check:
                this.hex(
                    header.slice(102, 110)
                )
        };
    }

    // =====================================
    // File Type
    // =====================================

    fileType(mode) {

        const type =
            mode & 0xF000;

        switch(type) {

            case 0x4000:

                return "dir";

            case 0x8000:

                return "file";

            case 0xA000:

                return "symlink";

            case 0x2000:

                return "char";

            case 0x6000:

                return "block";

            case 0x1000:

                return "fifo";

            case 0xC000:

                return "socket";
        }

        return "unknown";
    }

    // =====================================
    // Parse Archive
    // =====================================

    parse(data) {

        let offset = 0;

        const files = [];

        while(
            offset < data.length
        ) {

            // =====================================
            // Header
            // =====================================

            const hdr =
                this.parseHeader(
                    data,
                    offset
                );

            offset += 110;

            // =====================================
            // Filename
            // =====================================

            const nameBytes =
                this.slice(

                    data,

                    offset,

                    hdr.namesize
                );

            const name =
                this.str(
                    nameBytes
                );

            offset += hdr.namesize;

            offset =
                this.align4(
                    offset
                );

            // =====================================
            // Trailer
            // =====================================

            if(
                name === "TRAILER!!!"
            ) {

                console.log(
                    "[CPIO END]"
                );

                break;
            }

            // =====================================
            // File Data
            // =====================================

            const fileData =
                this.slice(

                    data,

                    offset,

                    hdr.filesize
                );

            offset += hdr.filesize;

            offset =
                this.align4(
                    offset
                );

            const type =
                this.fileType(
                    hdr.mode
                );

            const entry = {

                name,

                type,

                mode:
                    hdr.mode,

                uid:
                    hdr.uid,

                gid:
                    hdr.gid,

                size:
                    hdr.filesize,

                mtime:
                    hdr.mtime,

                data:
                    fileData
            };

            files.push(
                entry
            );

            console.log(

                `[CPIO]
${type}
${name}
${hdr.filesize} bytes`
            );
        }

        return files;
    }

    // =====================================
    // Extract to VFS
    // =====================================

    extract(data) {

        const files =
            this.parse(data);

        if(!this.vfs) {

            return files;
        }

        for(
            const file of files
        ) {

            switch(file.type) {

                // =====================================
                // Directory
                // =====================================

                case "dir":

                    this.vfs.mkdir(
                        file.name
                    );

                    break;

                // =====================================
                // File
                // =====================================

                case "file":

                    this.vfs.writeFile(

                        file.name,

                        file.data
                    );

                    break;

                // =====================================
                // Symlink
                // =====================================

                case "symlink":

                    const target =
                        this.str(
                            file.data
                        );

                    if(
                        this.vfs.symlink
                    ) {

                        this.vfs.symlink(

                            file.name,

                            target
                        );
                    }

                    break;
            }
        }

        console.log(
            "[CPIO EXTRACTED]"
        );

        return files;
    }

    // =====================================
    // Find File
    // =====================================

    find(files, path) {

        for(
            const file of files
        ) {

            if(
                file.name === path
            ) {

                return file;
            }
        }

        return null;
    }

    // =====================================
    // Read Text File
    // =====================================

    readText(file) {

        return this.str(
            file.data
        );
    }

    // =====================================
    // List Files
    // =====================================

    list(files) {

        return files.map(

            file => ({

                name:
                    file.name,

                type:
                    file.type,

                size:
                    file.size
            })
        );
    }

    // =====================================
    // Verify
    // =====================================

    verify(data) {

        try {

            const files =
                this.parse(data);

            return (

                files.length > 0
            );

        } catch(e) {

            console.error(e);

            return false;
        }
    }

    // =====================================
    // Build initramfs Tree
    // =====================================

    tree(files) {

        const root = {};

        for(
            const file of files
        ) {

            const parts =
                file.name.split(
                    "/"
                );

            let node = root;

            for(
                let i = 0;
                i < parts.length;
                i++
            ) {

                const part =
                    parts[i];

                if(!part) {

                    continue;
                }

                if(
                    !node[part]
                ) {

                    node[part] = {};
                }

                node =
                    node[part];
            }
        }

        return root;
    }

    // =====================================
    // Linux initramfs
    // =====================================

    mountInitramfs(data) {

        if(!this.vfs) {

            throw new Error(
                "No VFS"
            );
        }

        console.log(
            "[INITRAMFS]"
        );

        const files =
            this.extract(data);

        // =====================================
        // Standard dirs
        // =====================================

        const required = [

            "/dev",
            "/proc",
            "/sys",
            "/tmp"
        ];

        for(
            const dir of required
        ) {

            if(
                !this.vfs.exists(
                    dir
                )
            ) {

                this.vfs.mkdir(
                    dir
                );
            }
        }

        return files;
    }

    // =====================================
    // Info
    // =====================================

    info(data) {

        const files =
            this.parse(data);

        let total = 0;

        for(
            const file of files
        ) {

            total += file.size;
        }

        return {

            format:
                "newc",

            files:
                files.length,

            size:
                total
        };
    }
}