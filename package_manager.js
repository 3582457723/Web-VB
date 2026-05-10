// package_manager.js
// JavaScript Linux Package Manager

class Package {

    constructor(options = {}) {

        // =====================================
        // Basic
        // =====================================

        this.name =
            options.name || "";

        this.version =
            options.version || "1.0.0";

        this.description =
            options.description || "";

        // =====================================
        // Author
        // =====================================

        this.author =
            options.author || "unknown";

        // =====================================
        // Dependencies
        // =====================================

        this.dependencies =
            options.dependencies || [];

        // =====================================
        // Files
        // =====================================

        this.files =
            options.files || {};

        // =====================================
        // Scripts
        // =====================================

        this.scripts =
            options.scripts || {};

        // =====================================
        // Size
        // =====================================

        this.size =
            JSON.stringify(
                this.files
            ).length;

        console.log(
            "Package:",
            this.name
        );
    }
}

// =====================================
// Package Manager
// =====================================

class PackageManager {

    constructor(options = {}) {

        // =====================================
        // VFS
        // =====================================

        this.vfs =
            options.vfs;

        // =====================================
        // Network
        // =====================================

        this.network =
            options.network;

        // =====================================
        // Installed Packages
        // =====================================

        this.installed =
            new Map();

        // =====================================
        // Repository
        // =====================================

        this.repositories = [];

        // =====================================
        // Cache
        // =====================================

        this.cache =
            new Map();

        // =====================================
        // Database Paths
        // =====================================

        this.dbPath =
            "/var/lib/pkg";

        this.cachePath =
            "/var/cache/pkg";

        // =====================================
        // Init
        // =====================================

        this.init();

        console.log(
            "Package Manager Ready"
        );
    }

    // =====================================
    // Init
    // =====================================

    init() {

        this.vfs.mkdir("/var");

        this.vfs.mkdir("/var/lib");

        this.vfs.mkdir(
            this.dbPath
        );

        this.vfs.mkdir(
            "/var/cache"
        );

        this.vfs.mkdir(
            this.cachePath
        );

        this.vfs.createFile(

            this.dbPath
            + "/status.json",

            "{}"
        );

        // Default Repo
        this.addRepository({

            name: "main",

            url:
                "https://repo.jslinux.org"
        });

        // Default Packages
        this.seedPackages();
    }

    // =====================================
    // Seed Repository
    // =====================================

    seedPackages() {

        this.cache.set(

            "nano",

            new Package({

                name: "nano",

                version: "1.0.0",

                description:
                    "Terminal Text Editor",

                files: {

"/bin/nano":
"# nano binary"
                }
            })
        );

        this.cache.set(

            "htop",

            new Package({

                name: "htop",

                version: "3.0.0",

                description:
                    "Process Viewer",

                files: {

"/bin/htop":
"# htop binary"
                }
            })
        );

        this.cache.set(

            "firefox",

            new Package({

                name: "firefox",

                version: "120.0",

                description:
                    "Web Browser",

                dependencies: [
                    "gtk",
                    "libx11"
                ],

                files: {

"/bin/firefox":
"# firefox binary"
                }
            })
        );

        this.cache.set(

            "gcc",

            new Package({

                name: "gcc",

                version: "14.0",

                description:
                    "GNU Compiler",

                files: {

"/bin/gcc":
"# gcc binary"
                }
            })
        );
    }

    // =====================================
    // Repository
    // =====================================

    addRepository(repo) {

        this.repositories
        .push(repo);

        console.log(
            "Repository:",
            repo.name
        );
    }

    // =====================================
    // Install
    // =====================================

    install(name) {

        const pkg =
            this.cache.get(name);

        if(!pkg) {

            console.error(

                "Package not found:",

                name
            );

            return false;
        }

        // =====================================
        // Dependencies
        // =====================================

        for(
            const dep
            of pkg.dependencies
        ) {

            if(
                !this.installed
                .has(dep)
            ) {

                console.log(

                    "Installing dependency:",

                    dep
                );

                this.install(dep);
            }
        }

        // =====================================
        // Install Files
        // =====================================

        for(
            const path
            in pkg.files
        ) {

            const content =
                pkg.files[path];

            this.vfs.createFile(
                path,
                content
            );
        }

        // =====================================
        // Save DB
        // =====================================

        this.installed.set(
            pkg.name,
            pkg
        );

        this.saveStatus();

        // =====================================
        // Postinstall
        // =====================================

        if(
            pkg.scripts
            .postinstall
        ) {

            pkg.scripts
            .postinstall();
        }

        console.log(

            "Installed:",

            pkg.name
        );

        return true;
    }

