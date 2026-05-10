// ext2.js
// EXT2 Filesystem Driver

class EXT2 {

    constructor(disk) {

        // =====================================
        // Disk
        // =====================================

        this.disk = disk;

        // =====================================
        // Constants
        // =====================================

        this.BLOCK_SIZE = 1024;

        this.INODE_SIZE = 128;

        this.ROOT_INODE = 2;

        // =====================================
        // Superblock
        // =====================================

        this.superblock = null;

        // =====================================
        // Groups
        // =====================================

        this.blockGroups = [];

        // =====================================
        // Mount State
        // =====================================

        this.mounted = false;

        console.log(
            "EXT2 Driver Ready"
        );
    }

    // =====================================
    // Mount Filesystem
    // =====================================

    mount() {

        console.log(
            "Mounting EXT2..."
        );

        // Superblock
        const superblock =
            this.readBlock(1);

        const view =
            new DataView(
                superblock.buffer
            );

        const magic =
            view.getUint16(
                56,
                true
            );

        if(magic !== 0xEF53) {

            throw new Error(
                "Invalid EXT2"
            );
        }

        this.superblock = {

            inodes:
                view.getUint32(
                    0,
                    true
                ),

            blocks:
                view.getUint32(
                    4,
                    true
                ),

            reservedBlocks:
                view.getUint32(
                    8,
                    true
                ),

            freeBlocks:
                view.getUint32(
                    12,
                    true
                ),

            freeInodes:
                view.getUint32(
                    16,
                    true
                ),

            firstDataBlock:
                view.getUint32(
                    20,
                    true
                ),

            logBlockSize:
                view.getUint32(
                    24,
                    true
                ),

            blocksPerGroup:
                view.getUint32(
                    32,
                    true
                ),

            inodesPerGroup:
                view.getUint32(
                    40,
                    true
                ),

            magic
        };

        // Block Size
        this.BLOCK_SIZE =

            1024 <<
            this.superblock
            .logBlockSize;

        this.mounted = true;

        console.log(
            "EXT2 Mounted"
        );

        console.log(
            this.superblock
        );
    }

    // =====================================
    // Read Block
    // =====================================

    readBlock(block) {

        const sectorSize = 512;

        const sectorsPerBlock =

            this.BLOCK_SIZE
            / sectorSize;

        const startSector =

            block
            * sectorsPerBlock;

        const data =
            new Uint8Array(
                this.BLOCK_SIZE
            );

        for(
            let i = 0;
            i < sectorsPerBlock;
            i++
        ) {

            const sector =
                this.disk.readSector(

                    startSector + i
                );

            data.set(

                sector,

                i * sectorSize
            );
        }

        return data;
    }

    // =====================================
    // Write Block
    // =====================================

    writeBlock(
        block,
        data
    ) {

        const sectorSize = 512;

        const sectorsPerBlock =

            this.BLOCK_SIZE
            / sectorSize;

        const startSector =

            block
            * sectorsPerBlock;

        for(
            let i = 0;
            i < sectorsPerBlock;
            i++
        ) {

            const sector =
                data.slice(

                    i * sectorSize,

                    (i + 1)
                    * sectorSize
                );

            this.disk.writeSector(

                startSector + i,

                sector
            );
        }
    }

    // =====================================
    // Read Inode
    // =====================================

    readInode(inodeNumber) {

        const inodeTableBlock =
            5;

        const inodeIndex =
            inodeNumber - 1;

        const inodeOffset =

            inodeIndex
            * this.INODE_SIZE;

        const block =
            inodeTableBlock
            +
            Math.floor(

                inodeOffset
                / this.BLOCK_SIZE
            );

        const offset =
            inodeOffset
            % this.BLOCK_SIZE;

        const buffer =
            this.readBlock(block);

        const view =
            new DataView(
                buffer.buffer
            );

        const inode = {

            mode:
                view.getUint16(
                    offset,
                    true
                ),

            uid:
                view.getUint16(
                    offset + 2,
                    true
                ),

            size:
                view.getUint32(
                    offset + 4,
                    true
                ),

            atime:
                view.getUint32(
                    offset + 8,
                    true
                ),

            ctime:
                view.getUint32(
                    offset + 12,
                    true
                ),

            mtime:
                view.getUint32(
                    offset + 16,
                    true
                ),

            gid:
                view.getUint16(
                    offset + 24,
                    true
                ),

            links:
                view.getUint16(
                    offset + 26,
                    true
                ),

            blocks:
                []
        };

        // Direct blocks
        for(
            let i = 0;
            i < 12;
            i++
        ) {

            inode.blocks.push(

                view.getUint32(

                    offset
                    + 40
                    + i * 4,

                    true
                )
            );
        }

        return inode;
    }

