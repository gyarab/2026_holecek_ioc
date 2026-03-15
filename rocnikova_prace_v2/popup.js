const ADRESA_API = "https://fxevhmvpwgejricjjmkm.supabase.co";
const VEREJNY_KLIC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZXZobXZwd2dlanJpY2pqbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzEzMDUsImV4cCI6MjA4MjUwNzMwNX0.JHq1ywJEsKkSNce5e1cAPiW6ksurIA-koYcvHo678f4";
const AUTH_CESTA = `${ADRESA_API}/auth/v1`;
const DATA_CESTA = `${ADRESA_API}/rest/v1/vaults`;

let jeRegistrace = false;

document.getElementById("toggle-mode").onclick = (udalost) => {
    udalost.preventDefault();
    jeRegistrace = !jeRegistrace;
    document.getElementById("auth-title").innerText = jeRegistrace ? "Nová registrace" : "Přihlášení uživatele";
    document.getElementById("btn-submit").innerText = jeRegistrace ? "registrovat" : "přihlásit";
    document.getElementById("toggle-mode").innerText = jeRegistrace ? "už mám účet" : "chci se registrovat";
    document.getElementById("error-msg").innerText = "";
};

async function udelejHash(text) {
    const kodovac = new TextEncoder();
    const buffer = await crypto.subtle.digest("SHA-256", kodovac.encode(text));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function vytvorKlic(heslo, sul) {
    const kodovac = new TextEncoder();
    const zaklad = await crypto.subtle.importKey("raw", kodovac.encode(heslo), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: sul, iterations: 100000, hash: "SHA-256" },
        zaklad,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function zasifruj(data, heslo) {
    const sul = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const klic = await vytvorKlic(heslo, sul);
    const kodovac = new TextEncoder();
    const zasifrovano = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, klic, kodovac.encode(JSON.stringify(data)));
    return {
        obsah: btoa(String.fromCharCode(...new Uint8Array(zasifrovano))),
        s: btoa(String.fromCharCode(...sul)),
        v: btoa(String.fromCharCode(...iv))
    };
}

async function odsifruj(objekt, heslo) {
    try {
        const sul = new Uint8Array(atob(objekt.s).split("").map(c => c.charCodeAt(0)));
        const iv = new Uint8Array(atob(objekt.v).split("").map(c => c.charCodeAt(0)));
        const zasifrovano = new Uint8Array(atob(objekt.obsah).split("").map(c => c.charCodeAt(0)));
        const klic = await vytvorKlic(heslo, sul);
        const de_buffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, klic, zasifrovano);
        return JSON.parse(new TextDecoder().decode(de_buffer));
    } catch (chyba) {
        return [];
    }
}

async function prekresliSeznam() {
    const seznam = document.getElementById("vault-list");
    seznam.innerHTML = "";
    const uloziste = await chrome.storage.local.get("vaultData");
    const polozky = uloziste.vaultData || [];

    polozky.forEach(p => {
        const div = document.createElement("div");
        div.className = "vault-item";
        div.innerHTML = `
            <div>
                <strong>${p.site}</strong>  

                <small>${p.login}</small>  

                <small>${p.pass}</small>
            </div>
        `;
        seznam.appendChild(div);
    });
}

