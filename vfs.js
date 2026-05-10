// vfs.js
// Virtual File System Layer

class VFSNode {

    constructor(options = {}) {

        // =====================================
        // Basic
        // =====================================

        this.name =
            options.name || "";

        this.type =
            options.type || "file";

        // file
        // dir
        // device
        // symlink

        this.parent =
            options.parent || null;

        // =====================================
        // Metadata
        // =====================================

        this.uid =
            options.uid || 0;

        this.gid =
            options.gid || 0;

        this.mode =
            options.mode || 0o755;

        this.created =
            Date.now();

        this.modified =
            Date.now();

        // =====================================
        // Data
        // =====================================

        this.content =
            options.content
            || new Uint8Array(0);

        // =====================================
        // Children
        // =====================================

        this.children =
            new Map();

        // =====================================
        // Filesystem Driver
        // =====================================

        this.fs =
            options.fs || null;

        // =====================================
        // Mounted Filesystem
        // =====================================

        this.mount =
            null;
    }

    // =====================================
    // Path
    // =====================================

    path() {

        if(!this.parent) {

            return "/";
        }

        const parts = [];

        let node = this;

        while(node.parent) {

            parts.unshift(
                node.name
            );

            node = node.parent;
        }

        return "/" +
            parts.join("/");
    }

    // =====================================
    // Add Child
    // =====================================

    add(node) {

        node.parent = this;

        this.children.set(
            node.name,
            node
        );

        this.modified =
            Date.now();
    }

    // =====================================
    // Remove Child
    // =====================================

    remove(name) {

        this.children.delete(name);

        this.modified =
            Date.now();
    }

    // =====================================
    // Get Child
    // =====================================

    get(name) {

        return this.children.get(name);
    }

    // =====================================
    // Is Directory
    // =====================================

    isDirectory() {

        return this.type === "dir";
    }

    // =====================================
    // Is File
    // =====================================

    isFile() {

        return this.type === "file";
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            name:
                this.name,

            type:
                this.type,

            path:
                this.path(),

            size:
                this.content.length,

            children:
                this.children.size
        };
    }
}

// =====================================
// Virtual File System
// =====================================

class VFS {

    constructor(options = {}) {

        // =====================================
        // Root
        // =====================================

        this.root =
            new VFSNode({

                name: "",

                type: "dir"
            });

        // =====================================
        // Mount Points
        // =====================================

        this.mounts = [];

        // =====================================
        // Open Files
        // =====================================

        this.openFiles =
            new Map();

        // =====================================
        // FD Counter
        // =====================================

        this.nextFD = 3;

        // =====================================
        // Drivers
        // =====================================

        this.drivers = {};

        console.log(
            "VFS Ready"
        );

        // =====================================
        // Base Directories
        // =====================================

        this.mkdir("/bin");
        this.mkdir("/dev");
        this.mkdir("/etc");
        this.mkdir("/home");
        this.mkdir("/root");
        this.mkdir("/tmp");
        this.mkdir("/usr");
    }

    // =====================================
    // Normalize Path
    // =====================================

    normalize(path) {

        return path
            .replace(/\/+/g, "/")
            .replace(/\/$/, "")
            || "/";
    }

    // =====================================
    // Resolve Path
    // =====================================

    resolve(path) {

        path =
            this.normalize(path);

        if(path === "/") {

            return this.root;
        }

        const parts =
            path
            .split("/")
            .filter(Boolean);

        let current =
            this.root;

        for(
            const part
            of parts
        ) {

            // Mounted FS
            if(current.mount) {

                return current.mount
                .resolve(
                    "/" +
                    parts.join("/")
                );
            }

            current =
                current.get(part);

            if(!current) {

                return null;
            }
        }

        return current;
    }

    // =====================================
    // mkdir
    // =====================================

    mkdir(path) {

        path =
            this.normalize(path);

        const parts =
            path
            .split("/")
            .filter(Boolean);

        let current =
            this.root;

        for(
            const part
            of parts
        ) {

            let next =
                current.get(part);

            if(!next) {

                next =
                    new VFSNode({

                        name: part,

                        type: "dir"
                    });

                current.add(next);
            }

            current = next;
        }

        return current;
    }

    // =====================================
    // createFile
    // =====================================

