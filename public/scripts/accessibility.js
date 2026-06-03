class TTS {
    #select_btn
    #read_page_btn

    #select_mode = false
    #reading = false
    #speed = 1.0

    init() {
        this.#select_btn = document.querySelector("#TTSSelect")
        this.#read_page_btn = document.querySelector("#TTSReadPage")

        this.#select_btn.addEventListener("click", () => {
            if (this.#reading) return
            this.#select_mode = !this.#select_mode
            document.body.classList.toggle("tts-select-mode", this.#select_mode)
            this.#select_btn.textContent = this.#select_mode ? "Cancel" : "Select Text"
            window.speechSynthesis.cancel()
        })

        this.#read_page_btn.addEventListener("click", () => {
            if (this.#reading) {
                this.#stop()
            } else {
                this.#reading = true
                this.#read_page_btn.textContent = "Stop"
                this.#read_page_btn.classList.add("reading")
                this.readText(document.querySelector("main").innerText, () => {
                    this.#stop();
                    this.#read_page_btn.classList.remove("reading")
                })
            }
        })

        document.body.addEventListener("click", (e) => {
            if (!this.#select_mode) return
            const target = e.target.closest("p, h1, h2, h3, h4, h5, h6, a, li")
            if (target) {
                e.preventDefault()
                this.readText(target.innerText)
            }
        })
    }

    #stop() {
        this.#reading = false
        this.#read_page_btn.textContent = "Read Page"
        window.speechSynthesis.cancel()
    }

    setSpeed(rate) {
        this.#speed = rate
    }

    readText(text, onend = null) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = this.#speed
        if (onend) utterance.onend = onend
        window.speechSynthesis.speak(utterance)
    }
}

class AccessibilityOptions {
    #options = { }
    #tts = new TTS()

    init() {
        const acs_toggle = document.querySelector("#AccessibilityBtn")
        const acs_panel = document.querySelector("#NavAccessibilityPanel")
        acs_toggle.addEventListener("click", () => {
            acs_panel.classList.toggle("open")
        })

        for (const el of document.querySelectorAll(".accessibility-option")) {
            const id = el.id
            if (!(id in this.#options)) continue

            const toggle = el.querySelector(".toggle")
            const range = el.querySelector(".range")

            if (toggle) {
                if (this.get(id)) toggle.querySelector("[type='checkbox']").checked = true

                toggle.addEventListener("click", () => {
                    const new_val = !this.get(id)
                    this.set(id, new_val)
                    toggle.querySelector("[type='checkbox']").checked = new_val
                })
            } 
            else if (range) {
                const val_span = range.querySelector(".range-val")
                val_span.textContent = this.get(id)

                range.querySelector(".range-dec").addEventListener("click", () => {
                    const new_val = parseFloat((this.get(id) - 0.1).toFixed(1))
                    this.set(id, new_val)
                    val_span.textContent = this.get(id)
                })

                range.querySelector(".range-inc").addEventListener("click", () => {
                    const new_val = parseFloat((this.get(id) + 0.1).toFixed(1))
                    this.set(id, new_val)
                    val_span.textContent = this.get(id)
                })
            }

            this.#options[id].callback(this.get(id))
        }

        this.initTTS();
    }

    initTTS() {
        this.#tts.init()
    }

    setTTSSpeed(rate) {
        this.#tts.setSpeed(rate)
    }

    registerOption(id, default_value, parser = null, callback = null) {
        if (parser === null) parser = (v) => v
        const stored = localStorage.getItem(id)
        const value = stored !== null ? parser(stored) : default_value
        this.#options[id] = { default_value, parser, callback, value }
    }

    get(id) {
        return this.#options[id]?.value
    }

    set(id, value) {
        const opt = this.#options[id]
        if (!opt) return
        opt.value = value
        localStorage.setItem(id, value)
        if (opt.callback) opt.callback(value)
    }
}

function ToggleHighContrast(value) {
    console.log(value)
    if (value) {
        document.documentElement.classList.add("high-contrast")
    }
    else {
        document.documentElement.classList.remove("high-contrast")
    }
}

function ChangeFontSize(value) {
    console.log("FS")
}

function ChangeTTSSpeed(value) {
    ACCESSIBILITY.setTTSSpeed(value)
}

const ACCESSIBILITY = new AccessibilityOptions()

ACCESSIBILITY.registerOption("ACS_HIGH_CONTRAST",   false,  (s) => s === "true",    ToggleHighContrast)
// ACCESSIBILITY.registerOption("ACS_FONT_SIZE",       1.0,    parseFloat,             ChangeFontSize)
ACCESSIBILITY.registerOption("ACS_TTS_SPEED",       1.0,    parseFloat,             ChangeTTSSpeed)

document.addEventListener("DOMContentLoaded", () => ACCESSIBILITY.init())
