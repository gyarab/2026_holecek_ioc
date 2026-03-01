const URL = "https://fxevhmvpwgejricjjmkm.supabase.co/rest/v1/vaults";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZXZobXZwd2dlanJpY2pqbWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MzEzMDUsImV4cCI6MjA4MjUwNzMwNX0.JHq1ywJEsKkSNce5e1cAPiW6ksurIA-koYcvHo678f4";
const headers = { "apikey": KEY, "Authorization": `Bearer ${KEY}`, "Content-Type": "application/json" };

document.getElementById("btn-save").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    const site = document.getElementById("site").value;
    const login = document.getElementById("login").value;
    const pass = document.getElementById("pass").value; //heslo v plain

    if (!email || !site || !pass) return alert("vypln data");
    try {
        //stazeni dat ze supabase
        const res = await fetch(`${URL}?user_email=eq.${email}`, { headers });
        const users = await res.json();
        
        let vaultData = (users.length > 0 && users[0].encrypted_data) ? users[0].encrypted_data : [];
        
        //pridani novych dat do vaultu
        vaultData.push({ site, login, pass }); 

        //odeslani upravenzch dat do supabase
        const method = users.length > 0 ? "PATCH" : "POST";
        const query = users.length > 0 ? `?user_email=eq.${email}` : "";

        await fetch(URL + query, {
            method: method,
            headers: headers,
            body: JSON.stringify({ user_email: email, encrypted_data: vaultData })
        });

        alert("odeslano a ulozeno v supabase");
    } catch (err) {
        alert("error pri komunikaci" + err.message);
    }
};