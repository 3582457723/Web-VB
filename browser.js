// browser.js
// JavaScript Virtual Web Browser

class BrowserTab {

    constructor(url = "about:blank") {

        // =====================================
        // URL
        // =====================================

        this.url = url;

        // =====================================
        // Title
        // =====================================

        this.title =
            "New Tab";

        // =====================================
        // History
        // =====================================

        this.history = [url];

        this.historyIndex = 0;

        // =====================================
        // HTML
        // =====================================

        this.html = "";

        // =====================================
        // DOM
        // =====================================

        this.dom = null;

        // =====================================
        // Loading
        // =====================================

        this.loading = false;

        // =====================================
        // Scroll
        // =====================================

        this.scrollY = 0;

        console.log(
            "Tab Created:",
            url
        );
    }
}

// =====================================
// Browser
// =====================================

class Browser {

    constructor(options = {}) {

        // =====================================
        // Window Manager
        // =====================================

        this.windowManager =
            options.windowManager;

        // =====================================
        // Network
        // =====================================

        this.network =
            options.network;

        // =====================================
        // VFS
        // =====================================

        this.vfs =
            options.vfs;

        // =====================================
        // Tabs
        // =====================================

        this.tabs = [];

        // =====================================
        // Current Tab
        // =====================================

        this.currentTab = null;

        // =====================================
        // UI
        // =====================================

        this.addressBar =
            "";

        // =====================================
        // Browser Window
        // =====================================

        this.window =
            this.windowManager
            .createWindow({

                title:
                    "JS Browser",

                x: 120,
                y: 80,

                width: 1000,
                height: 700
            });

        // =====================================
        // Renderer
        // =====================================

        this.window.onDraw =
            (fb, win) => {

                this.draw(
                    fb,
                    win
                );
            };

        // =====================================
        // New Tab
        // =====================================

        this.newTab(
            "about:home"
        );

        console.log(
            "Browser Ready"
        );
    }

    // =====================================
    // New Tab
    // =====================================

    newTab(url = "about:blank") {

        const tab =
            new BrowserTab(url);

        this.tabs.push(tab);

        this.currentTab =
            tab;

        this.load(url);

        return tab;
    }

    // =====================================
    // Switch Tab
    // =====================================

    switchTab(index) {

        if(
            index < 0 ||
            index >= this.tabs.length
        ) {

            return;
        }

        this.currentTab =
            this.tabs[index];
    }

    // =====================================
    // Load URL
    // =====================================

    async load(url) {

        const tab =
            this.currentTab;

        if(!tab) {

            return;
        }

        tab.loading = true;

        tab.url = url;

        this.addressBar =
            url;

        console.log(
            "Loading:",
            url
        );

        // =====================================
        // about:
        // =====================================

        if(
            url.startsWith(
                "about:"
            )
        ) {

            tab.html =
                this.aboutPage(
                    url
                );

            tab.loading = false;

            return;
        }

        // =====================================
        // file://
        // =====================================

        if(
            url.startsWith(
                "file://"
            )
        ) {

            const path =
                url.replace(
                    "file://",
                    ""
                );

            tab.html =
                this.vfs.readFile(
                    path
                ) || "File not found";

            tab.loading = false;

            return;
        }

        // =====================================
        // http/https
        // =====================================

        try {

            const response =
                await fetch(url);

            const html =
                await response.text();

            tab.html = html;

            // Title
            const match =
                html.match(

                    /<title>(.*?)<\/title>/i
                );

            if(match) {

                tab.title =
                    match[1];
            }

        } catch(e) {

            tab.html =

`<h1>Network Error</h1>
<p>${e}</p>`;
        }

        tab.loading = false;
    }

    // =====================================
    // About Pages
    // =====================================

    aboutPage(url) {

        switch(url) {

            case "about:home":

                return `
<h1>JavaScript Linux Browser</h1>

<p>Welcome.</p>

<ul>
<li>about:home</li>
<li>about:system</li>
<li>about:memory</li>
<li>about:network</li>
</ul>
`;

            case "about:system":

                return `
<h1>System Info</h1>

<p>JavaScript VM</p>
<p>x86-64 Virtual CPU</p>
<p>8GB RAM</p>
<p>64MB VRAM</p>
`;

            case "about:memory":

                return `
<h1>Memory</h1>

<p>8192 MB RAM</p>
`;

            case "about:network":

                return `
<h1>Network</h1>

<p>Virtual Ethernet Adapter</p>
`;

            default:

                return `
<h1>Unknown Page</h1>
`;
        }
    }

