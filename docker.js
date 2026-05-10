// docker.js
// JavaScript Container Runtime

class ContainerImage {

    constructor(options = {}) {

        // =====================================
        // Basic
        // =====================================

        this.name =
            options.name || "image";

        this.tag =
            options.tag || "latest";

        // =====================================
        // Layers
        // =====================================

        this.layers =
            options.layers || [];

        // =====================================
        // Environment
        // =====================================

        this.env =
            options.env || {};

        // =====================================
        // Entrypoint
        // =====================================

        this.entrypoint =
            options.entrypoint || "/bin/sh";

        // =====================================
        // Filesystem
        // =====================================

        this.filesystem =
            options.filesystem || {};

        // =====================================
        // Metadata
        // =====================================

        this.created =
            Date.now();

        this.id =
            crypto.randomUUID();

        console.log(
            "Container Image:",
            this.name
        );
    }

    // =====================================
    // Full Name
    // =====================================

    fullName() {

        return `${this.name}:${this.tag}`;
    }

    // =====================================
    // Export
    // =====================================

    export() {

        return JSON.stringify({

            name:
                this.name,

            tag:
                this.tag,

            env:
                this.env,

            entrypoint:
                this.entrypoint,

            filesystem:
                this.filesystem
        });
    }
}

// =====================================
// Container
// =====================================

class Container {

    constructor(options = {}) {

        // =====================================
        // Image
        // =====================================

        this.image =
            options.image;

        // =====================================
        // Name
        // =====================================

        this.name =
            options.name ||
            `container-${
                Math.random()
                .toString(16)
                .slice(2)
            }`;

        // =====================================
        // ID
        // =====================================

        this.id =
            crypto.randomUUID();

        // =====================================
        // Runtime
        // =====================================

        this.running = false;

        this.paused = false;

        this.startedAt = 0;

        // =====================================
        // PID Namespace
        // =====================================

        this.processes = [];

        // =====================================
        // Virtual Filesystem
        // =====================================

        this.fs =
            structuredClone(
                this.image
                .filesystem
            );

        // =====================================
        // Network Namespace
        // =====================================

        this.ip =
            `172.18.0.${
                Math.floor(
                    Math.random()
                    * 200
                ) + 2
            }`;

        // =====================================
        // Volumes
        // =====================================

        this.volumes = [];

        // =====================================
        // Logs
        // =====================================

        this.logs = [];

        // =====================================
        // Environment
        // =====================================

        this.env =
            structuredClone(
                this.image.env
            );

        // =====================================
        // Limits
        // =====================================

        this.memoryLimit =
            options.memoryLimit
            || 512;

        this.cpuLimit =
            options.cpuLimit
            || 1;

        console.log(
            "Container:",
            this.name
        );
    }

    // =====================================
    // Start
    // =====================================

    start() {

        if(this.running) {

            return;
        }

        this.running = true;

        this.startedAt =
            Date.now();

        this.log(
            "Container started"
        );

        // =====================================
        // Entrypoint
        // =====================================

        this.exec(
            this.image.entrypoint
        );

        console.log(

            `[CONTAINER] ${this.name} started`
        );
    }

    // =====================================
    // Stop
    // =====================================

    stop() {

        this.running = false;

        this.processes = [];

        this.log(
            "Container stopped"
        );

        console.log(

            `[CONTAINER] ${this.name} stopped`
        );
    }

    // =====================================
    // Pause
    // =====================================

    pause() {

        this.paused = true;

        this.log("Paused");
    }

    // =====================================
    // Resume
    // =====================================

    resume() {

        this.paused = false;

        this.log("Resumed");
    }

    // =====================================
    // Execute
    // =====================================

    exec(command) {

        const pid =
            Math.floor(
                Math.random()
                * 65535
            );

        const proc = {

            pid,
            command,

            started:
                Date.now()
        };

        this.processes.push(
            proc
        );

        this.log(
            `exec: ${command}`
        );

        console.log(

            `[${this.name}] EXEC:`,
            command
        );

        return pid;
    }

    // =====================================
    // Kill Process
    // =====================================

    kill(pid) {

        const index =
            this.processes
            .findIndex(

                p =>
                p.pid === pid
            );

        if(index === -1) {

            return false;
        }

        this.processes.splice(
            index,
            1
        );

        this.log(
            `killed: ${pid}`
        );

        return true;
    }

    // =====================================
    // File Write
    // =====================================

    writeFile(
        path,
        data
    ) {

        this.fs[path] = data;

        this.log(
            `write: ${path}`
        );
    }

    // =====================================
    // File Read
    // =====================================

    readFile(path) {

        return this.fs[path];
    }

    // =====================================
    // Mount Volume
    // =====================================

