class ToastManager {
    #toasts = []
    #toast_container = null

    init() {
        this.#toast_container = document.createElement("div")
        this.#toast_container.id = "ToastContainer"
        document.querySelector("main").appendChild(this.#toast_container)
    }
    
    notifySmall(text, duration = 5.0) {
        const toast = document.createElement("div")
        toast.classList.add("toast-notification")

        toast.innerHTML = text

        let timeout = null
        if (duration > 0) {
            timeout = setTimeout(() => {
                toast.classList.add("fading")
                setTimeout(() => {
                    toast.remove()
                    this.#toasts.splice(this.#toasts.indexOf(toast), 1)
                }, 200)
    
            }, (duration * 1000) - 200)
        }
        
        const close = document.createElement("button")
        close.innerHTML = `<i class="fa-solid fa-x"/>`
        close.onclick = () => {
            if (timeout) clearTimeout(timeout)
            toast.classList.add("fading")
            setTimeout(() => {
                toast.remove()
                this.#toasts.splice(this.#toasts.indexOf(toast), 1)
            }, 200)
        }

        const timer = document.createElement("div")
        timer.classList.add("toast-timer")
        timer.setAttribute("style", `--timer: ${duration}s`)

        toast.appendChild(close)
        toast.appendChild(timer)
        
        this.#toasts.push(toast)
        this.#toast_container.appendChild(toast)
    }

    notifyLarge(title, text, duration = 5.0) {
        const toast = document.createElement("div")
        toast.classList.add("toast-notification", "toast-large")

        const toast_title = document.createElement("h3")
        const toast_text = document.createElement("p")

        toast_title.classList.add("toast-title")

        toast_title.innerHTML = title
        toast_text.innerHTML = text

        let timeout = null
        if (duration > 0) {
            timeout = setTimeout(() => {
                toast.classList.add("fading")
                setTimeout(() => {
                    toast.remove()
                    this.#toasts.splice(this.#toasts.indexOf(toast), 1)
                }, 200)
    
            }, (duration * 1000) - 200)
        }
        
        const close = document.createElement("button")
        close.innerHTML = `<i class="fa-solid fa-x"/>`
        close.onclick = () => {
            if (timeout) clearTimeout(timeout)
            toast.classList.add("fading")
            setTimeout(() => {
                toast.remove()
                this.#toasts.splice(this.#toasts.indexOf(toast), 1)
            }, 200)
        }

        const timer = document.createElement("div")
        timer.classList.add("toast-timer")
        timer.setAttribute("style", `--timer: ${duration}s`)

        toast_title.appendChild(close)
        toast.appendChild(toast_title)
        toast.appendChild(toast_text)
        toast.appendChild(timer)
        
        this.#toasts.push(toast)
        this.#toast_container.appendChild(toast)
    }
}

const TOAST_MANAGER = new ToastManager()

document.addEventListener("DOMContentLoaded", () => {
    TOAST_MANAGER.init()

    // let i = 1
    // let interval = setInterval(() => {
    //     TOAST_MANAGER.notifySmall("TESTING NOTIFICATION", 2 * i)
    //     i++
    //     if (i == 10) clearInterval(interval)
    // }, 2 * 1000)

    // TOAST_MANAGER.notifySmall("TESTING NOTIFICATION 111", 3.0)
    // TOAST_MANAGER.notifySmall("TESTING NOTIFICATION 44", 6.0)
    // TOAST_MANAGER.notifySmall("TESTING NOTIFICATION 65555", 8.0)
    // TOAST_MANAGER.notifySmall("TESTING NOTIFICATION 31", 5.0)
    // TOAST_MANAGER.notifySmall("TESTING NOTIFICATION 21234234", 4.0)
    // TOAST_MANAGER.notifySmall("TESTING NOTIFICATION 522", 0.0)

    // TOAST_MANAGER.notifyLarge("TEST LARGE", "THIS IS A LARGE NOTIFICATION", 0.0)
    // TOAST_MANAGER.notifyLarge("TEST LARGE", "THIS IS A LARGE NOTIFICATION", 10.0)
})