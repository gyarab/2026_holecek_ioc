browser.runtime.onMessage.addListener((msg) => {
    if (msg.action === "fill_data") {
        const inputs = document.querySelectorAll("input");

        let passFilled = false;
        for (const input of inputs) {
            if (input.type === "password" && input.offsetParent !== null) {
                input.value = msg.password;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                passFilled = true;
                break; 
            }
        }

        if (passFilled) {
            for (const input of inputs) {
                if ((input.type === "text" || input.type === "email") && 
                    input.value === "" && 
                    input.offsetParent !== null) {
                    input.value = msg.username;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
                }
            }
        }
    }
});