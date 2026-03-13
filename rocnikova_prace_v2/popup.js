const PROJECT_URL = "https://fxevhmvpwgejricjjmkm.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZXZobXZwd2dlanJpY2pqbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzEzMDUsImV4cCI6MjA4MjUwNzMwNX0.JHq1ywJEsKkSNce5e1cAPiW6ksurIA-koYcvHo678f4";
const AUTH_URL = `${PROJECT_URL}/auth/v1`;
const DB_URL = `${PROJECT_URL}/rest/v1/vaults`;

let isRegisterMode = false;

document.getElementById("toggle-mode").onclick = (e) => {
    e.preventDefault();
    isRegisterMode = !isRegisterMode;
    document.getElementById("auth-title").innerText = isRegisterMode ? "Registrace" : "Přihlášení";
    document.getElementById("btn-submit").innerText = isRegisterMode ? "registrovat" : "přihlásit";
    document.getElementById("toggle-mode").innerText = isRegisterMode ? "zpět na přihlášení" : "registrace";
    document.getElementById("error-msg").innerText = "";
};

async function renderVault() {
    const vaultList = document.getElementById("vault-list");
    vaultList.innerHTML = "";
    const storage = await chrome.storage.local.get("vaultData");
    const data = storage.vaultData || [];

    data.forEach(item => {
        const div = document.createElement("div");
        div.className = "vault-item";
        div.innerHTML = `
            <div>
                <strong>${item.site}</strong><br>
                <small>${item.login}</small><br>
                <small>${item.pass}</small>
            </div>
        `;
        vaultList.appendChild(div);
    });
}

document.getElementById("btn-submit").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const errorMsg = document.getElementById("error-msg");
    errorMsg.innerText = "";

    if (!email || !password) {
        errorMsg.innerText = "Vyplňte email i heslo.";
        return;
    }

    document.getElementById("auth-sub").innerText = isRegisterMode ? "Registrace" : "Ověřování";

    try {
        const endpoint = isRegisterMode ? `${AUTH_URL}/signup` : `${AUTH_URL}/token?grant_type=password`;
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "apikey": ANON_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const authData = await res.json();

        if (!res.ok) throw new Error(authData.error_description || authData.msg || "chyba autentizace");

        if (isRegisterMode) {
            alert("Registrace úspěšná ted se přihlaste.");
            document.getElementById("toggle-mode").click();
            return;
        }

        const accessToken = authData.access_token;

        const dbRes = await fetch(`${DB_URL}?user_email=eq.${email}`, {
            headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" }
        });

        if (!dbRes.ok) throw new Error("Chyba při stahování dat");
        const users = await dbRes.json();

        let vaultData = (users.length > 0 && users[0].encrypted_data) ? users[0].encrypted_data : [];

        await chrome.storage.local.set({ vaultData: vaultData, currentUser: email, token: accessToken });

        document.getElementById("screen-auth").classList.add("hidden");
        document.getElementById("screen-vault").classList.remove("hidden");
        document.getElementById("btn-logout").classList.remove("hidden");
        document.getElementById("btn-logout").innerText = "Odhlásit";
        renderVault();

    } catch (err) {
        errorMsg.innerText = err.message;
        document.getElementById("auth-sub").innerText = "Chyba";
    }
};

document.getElementById("btn-save").onclick = async () => {
    const site = document.getElementById("site").value;
    const login = document.getElementById("login").value;
    const pass = document.getElementById("pass").value;

    if (!site || !pass) return alert("Vyplňte web a heslo");

    try {
        const storage = await chrome.storage.local.get(["currentUser", "vaultData", "token"]);
        const email = storage.currentUser;
        const token = storage.token;

        if (!email || !token) return alert("User není přihlášen");

        document.getElementById("loading").classList.remove("hidden");

        let vaultData = storage.vaultData || [];
        vaultData.push({ site, login, pass });

        const headers = { "apikey": ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

        const res = await fetch(`${DB_URL}?user_email=eq.${email}`, { headers });
        const users = await res.json();

        const method = users.length > 0 ? "PATCH" : "POST";
        const query = users.length > 0 ? `?user_email=eq.${email}` : "";

        const saveRes = await fetch(DB_URL + query, {
            method: method,
            headers: headers,
            body: JSON.stringify({ user_email: email, encrypted_data: vaultData })
        });

        if (!saveRes.ok) throw new Error("Chyba při ukládání do database");

        await chrome.storage.local.set({ vaultData: vaultData });

        document.getElementById("loading").classList.add("hidden");
        document.getElementById("site").value = "";
        document.getElementById("login").value = "";
        document.getElementById("pass").value = "";

        renderVault();
    } catch (err) {
        document.getElementById("loading").classList.add("hidden");
        alert(err.message);
    }
};

document.getElementById("btn-logout").onclick = async () => {
    await chrome.storage.local.clear();
    document.getElementById("screen-vault").classList.add("hidden");
    document.getElementById("btn-logout").classList.add("hidden");
    document.getElementById("screen-auth").classList.remove("hidden");
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("auth-sub").innerText = "stahování dat";
    document.getElementById("error-msg").innerText = "";
};