    // =====================================
    // Draw Browser
    // =====================================

    draw(fb, win) {

        const x = win.x;
        const y = win.y;

        const w = win.width;
        const h = win.height;

        // =====================================
        // Background
        // =====================================

        fb.rect(

            x,
            y + 28,

            w,
            h - 28,

            fb.rgb(
                245,
                245,
                245
            )
        );

        // =====================================
        // Toolbar
        // =====================================

        fb.rect(

            x,
            y + 28,

            w,
            42,

            fb.rgb(
                230,
                230,
                230
            )
        );

        // =====================================
        // Tabs
        // =====================================

        let tx = x + 10;

        for(
            let i = 0;
            i < this.tabs.length;
            i++
        ) {

            const tab =
                this.tabs[i];

            const active =
                tab ===
                this.currentTab;

            fb.rect(

                tx,
                y + 30,

                140,
                28,

                active
                    ? fb.rgb(
                        255,
                        255,
                        255
                    )
                    : fb.rgb(
                        180,
                        180,
                        180
                    )
            );

            fb.render();

            fb.text(

                tx + 8,

                y + 48,

                tab.title
                .slice(0, 16),

                "#000000"
            );

            tx += 145;
        }

        // =====================================
        // Address Bar
        // =====================================

        fb.rect(

            x + 10,
            y + 75,

            w - 20,
            30,

            fb.rgb(
                255,
                255,
                255
            )
        );

        fb.render();

        fb.text(

            x + 20,

            y + 96,

            this.addressBar,

            "#000000"
        );

        // =====================================
        // Web Content
        // =====================================

        const tab =
            this.currentTab;

        if(!tab) {

            return;
        }

        const lines =
            tab.html
            .replace(/<[^>]+>/g, "")
            .split("\n");

        let yy =
            y + 130
            - tab.scrollY;

        for(
            const line
            of lines
        ) {

            if(
                yy >
                y + 120
            ) {

                fb.render();

                fb.text(

                    x + 20,

                    yy,

                    line
                    .slice(0, 100),

                    "#000000"
                );
            }

            yy += 20;
        }

        // =====================================
        // Loading
        // =====================================

        if(tab.loading) {

            fb.render();

            fb.text(

                x + w - 120,

                y + 96,

                "Loading...",

                "#0000FF"
            );
        }
    }

    // =====================================
    // Navigate
    // =====================================

    go(url) {

        this.load(url);
    }

    // =====================================
    // Back
    // =====================================

    back() {

        const tab =
            this.currentTab;

        if(
            tab.historyIndex
            <= 0
        ) {

            return;
        }

        tab.historyIndex--;

        this.load(

            tab.history[
                tab.historyIndex
            ]
        );
    }

    // =====================================
    // Forward
    // =====================================

    forward() {

        const tab =
            this.currentTab;

        if(

            tab.historyIndex
            >=
            tab.history.length - 1
        ) {

            return;
        }

        tab.historyIndex++;

        this.load(

            tab.history[
                tab.historyIndex
            ]
        );
    }

    // =====================================
    // Reload
    // =====================================

    reload() {

        if(
            this.currentTab
        ) {

            this.load(

                this.currentTab.url
            );
        }
    }

    // =====================================
    // Download
    // =====================================

    download(path, data) {

        this.vfs.writeFile(
            path,
            data
        );

        console.log(
            "Downloaded:",
            path
        );
    }

    // =====================================
    // Save Page
    // =====================================

    savePage(path) {

        if(
            !this.currentTab
        ) {

            return;
        }

        this.vfs.writeFile(

            path,

            this.currentTab.html
        );
    }

    // =====================================
    // Search
    // =====================================

    search(query) {

        this.go(

            "https://www.google.com/search?q="
            +
            encodeURIComponent(
                query
            )
        );
    }

    // =====================================
    // Bookmark
    // =====================================

    bookmark() {

        if(
            !this.currentTab
        ) {

            return;
        }

        const data = {

            title:
                this.currentTab
                .title,

            url:
                this.currentTab
                .url
        };

        const bookmarks =
            JSON.parse(

                this.vfs.readFile(
                    "/root/bookmarks.json"
                ) || "[]"
            );

        bookmarks.push(data);

        this.vfs.writeFile(

            "/root/bookmarks.json",

            JSON.stringify(
                bookmarks,
                null,
                2
            )
        );
    }

    // =====================================
    // Info
    // =====================================

    info() {

        return {

            tabs:
                this.tabs.length,

            current:
                this.currentTab
                ?.url,

            title:
                this.currentTab
                ?.title
        };
    }
}