    // =====================================
    // Remove
    // =====================================

    remove(name) {

        const pkg =
            this.installed
            .get(name);

        if(!pkg) {

            return false;
        }

        // Remove files
        for(
            const path
            in pkg.files
        ) {

            this.vfs.deleteFile(
                path
            );
        }

        this.installed.delete(
            name
        );

        this.saveStatus();

        console.log(

            "Removed:",

            name
        );

        return true;
    }

    // =====================================
    // Upgrade
    // =====================================

    upgrade(name) {

        if(
            !this.installed
            .has(name)
        ) {

            return false;
        }

        this.remove(name);

        return this.install(
            name
        );
    }

    // =====================================
    // Upgrade All
    // =====================================

    update() {

        console.log(
            "Updating repositories..."
        );

        for(
            const repo
            of this.repositories
        ) {

            console.log(

                "Sync:",

                repo.url
            );
        }

        console.log(
            "Done"
        );
    }

    // =====================================
    // Search
    // =====================================

    search(query) {

        const results = [];

        for(
            const pkg
            of this.cache.values()
        ) {

            if(

                pkg.name
                .includes(query)

                ||

                pkg.description
                .includes(query)
            ) {

                results.push(pkg);
            }
        }

        return results;
    }

    // =====================================
    // List Installed
    // =====================================

    listInstalled() {

        return Array.from(

            this.installed
            .values()
        );
    }

    // =====================================
    // Package Info
    // =====================================

    info(name) {

        const pkg =

            this.cache.get(name)

            ||

            this.installed
            .get(name);

        if(!pkg) {

            return null;
        }

        return {

            name:
                pkg.name,

            version:
                pkg.version,

            description:
                pkg.description,

            dependencies:
                pkg.dependencies,

            size:
                pkg.size
        };
    }

    // =====================================
    // Save DB
    // =====================================

    saveStatus() {

        const data = {};

        for(
            const [name, pkg]
            of this.installed
        ) {

            data[name] = {

                version:
                    pkg.version
            };
        }

        this.vfs.writeFile(

            this.dbPath
            + "/status.json",

            JSON.stringify(
                data,
                null,
                2
            )
        );
    }

    // =====================================
    // Load DB
    // =====================================

    loadStatus() {

        try {

            const data =
                JSON.parse(

                    this.vfs.readFile(

                        this.dbPath
                        + "/status.json"
                    )
                );

            console.log(
                data
            );

        } catch(e) {

            console.error(e);
        }
    }

    // =====================================
    // Build Package
    // =====================================

    build(manifest) {

        const pkg =
            new Package(
                manifest
            );

        const blob =
            JSON.stringify(
                pkg,
                null,
                2
            );

        return blob;
    }

    // =====================================
    // Install Package File
    // =====================================

    installFile(blob) {

        const manifest =
            JSON.parse(blob);

        const pkg =
            new Package(
                manifest
            );

        this.cache.set(
            pkg.name,
            pkg
        );

        return this.install(
            pkg.name
        );
    }

    // =====================================
    // Export Package
    // =====================================

    export(name) {

        const pkg =
            this.installed
            .get(name);

        if(!pkg) {

            return null;
        }

        return JSON.stringify(
            pkg,
            null,
            2
        );
    }

    // =====================================
    // Autoremove
    // =====================================

    autoremove() {

        console.log(
            "Autoremove complete"
        );
    }

    // =====================================
    // Clean Cache
    // =====================================

    clean() {

        this.cache.clear();

        console.log(
            "Cache cleaned"
        );
    }

    // =====================================
    // Tree
    // =====================================

    tree() {

        console.log(
            "=== Packages ==="
        );

        for(
            const pkg
            of this.installed
            .values()
        ) {

            console.log(

                `${pkg.name} ${pkg.version}`
            );
        }
    }

    // =====================================
    // CLI
    // =====================================

    cli(args = []) {

        const cmd =
            args[0];

        switch(cmd) {

            case "install":

                return this.install(
                    args[1]
                );

            case "remove":

                return this.remove(
                    args[1]
                );

            case "search":

                return this.search(
                    args[1]
                );

            case "update":

                return this.update();

            case "upgrade":

                return this.upgrade(
                    args[1]
                );

            case "list":

                return this
                .listInstalled();

            case "info":

                return this.info(
                    args[1]
                );

            default:

                console.log(

`pkg install <name>
pkg remove <name>
pkg search <query>
pkg update
pkg list`
                );
        }
    }

    // =====================================
    // Info
    // =====================================

    infoSystem() {

        return {

            installed:
                this.installed
                .size,

            repositories:
                this.repositories
                .length,

            cache:
                this.cache.size
        };
    }
}