document.getElementById("btn-submit").onclick = async () => {
    const mail = document.getElementById("email").value.trim();
    const heslo = document.getElementById("password").value;
    const chyba_box = document.getElementById("error-msg");
    chyba_box.innerText = "";

    if (!mail || !heslo) {
        chyba_box.innerText = "Vyplň všechna pole!";
        return;
    }

    document.getElementById("auth-sub").innerText = jeRegistrace ? "Registruji..." : "Ověřuji...";

    try {
        const hashProAuth = await udelejHash(heslo);
        const url = jeRegistrace ? `${AUTH_CESTA}/signup` : `${AUTH_CESTA}/token?grant_type=password`;
        const odpoved = await fetch(url, {
            method: "POST",
            headers: { "apikey": VEREJNY_KLIC, "Content-Type": "application/json" },
            body: JSON.stringify({ email: mail, password: hashProAuth })
        });

        const vysledek = await odpoved.json();

        if (!odpoved.ok) throw new Error(vysledek.error_description || vysledek.msg || "Chyba při auth");

        if (jeRegistrace) {
            alert("Registrace proběhla, teď se přihlas.");
            document.getElementById("toggle-mode").click();
            return;
        }

        const token = vysledek.access_token;

        const db_odpoved = await fetch(`${DATA_CESTA}?user_email=eq.${mail}`, {
            headers: { "apikey": VEREJNY_KLIC, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });

        if (!db_odpoved.ok) throw new Error("Nepodařilo se stáhnout data");
        const radky = await db_odpoved.json();

        let desifrovanaData = [];
        if (radky.length > 0 && radky[0].encrypted_data) {
            desifrovanaData = await odsifruj(radky[0].encrypted_data, heslo);
        }

        await chrome.storage.local.set({ vaultData: desifrovanaData, currentUser: mail, token: token, masterKey: heslo });

        document.getElementById("screen-auth").classList.add("hidden");
        document.getElementById("screen-vault").classList.remove("hidden");
        document.getElementById("btn-logout").classList.remove("hidden");
        document.getElementById("btn-logout").innerText = "Odhlásit";
        prekresliSeznam();

    } catch (e) {
        chyba_box.innerText = e.message;
        document.getElementById("auth-sub").innerText = "Chyba!";
    }
};

document.getElementById("btn-save").onclick = async () => {
    const web = document.getElementById("site").value;
    const jmeno = document.getElementById("login").value;
    const pass = document.getElementById("pass").value;

    if (!web || !pass) return alert("Musíš vyplnit web a heslo!");

    try {
        const stav = await chrome.storage.local.get(["currentUser", "vaultData", "token", "masterKey"]);
        const uzivatel = stav.currentUser;
        const token = stav.token;
        const klic = stav.masterKey;

        if (!uzivatel || !token || !klic) return alert("Nejsi přihlášený!");

        document.getElementById("loading").classList.remove("hidden");

        let data = stav.vaultData || [];
        data.push({ site: web, login: jmeno, pass: pass });

        const zasifrovanyBalik = await zasifruj(data, klic);

        const hlavicky = { "apikey": VEREJNY_KLIC, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

        const kontrola = await fetch(`${DATA_CESTA}?user_email=eq.${uzivatel}`, { headers: hlavicky });
        const existujici = await kontrola.json();

        const metoda = existujici.length > 0 ? "PATCH" : "POST";
        const cil = existujici.length > 0 ? `?user_email=eq.${uzivatel}` : "";

        const finalni_ulozeni = await fetch(DATA_CESTA + cil, {
            method: metoda,
            headers: hlavicky,
            body: JSON.stringify({ user_email: uzivatel, encrypted_data: zasifrovanyBalik })
        });

        if (!finalni_ulozeni.ok) throw new Error("Ukládání na cloud selhalo");

        await chrome.storage.local.set({ vaultData: data });

        document.getElementById("loading").classList.add("hidden");
        document.getElementById("site").value = "";
        document.getElementById("login").value = "";
        document.getElementById("pass").value = "";

        prekresliSeznam();
    } catch (e) {
        document.getElementById("loading").classList.add("hidden");
        alert(e.message);
    }
};

document.getElementById("btn-logout").onclick = async () => {
    await chrome.storage.local.clear();
    document.getElementById("screen-vault").classList.add("hidden");
    document.getElementById("btn-logout").classList.add("hidden");
    document.getElementById("screen-auth").classList.remove("hidden");
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("auth-sub").innerText = "připraveno";
    document.getElementById("error-msg").innerText = "";
};
