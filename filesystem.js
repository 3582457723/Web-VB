// filesystem.js
// Virtual File System
// FAT-like Filesystem

class VirtualFileSystem {

    constructor(disk) {

        this.disk = disk;

        // =====================================
        // Files
        // =====================================

        this.files = {};

        // =====================================
        // Directories
        // =====================================

        this.directories = {

            "/": []
        };

        // =====================================
        // Current Directory
        // =====================================

        this.cwd = "/";

        // =====================================
        // File Allocation
        // =====================================

        this.nextFreeSector = 10;

        console.log(
            "Virtual FileSystem Ready"
        );
    }

    // =====================================
    // Normalize Path
    // =====================================

    normalize(path) {

        if(!path.startsWith("/")) {

            path =
                this.cwd + path;
        }

        path =
            path.replace(/\/+/g, "/");

        return path;
    }

    // =====================================
    // Create Directory
    // =====================================

    mkdir(path) {

        path = this.normalize(path);

        if(this.directories[path]) {

            throw new Error(
                "Directory exists"
            );
        }

        this.directories[path] = [];

        const parent =
            path
            .split("/")
            .slice(0, -1)
            .join("/") || "/";

        const name =
            path.split("/")
            .pop();

        this.directories[parent]
        .push(name);

        console.log(
            "Directory Created:",
            path
        );
    }

    // =====================================
    // Change Directory
    // =====================================

    cd(path) {

        path = this.normalize(path);

        if(!this.directories[path]) {

            throw new Error(
                "Directory not found"
            );
        }

        this.cwd = path;

        console.log(
            "CWD:",
            this.cwd
        );
    }

    // =====================================
    // List Directory
    // =====================================

    ls(path = this.cwd) {

        path = this.normalize(path);

        if(!this.directories[path]) {

            throw new Error(
                "Directory not found"
            );
        }

        return this.directories[path];
    }

    // =====================================
    // Create File
    // =====================================

    createFile(path, content = "") {

        path = this.normalize(path);

        if(this.files[path]) {

            throw new Error(
                "File exists"
            );
        }

        const encoder =
            new TextEncoder();

        const data =
            encoder.encode(content);

        const sectorsNeeded =
            Math.ceil(
                data.length / 512
            );

        const startSector =
            this.nextFreeSector;

        // Write sectors
        for(
            let i = 0;
            i < sectorsNeeded;
            i++
        ) {

            const sector =
                new Uint8Array(512);

            sector.set(
                data.slice(
                    i * 512,
                    (i + 1) * 512
                )
            );

            this.disk.writeSector(
                startSector + i,
                sector
            );
        }

        this.files[path] = {

            size:
                data.length,

            startSector,

            sectors:
                sectorsNeeded,

            created:
                Date.now(),

            modified:
                Date.now()
        };

        this.nextFreeSector +=
            sectorsNeeded;

        // Add to directory
        const parent =
            path
            .split("/")
            .slice(0, -1)
            .join("/") || "/";

        const name =
            path.split("/")
            .pop();

        if(
            this.directories[parent]
        ) {

            this.directories[parent]
            .push(name);
        }

        console.log(
            "File Created:",
            path
        );
    }

    // =====================================
    // Read File
    // =====================================

    readFile(path) {

        path = this.normalize(path);

        const file =
            this.files[path];

        if(!file) {

            throw new Error(
                "File not found"
            );
        }

        const buffer =
            new Uint8Array(
                file.size
            );

        for(
            let i = 0;
            i < file.sectors;
            i++
        ) {

            const sector =
                this.disk.readSector(
                    file.startSector + i
                );

            buffer.set(
                sector,
                i * 512
            );
        }

        const decoder =
            new TextDecoder();

        return decoder.decode(
            buffer.slice(
                0,
                file.size
            )
        );
    }

    // =====================================
    // Write File
    // =====================================

    writeFile(path, content) {

        path = this.normalize(path);

        if(!this.files[path]) {

            this.createFile(
                path,
                content
            );

            return;
        }

        const file =
            this.files[path];

        const encoder =
            new TextEncoder();

        const data =
            encoder.encode(content);

        const sectorsNeeded =
            Math.ceil(
                data.length / 512
            );

        // Allocate new sectors if needed
        if(
            sectorsNeeded >
            file.sectors
        ) {

            file.startSector =
                this.nextFreeSector;

            this.nextFreeSector +=
                sectorsNeeded;
        }

        for(
            let i = 0;
            i < sectorsNeeded;
            i++
        ) {

            const sector =
                new Uint8Array(512);

            sector.set(
                data.slice(
                    i * 512,
                    (i + 1) * 512
                )
            );

            this.disk.writeSector(
                file.startSector + i,
                sector
            );
        }

        file.size =
            data.length;

        file.sectors =
            sectorsNeeded;

        file.modified =
            Date.now();

        console.log(
            "File Written:",
            path
        );
    }

    // =====================================
    // Delete File
    // =====================================

    deleteFile(path) {

        path = this.normalize(path);

        if(!this.files[path]) {

            throw new Error(
                "File not found"
            );
        }

        delete this.files[path];

        const parent =
            path
            .split("/")
            .slice(0, -1)
            .join("/") || "/";

        const name =
            path.split("/")
            .pop();

        this.directories[parent] =
            this.directories[parent]
            .filter(
                x => x !== name
            );

        console.log(
            "File Deleted:",
            path
        );
    }

    // =====================================
    // Exists
    // =====================================

    exists(path) {

        path = this.normalize(path);

        return !!(
            this.files[path] ||
            this.directories[path]
        );
    }

    // =====================================
    // File Info
    // =====================================

    stat(path) {

        path = this.normalize(path);

        if(this.files[path]) {

            return {

                type: "file",

                ...this.files[path]
            };
        }

        if(this.directories[path]) {

            return {

                type: "directory"
            };
        }

        return null;
    }

    // =====================================
    // Save Metadata
    // =====================================

    saveMetadata() {

        const meta = {

            files:
                this.files,

            directories:
                this.directories,

            nextFreeSector:
                this.nextFreeSector
        };

        localStorage.setItem(
            "vfs_metadata",
            JSON.stringify(meta)
        );

        console.log(
            "VFS Metadata Saved"
        );
    }

    // =====================================
    // Load Metadata
    // =====================================

    loadMetadata() {

        const raw =
            localStorage.getItem(
                "vfs_metadata"
            );

        if(!raw) {

            console.warn(
                "No metadata"
            );

            return;
        }

        const meta =
            JSON.parse(raw);

        this.files =
            meta.files;

        this.directories =
            meta.directories;

        this.nextFreeSector =
            meta.nextFreeSector;

        console.log(
            "VFS Metadata Loaded"
        );
    }

    // =====================================
    // Tree
    // =====================================

    tree(path = "/") {

        path = this.normalize(path);

        console.log(path);

        const items =
            this.directories[path]
            || [];

        for(const item of items) {

            const full =
                path === "/"
                ? "/" + item
                : path + "/" + item;

            if(
                this.directories[full]
            ) {

                console.log(
                    "📁",
                    full
                );

            } else {

                console.log(
                    "📄",
                    full
                );
            }
        }
    }

    // =====================================
    // Format
    // =====================================

    format() {

        this.files = {};

        this.directories = {

            "/": []
        };

        this.cwd = "/";

        this.nextFreeSector = 10;

        console.log(
            "Filesystem Formatted"
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            files:
                Object.keys(
                    this.files
                ).length,

            directories:
                Object.keys(
                    this.directories
                ).length,

            nextFreeSector:
                this.nextFreeSector
        };
    }
}