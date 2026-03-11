const URL = "https://fxevhmvpwgejricjjmkm.supabase.co/rest/v1/vaults";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZXZobXZwd2dlanJpY2pqbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzEzMDUsImV4cCI6MjA4MjUwNzMwNX0.JHq1ywJEsKkSNce5e1cAPiW6ksurIA-koYcvHo678f4";
const headers = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" };

document.getElementById("btn-submit").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    if (!email) return alert("Zadejte email");

    document.getElementById("auth-sub").innerText = "Stahování dat";

    try {
        const res = await fetch(`${URL}?user_email=eq.${email}`, { headers });
        const users = await res.json();

        if (users.length > 0 && users[0].encrypted_data) {
            const vaultData = users[0].encrypted_data;

            await chrome.storage.local.set({ vaultData: vaultData, currentUser: email });
            
            alert("Data úspěšně stažena a uložena do local");
            
            document.getElementById("screen-auth").classList.add("hidden");
            document.getElementById("screen-vault").classList.remove("hidden");
        } else {
            alert("Pro tento email nebyla nalezena žádná data.");
            document.getElementById("auth-sub").innerText = "Data nenalezena";
        }
    } catch (err) {
        alert("Chyba při stahování: " + err.message);
        document.getElementById("auth-sub").innerText = "Chyba spojení";
    }
};

document.getElementById("btn-save").onclick = async () => {
    let email = document.getElementById("email").value.trim();
    const site = document.getElementById("site").value;
    const login = document.getElementById("login").value;
    const pass = document.getElementById("pass").value;

    if (!site || !pass) return alert("Vyplňte web a heslo");

    try {
        if (!email) {
            const storage = await chrome.storage.local.get("currentUser");
            email = storage.currentUser;
        }
        if (!email) return alert("Chybí identifikace uživatele (email).");

        document.getElementById("loading").classList.remove("hidden");

        const res = await fetch(`${URL}?user_email=eq.${email}`, { headers });
        const users = await res.json();
        
        let vaultData = (users.length > 0 && users[0].encrypted_data) ? users[0].encrypted_data : [];
        
        vaultData.push({ site, login, pass }); 

        const method = users.length > 0 ? "PATCH" : "POST";
        const query = users.length > 0 ? `?user_email=eq.${email}` : "";

        await fetch(URL + query, {
            method: method,
            headers: headers,
            body: JSON.stringify({ user_email: email, encrypted_data: vaultData })
        });

        await chrome.storage.local.set({ vaultData: vaultData });

        document.getElementById("loading").classList.add("hidden");
        alert("Odesláno na Supabase a uloženo lokálně.");
        
        document.getElementById("site").value = "";
        document.getElementById("login").value = "";
        document.getElementById("pass").value = "";

    } catch (err) {
        document.getElementById("loading").classList.add("hidden");
        alert("Chyba při komunikaci: " + err.message);
    }
};