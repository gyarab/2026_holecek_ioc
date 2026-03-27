const PUBLIC_API_KEY = "https://fxevhmvpwgejricjjmkm.supabase.co";
const PUBLIC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZXZobXZwd2dlanJpY2pqbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzEzMDUsImV4cCI6MjA4MjUwNzMwNX0.JHq1ywJEsKkSNce5e1cAPiW6ksurIA-koYcvHo678f4";
const AUTHENTICATION_PATH = `${PUBLIC_API_KEY}/auth/v1`;
const DATA_PATH = `${PUBLIC_API_KEY}/rest/v1/vaults`;

let isRegistrated = false;
let sessionMasterKey = null;

document.getElementById("toggle-mode").onclick = (event) => {
    event.preventDefault();
    isRegistrated = !isRegistrated;
    document.getElementById("auth-title").innerText = isRegistrated ? "Signup" : "Login";
    document.getElementById("btn-submit").innerText = isRegistrated ? "Signup" : "Login";
    document.getElementById("toggle-mode").innerText = isRegistrated ? "Switch to Login" : "Switch to Signup";
    document.getElementById("error-msg").innerText = "";
};

async function vytvorKlic(password, sul) {
    const coder = new TextEncoder();
    const base = await crypto.subtle.importKey("raw", coder.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: sul, iterations: 100000, hash: "SHA-256" },
        base,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function encrypt(data, password) {
    const sul = crypto.getRandomValues(new Uint8Array(16));
    const inicializacni_vector = crypto.getRandomValues(new Uint8Array(12));
    const key = await vytvorKlic(password, sul);
    const coder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: inicializacni_vector }, key, coder.encode(JSON.stringify(data)));
    return {
        obsah: bufferToBase64(encrypted),
        s: bufferToBase64(sul),
        v: bufferToBase64(inicializacni_vector)
    };
}

async function decrypt(object, password) {
    try {
        const sul = new Uint8Array(atob(object.s).split("").map(c => c.charCodeAt(0)));
        const inicializacni_vector = new Uint8Array(atob(object.v).split("").map(c => c.charCodeAt(0)));
        const encrypted = new Uint8Array(atob(object.obsah).split("").map(c => c.charCodeAt(0)));
        const key = await vytvorKlic(password, sul);
        const de_buffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: inicializacni_vector }, key, encrypted);
        return JSON.parse(new TextDecoder().decode(de_buffer));
    } catch (error) {
        return [];
    }
}

async function printList() {
    const list = document.getElementById("vault-list");
    list.innerHTML = "";
    const storage = await chrome.storage.local.get("vaultData");
    const items = storage.vaultData || [];

    items.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "vault-item";
        itemDiv.textContent = `${item.site} | ${item.login} | ${item.pass}`;
        list.appendChild(itemDiv);
    });
}

document.getElementById("btn-submit").onclick = async () => {
    const rawLogin = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const errorBox = document.getElementById("error-msg");
    errorBox.innerText = "";

    if (!rawLogin || !password) {
        errorBox.innerText = "Vyplň všechna pole!";
        return;
    }

    const email = rawLogin.includes("@") ? rawLogin : `${rawLogin}@foxpass.local`;
    document.getElementById("auth-sub").innerText = "Zpracovávám...";

    try {
        const url = isRegistrated ? `${AUTHENTICATION_PATH}/signup` : `${AUTHENTICATION_PATH}/token?grant_type=password`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "apikey": PUBLIC_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error_description || result.msg || "Chyba autentizace");

        if (isRegistrated) {
            alert("Registrace proběhla. Nyní se přihlas.");
            document.getElementById("toggle-mode").click();
            document.getElementById("auth-sub").innerText = "";
            return;
        }

        const token = result.access_token;
        const dbResponse = await fetch(`${DATA_PATH}?user_email=eq.${email}`, {
            headers: { "apikey": PUBLIC_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
        });

        if (!dbResponse.ok) throw new Error("Chyba při stahování dat");
        const rows = await dbResponse.json();

        let decryptedData = [];
        if (rows.length > 0 && rows[0].encrypted_data) {
            decryptedData = await decrypt(rows[0].encrypted_data, password);
        }

        sessionMasterKey = password;
        await chrome.storage.local.set({ vaultData: decryptedData, currentUser: email, token: token });

        document.getElementById("screen-auth").classList.add("hidden");
        document.getElementById("screen-vault").classList.remove("hidden");
        printList();

    } catch (error) {
        errorBox.innerText = error.message;
        document.getElementById("auth-sub").innerText = "";
    }
};

document.getElementById("btn-save").onclick = async () => {
    const site = document.getElementById("site").value.trim();
    const login = document.getElementById("login").value.trim();
    const pass = document.getElementById("pass").value;

    if (!site || !pass) {
        alert("Vyplň minimálně web a heslo!");
        return;
    }

    try {
        const state = await chrome.storage.local.get(["currentUser", "vaultData", "token"]);
        if (!state.currentUser || !state.token || !sessionMasterKey) {
            alert("Nejsi přihlášený!");
            return;
        }

        document.getElementById("loading").classList.remove("hidden");

        let data = state.vaultData || [];
        data.push({ site: site, login: login, pass: pass });
        const encryptedBundle = await encrypt(data, sessionMasterKey);

        const check = await fetch(`${DATA_PATH}?user_email=eq.${state.currentUser}`, {
            headers: { "apikey": PUBLIC_KEY, "Authorization": `Bearer ${state.token}` }
        });
        const existing = await check.json();

        const method = existing.length > 0 ? "PATCH" : "POST";
        const target = existing.length > 0 ? `?user_email=eq.${state.currentUser}` : "";

        const finalSave = await fetch(DATA_PATH + target, {
            method: method,
            headers: { "apikey": PUBLIC_KEY, "Authorization": `Bearer ${state.token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ user_email: state.currentUser, encrypted_data: encryptedBundle })
        });

        if (!finalSave.ok) throw new Error("Uložení na server selhalo");

        await chrome.storage.local.set({ vaultData: data });
        document.getElementById("loading").classList.add("hidden");
        document.getElementById("site").value = "";
        document.getElementById("login").value = "";
        document.getElementById("pass").value = "";
        printList();
    } catch (error) {
        document.getElementById("loading").classList.add("hidden");
        alert(error.message);
    }
};

document.getElementById("btn-logout").onclick = async () => {
    sessionMasterKey = null;
    await chrome.storage.local.clear();
    document.getElementById("screen-vault").classList.add("hidden");
    document.getElementById("screen-auth").classList.remove("hidden");
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("auth-sub").innerText = "";
    document.getElementById("error-msg").innerText = "";
};