    // =====================================
    // Read File Data
    // =====================================

    readFileInode(inodeNumber) {

        const inode =
            this.readInode(
                inodeNumber
            );

        const data =
            new Uint8Array(
                inode.size
            );

        let ptr = 0;

        for(
            const block
            of inode.blocks
        ) {

            if(block === 0) {

                continue;
            }

            const blockData =
                this.readBlock(
                    block
                );

            data.set(

                blockData.slice(

                    0,

                    Math.min(

                        blockData.length,

                        inode.size - ptr
                    )
                ),

                ptr
            );

            ptr +=
                blockData.length;

            if(
                ptr >= inode.size
            ) {

                break;
            }
        }

        return data;
    }

    // =====================================
    // Read Directory
    // =====================================

    readDirectory(
        inodeNumber =
        this.ROOT_INODE
    ) {

        const inode =
            this.readInode(
                inodeNumber
            );

        const data =
            this.readFileInode(
                inodeNumber
            );

        const entries = [];

        let offset = 0;

        while(
            offset < data.length
        ) {

            const view =
                new DataView(
                    data.buffer
                );

            const inode =
                view.getUint32(
                    offset,
                    true
                );

            const recLen =
                view.getUint16(
                    offset + 4,
                    true
                );

            const nameLen =
                view.getUint8(
                    offset + 6
                );

            if(
                inode === 0 ||
                recLen === 0
            ) {

                break;
            }

            let name = "";

            for(
                let i = 0;
                i < nameLen;
                i++
            ) {

                name +=
                    String
                    .fromCharCode(

                        data[
                            offset
                            + 8
                            + i
                        ]
                    );
            }

            entries.push({

                inode,
                name
            });

            offset += recLen;
        }

        return entries;
    }

    // =====================================
    // List Root
    // =====================================

    ls(path = "/") {

        console.log(
            "EXT2 ls",
            path
        );

        const entries =
            this.readDirectory();

        for(
            const entry
            of entries
        ) {

            console.log(

                entry.inode,

                entry.name
            );
        }

        return entries;
    }

    // =====================================
    // Read File By Path
    // =====================================

    readFile(path) {

        if(path === "/") {

            return null;
        }

        const parts =
            path
            .split("/")
            .filter(Boolean);

        const entries =
            this.readDirectory();

        const target =
            entries.find(

                e =>
                    e.name ===
                    parts[0]
            );

        if(!target) {

            throw new Error(
                "File Not Found"
            );
        }

        return this.readFileInode(
            target.inode
        );
    }

    // =====================================
    // Create File
    // =====================================

    createFile(
        name,
        content
    ) {

        console.log(

            "EXT2 Create File:",

            name
        );

        // Placeholder
        // Full inode allocation
        // requires bitmap logic

        return true;
    }

    // =====================================
    // Delete File
    // =====================================

    deleteFile(name) {

        console.log(

            "EXT2 Delete:",

            name
        );

        return true;
    }

    // =====================================
    // Filesystem Info
    // =====================================

    info() {

        return {

            mounted:
                this.mounted,

            blockSize:
                this.BLOCK_SIZE,

            totalBlocks:
                this.superblock
                ? this.superblock.blocks
                : 0,

            freeBlocks:
                this.superblock
                ? this.superblock.freeBlocks
                : 0,

            totalInodes:
                this.superblock
                ? this.superblock.inodes
                : 0
        };
    }
}