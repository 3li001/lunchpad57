document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#RegisterDriverForm")
    if (!form) return

    form.addEventListener("submit", async (e) => {
        e.preventDefault()

        const submit = form.querySelector("input[type='submit']")
        submit.disabled = true
        submit.value = "Registering..."

        const body = {
            make: form.make.value.trim(),
            model: form.model.value.trim(),
            year: form.year.value,
            mpg: form.mpg.value,
            numberPlate: form.numberPlate.value.trim()
        }

        try {
            const res = await fetch("/api/driver/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            const data = await res.json()
            if (res.ok) {
                TOAST_MANAGER.notifySmall("You're now registered as a driver!")
                setTimeout(() => { window.location.href = "/" }, 1500)
            } else {
                TOAST_MANAGER.notifySmall(data.message || "Registration failed.")
                submit.disabled = false
                submit.value = "Register as Driver"
            }
        } catch {
            TOAST_MANAGER.notifySmall("Connection failed, please try again.")
            submit.disabled = false
            submit.value = "Register as Driver"
        }
    })
})
