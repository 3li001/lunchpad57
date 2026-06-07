let tabs = null

function setupLogin() {
    const loginForm = document.querySelector("#Login")
    if (!loginForm) return;
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault()
        const submitBtn = loginForm.querySelector('input[type="submit"]')

        const Email = e.target.Email.value
        const Password = e.target.Password.value

        try {
            const res = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: Email, password: Password })
            })

            const data = await res.json()
            
            if (res.ok && data !== false && data !== "false") {
                TOAST_MANAGER.notifySmall("Successfully logged in!")
                setTimeout(() => {
                    window.location.href = data.redirect || "/"
                }, 1000)
            } else {
                let errorMsg = "Invalid email or password!"
                if (data && typeof data === "object" && data.message) {
                    errorMsg = data.message
                }
                TOAST_MANAGER.notifySmall(errorMsg)
                if (submitBtn) {
                    submitBtn.value = "Login"
                    submitBtn.disabled = false
                }
            }
        } catch (err) {
            console.error(err)
            TOAST_MANAGER.notifySmall("Network error occurred.")
            if (submitBtn) {
                submitBtn.value = "Login"
                submitBtn.disabled = false
            }
        }
    })
}

function setupRegister() {
    const registerForm = document.querySelector("#Register")
    if (!registerForm) return;
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault()
        const submitBtn = registerForm.querySelector('input[type="submit"]')

        const name = e.target.Name.value
        const email = e.target.Email.value
        const password = e.target.Password.value
        const confirmPassword = e.target.ConfirmPassword.value

        if (password !== confirmPassword) {
            TOAST_MANAGER.notifySmall("Passwords do not match!")
            return
        }

        if (submitBtn) {
            submitBtn.value = "Registering..."
            submitBtn.disabled = true
        }

        try {
            const res = await fetch("/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, confirmPassword })
            })

            const data = await res.json()
            if (res.ok) {
                TOAST_MANAGER.notifySmall("Account created, please log in!")
                registerForm.reset()
                if (tabs && tabs[0]) tabs[0].click()
            } else {
                TOAST_MANAGER.notifySmall(data.message || "Registration failed!")
            }
        } catch (err) {
            console.error(err)
            TOAST_MANAGER.notifySmall("Network error occurred.")
        } finally {
            if (submitBtn) {
                submitBtn.value = "Register"
                submitBtn.disabled = false
            }
        }
    })
}

function setupResetPassword() {
    const resetForm = document.querySelector("#ResetPasswordForm");
    if (!resetForm) return;
    resetForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = resetForm.querySelector('input[type="submit"]')

        const formData = new FormData(resetForm);
        const data = Object.fromEntries(formData.entries());

        if (data.password !== data.confirmPassword) {
            TOAST_MANAGER.notifySmall("Passwords do not match!")
            return
        }

        if (submitBtn) {
            submitBtn.value = "Updating..."
            submitBtn.disabled = true
        }

        try {
            const res = await fetch("/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) {
                TOAST_MANAGER.notifySmall("Password updated successfully!")
                setTimeout(() => {
                    window.location.href = "/auth/login";
                }, 1500)
            } else {
                TOAST_MANAGER.notifySmall(result.message || "Reset failed.");
                if (submitBtn) {
                    submitBtn.value = "Update Password"
                    submitBtn.disabled = false
                }
            }
        } catch (err) {
            console.error(err)
            TOAST_MANAGER.notifySmall("Network error occurred.")
            if (submitBtn) {
                submitBtn.value = "Update Password"
                submitBtn.disabled = false
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const loginPanel = document.querySelector("#LoginPanel");
    
    if (loginPanel) {
        tabs = loginPanel.querySelectorAll(".modal-tabs button");
        let tab_contents = loginPanel.querySelectorAll(".modal-content > form");    
        tabs.forEach((tab, index) => {
            tab.addEventListener("click", () => {
                tabs.forEach(t => t.classList.remove("selected"));
                tab.classList.add("selected");  
                tab_contents.forEach((content, cIndex) => {
                    content.style.display = index === cIndex ? "flex" : "none";
                });
            });
        });

        if (tabs[0]) tabs[0].click();

        setupLogin();
        setupRegister();
        setupResetPassword(); 

        const forgotLink = document.getElementById('Forgor');
        const loginForm = document.getElementById('Login');
        const registerForm = document.getElementById('Register');
        const forgotForm = document.getElementById('Forgot');
        const backToLogin = document.getElementById('BackToLogin');

        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                if (loginForm) loginForm.style.display = 'none';
                if (registerForm) registerForm.style.display = 'none';
                if (forgotForm) forgotForm.style.display = 'flex';
                tabs.forEach(t => t.classList.remove("selected"));
            });
        }

        if (backToLogin) {
            backToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                tabs[0].click();
            });
        }
        if (forgotForm) {
            forgotForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = e.target.querySelector('input[type="submit"]');
                submitBtn.value = "Sending...";
                submitBtn.disabled = true;
                try {
                    const email = e.target.Email.value;
                    const response = await fetch('/auth/forgot-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        TOAST_MANAGER.notifySmall("Code sent! Check your outbox.");
                        setTimeout(() => {
                            window.location.href = `/auth/reset-password?email=${encodeURIComponent(email)}`;
                        }, 2000);
                    } else {
                        TOAST_MANAGER.notifySmall(data.message || "Error");
                        submitBtn.value = "Send Reset Code";
                        submitBtn.disabled = false;
                    }
                } catch (err) {
                    console.error(err);
                    TOAST_MANAGER.notifySmall("Connection failed.");
                    submitBtn.value = "Send Reset Code";
                    submitBtn.disabled = false;
                }
            });
        }
    }
});