    createFile(
        path,
        content = ""
    ) {

        path =
            this.normalize(path);

        const parts =
            path
            .split("/")
            .filter(Boolean);

        const fileName =
            parts.pop();

        const parent =
            this.mkdir(
                "/" +
                parts.join("/")
            );

        const encoder =
            new TextEncoder();

        const node =
            new VFSNode({

                name:
                    fileName,

                type:
                    "file",

                content:
                    encoder.encode(
                        content
                    )
            });

        parent.add(node);

        console.log(
            "VFS File:",
            path
        );

        return node;
    }

    // =====================================
    // readFile
    // =====================================

    readFile(path) {

        const node =
            this.resolve(path);

        if(
            !node ||
            !node.isFile()
        ) {

            throw new Error(
                "File Not Found"
            );
        }

        return new TextDecoder()
        .decode(node.content);
    }

    // =====================================
    // writeFile
    // =====================================

    writeFile(
        path,
        content
    ) {

        let node =
            this.resolve(path);

        if(!node) {

            node =
                this.createFile(path);
        }

        const encoder =
            new TextEncoder();

        node.content =
            encoder.encode(content);

        node.modified =
            Date.now();

        return true;
    }

    // =====================================
    // deleteFile
    // =====================================

    deleteFile(path) {

        const node =
            this.resolve(path);

        if(
            !node ||
            !node.parent
        ) {

            return false;
        }

        node.parent.remove(
            node.name
        );

        console.log(
            "VFS Delete:",
            path
        );

        return true;
    }

    // =====================================
    // ls
    // =====================================

    ls(path = "/") {

        const node =
            this.resolve(path);

        if(
            !node ||
            !node.isDirectory()
        ) {

            return [];
        }

        return Array.from(

            node.children.values()
        );
    }

    // =====================================
    // Mount Filesystem
    // =====================================

    mount(
        path,
        fs
    ) {

        const node =
            this.resolve(path);

        if(!node) {

            throw new Error(
                "Mount Path Missing"
            );
        }

        node.mount = fs;

        this.mounts.push({

            path,
            fs
        });

        console.log(
            "Mounted FS:",
            path
        );
    }

    // =====================================
    // Unmount
    // =====================================

    unmount(path) {

        const node =
            this.resolve(path);

        if(!node) {

            return false;
        }

        node.mount = null;

        this.mounts =
            this.mounts.filter(

                m => m.path !== path
            );

        return true;
    }

    // =====================================
    // Open
    // =====================================

    open(path) {

        const node =
            this.resolve(path);

        if(!node) {

            return -1;
        }

        const fd =
            this.nextFD++;

        this.openFiles.set(

            fd,

            {

                node,

                offset: 0
            }
        );

        return fd;
    }

    // =====================================
    // Close
    // =====================================

    close(fd) {

        return this.openFiles
        .delete(fd);
    }

    // =====================================
    // Read FD
    // =====================================

    read(
        fd,
        size
    ) {

        const file =
            this.openFiles.get(fd);

        if(!file) {

            return null;
        }

        const data =
            file.node.content
            .slice(

                file.offset,

                file.offset + size
            );

        file.offset +=
            data.length;

        return data;
    }

    // =====================================
    // Write FD
    // =====================================

    write(
        fd,
        data
    ) {

        const file =
            this.openFiles.get(fd);

        if(!file) {

            return false;
        }

        const old =
            file.node.content;

        const combined =
            new Uint8Array(

                old.length
                + data.length
            );

        combined.set(old, 0);

        combined.set(
            data,
            old.length
        );

        file.node.content =
            combined;

        return true;
    }

    // =====================================
    // Symlink
    // =====================================

    symlink(
        target,
        path
    ) {

        const parts =
            path
            .split("/")
            .filter(Boolean);

        const name =
            parts.pop();

        const parent =
            this.mkdir(

                "/" +
                parts.join("/")
            );

        const node =
            new VFSNode({

                name,

                type:
                    "symlink",

                content:
                    new TextEncoder()
                    .encode(target)
            });

        parent.add(node);

        return node;
    }

    // =====================================
    // Register Driver
    // =====================================

    registerDriver(
        name,
        driver
    ) {

        this.drivers[name] =
            driver;
    }

    // =====================================
    // Tree
    // =====================================

    tree(
        node = this.root,
        indent = ""
    ) {

        console.log(

            indent +

            (
                node.name || "/"
            )
        );

        for(
            const child
            of node.children.values()
        ) {

            this.tree(
                child,
                indent + "  "
            );
        }
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            mounts:
                this.mounts.length,

            openFiles:
                this.openFiles.size,

            drivers:
                Object.keys(
                    this.drivers
                )
                .length
        };
    }
}