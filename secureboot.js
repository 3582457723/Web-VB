// secureboot.js
// Virtual Secure Boot System

class SecureBoot {

    constructor() {

        // =====================================
        // Trusted Keys
        // =====================================

        this.keys = [];

        // =====================================
        // Secure Boot State
        // =====================================

        this.enabled = true;

        console.log(
            "Secure Boot Ready"
        );
    }

    // =====================================
    // Add Trusted Key
    // =====================================

    addKey(key) {

        this.keys.push(key);

        console.log(
            "Trusted key added"
        );
    }

    // =====================================
    // Remove Trusted Key
    // =====================================

    removeKey(key) {

        this.keys =
            this.keys.filter(
                k => k !== key
            );

        console.log(
            "Trusted key removed"
        );
    }

    // =====================================
    // Hash
    // =====================================

    async sha256(data) {

        const hash =
            await crypto.subtle.digest(
                "SHA-256",
                data
            );

        return Array.from(
            new Uint8Array(hash)
        )
        .map(x =>
            x.toString(16)
            .padStart(2, "0")
        )
        .join("");
    }

    // =====================================
    // Verify
    // =====================================

    async verify(binary) {

        if(!this.enabled) {

            console.log(
                "Secure Boot Bypassed"
            );

            return true;
        }

        const hash =
            await this.sha256(binary);

        console.log(
            "Binary Hash:",
            hash
        );

        const trusted =
            this.keys.includes(hash);

        if(trusted) {

            console.log(
                "Secure Boot PASS"
            );

            return true;
        }

        console.log(
            "Secure Boot FAIL"
        );

        return false;
    }

    // =====================================
    // Enable
    // =====================================

    enable() {

        this.enabled = true;

        console.log(
            "Secure Boot Enabled"
        );
    }

    // =====================================
    // Disable
    // =====================================

    disable() {

        this.enabled = false;

        console.log(
            "Secure Boot Disabled"
        );
    }
}