    mount(host, guest) {

        this.volumes.push({

            host,
            guest
        });

        this.log(

            `mount ${host} -> ${guest}`
        );
    }

    // =====================================
    // Log
    // =====================================

    log(msg) {

        this.logs.push({

            time:
                Date.now(),

            msg
        });
    }

    // =====================================
    // Inspect
    // =====================================

    inspect() {

        return {

            id:
                this.id,

            name:
                this.name,

            running:
                this.running,

            paused:
                this.paused,

            ip:
                this.ip,

            processes:
                this.processes
                .length,

            memory:
                this.memoryLimit,

            cpu:
                this.cpuLimit
        };
    }
}

// =====================================
// Docker Runtime
// =====================================

class DockerRuntime {

    constructor(options = {}) {

        // =====================================
        // Images
        // =====================================

        this.images =
            new Map();

        // =====================================
        // Containers
        // =====================================

        this.containers =
            new Map();

        // =====================================
        // Registry
        // =====================================

        this.registry =

            "https://registry.jsdocker.org";

        // =====================================
        // Networks
        // =====================================

        this.networks = [];

        // =====================================
        // Volumes
        // =====================================

        this.volumes = [];

        console.log(
            "Docker Runtime Ready"
        );
    }

    // =====================================
    // Build Image
    // =====================================

    build(options = {}) {

        const image =
            new ContainerImage(
                options
            );

        this.images.set(

            image.fullName(),

            image
        );

        console.log(

            "[DOCKER] Build:",

            image.fullName()
        );

        return image;
    }

    // =====================================
    // Run Container
    // =====================================

    run(
        imageName,
        options = {}
    ) {

        const image =
            this.images.get(
                imageName
            );

        if(!image) {

            console.error(
                "Image not found"
            );

            return null;
        }

        const container =
            new Container({

                image,

                name:
                    options.name,

                memoryLimit:
                    options.memory,

                cpuLimit:
                    options.cpu
            });

        this.containers.set(

            container.id,

            container
        );

        container.start();

        return container;
    }

    // =====================================
    // Stop Container
    // =====================================

    stop(id) {

        const c =
            this.containers
            .get(id);

        if(!c) {

            return false;
        }

        c.stop();

        return true;
    }

    // =====================================
    // Remove Container
    // =====================================

    rm(id) {

        const c =
            this.containers
            .get(id);

        if(!c) {

            return false;
        }

        c.stop();

        this.containers
        .delete(id);

        console.log(
            "Container removed"
        );

        return true;
    }

    // =====================================
    // List Containers
    // =====================================

    ps() {

        return Array.from(

            this.containers
            .values()

        ).map(

            c => c.inspect()
        );
    }

    // =====================================
    // List Images
    // =====================================

    imagesList() {

        return Array.from(

            this.images
            .values()

        ).map(

            i => ({

                name:
                    i.fullName()
            })
        );
    }

    // =====================================
    // Pull
    // =====================================

    pull(name) {

        console.log(

            "[DOCKER] Pull:",

            name
        );

        // Simulated pull
        const image =
            new ContainerImage({

                name,

                filesystem: {

"/bin/sh":
"shell"
                }
            });

        this.images.set(

            image.fullName(),

            image
        );

        return image;
    }

    // =====================================
    // Push
    // =====================================

    push(name) {

        console.log(

            "[DOCKER] Push:",

            name
        );

        return true;
    }

    // =====================================
    // Commit
    // =====================================

    commit(
        containerId,
        imageName
    ) {

        const c =
            this.containers
            .get(containerId);

        if(!c) {

            return null;
        }

        return this.build({

            name:
                imageName,

            filesystem:
                c.fs,

            env:
                c.env
        });
    }

    // =====================================
    // Network
    // =====================================

    createNetwork(name) {

        const net = {

            name,

            subnet:
                `172.18.${
                    this.networks.length
                }.0/24`
        };

        this.networks.push(
            net
        );

        return net;
    }

    // =====================================
    // Volume
    // =====================================

    createVolume(name) {

        const vol = {

            name,

            files: {}
        };

        this.volumes.push(
            vol
        );

        return vol;
    }

    // =====================================
    // Stats
    // =====================================

    stats() {

        return {

            images:
                this.images.size,

            containers:
                this.containers
                .size,

            networks:
                this.networks
                .length,

            volumes:
                this.volumes
                .length
        };
    }

    // =====================================
    // CLI
    // =====================================

    cli(args = []) {

        const cmd =
            args[0];

        switch(cmd) {

            case "run":

                return this.run(
                    args[1]
                );

            case "pull":

                return this.pull(
                    args[1]
                );

            case "ps":

                return this.ps();

            case "images":

                return this.imagesList();

            default:

                console.log(

`docker run <image>
docker pull <image>
docker ps
docker images`
                );
        }
    }
}