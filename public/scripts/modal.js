class Modal {
    #modal_panel = null
    #modal_bg = null

    #type = ""
    #title = ""
    #text = ""
    #image = ""
    #severity = ""
    #inputs = []
    #onConfirm = null
    #onShow = null
    #onHide = null

    #boundKeyHandler = null

    /**
     * @typedef {Object} ModalOptions
     * @property {"info"|"error"|"confirm"|"image"|"form"} type
     * @property {"low"|"medium"|"high"|"critical"} [severity]
     * @property {string} title
     * @property {string} [text]
     * @property {string} [image]
     * @property {Array} [inputs]
     * @property {Function} [onConfirm]
     * @property {Function} [onShow]
     * @property {Function} [onHide]
     */

    /**
     * @param {ModalOptions} opts
     */
    constructor(opts) {
        this.#type      = opts.type      ?? "info"
        this.#title     = opts.title     ?? ""
        this.#text      = opts.text      ?? ""
        this.#image     = opts.image     ?? ""
        this.#severity  = opts.severity  ?? ""
        this.#inputs    = opts.inputs    ?? []
        this.#onConfirm = opts.onConfirm ?? null
        this.#onShow    = opts.onShow    ?? null
        this.#onHide    = opts.onHide    ?? null

        this.#CreatePanel()
    }

    #CreatePanel() {
        const bg = document.createElement("div")
        bg.id = "GenericModalBG"
        bg.setAttribute("aria-hidden", "true")
        bg.addEventListener("click", () => this.Hide())

        const panel = document.createElement("div")
        panel.id = "GenericModalPanel"
        panel.setAttribute("modal-type", this.#type)
        panel.setAttribute("modal-severity", this.#severity)
        panel.setAttribute("role", "dialog")
        panel.setAttribute("aria-modal", "true")
        panel.setAttribute("aria-labelledby", "modal-title")

        const title = document.createElement("h3")
        title.id = "modal-title"
        title.className = "modal-title"
        panel.appendChild(title)

        if (this.#type === "image") {
            const img = document.createElement("img")
            img.className = "modal-image"
            img.alt = this.#title
            panel.appendChild(img)

            const closeBtn = this.#makeButton("Close", "modal-btn-secondary", () => this.Hide())
            const actions = document.createElement("div")
            actions.className = "modal-actions"
            actions.appendChild(closeBtn)
            panel.appendChild(actions)
        }
        else if (this.#type === "confirm") {
            const text = document.createElement("p")
            text.className = "modal-text"
            panel.appendChild(text)
            const actions = document.createElement("div")
            actions.className = "modal-actions"
            const cancelBtn = this.#makeButton("Cancel", "modal-btn-secondary", () => this.Hide())
            const confirmBtn = this.#makeButton("Confirm", "modal-btn-primary", () => {
                this.#onConfirm?.()
                this.Hide()
            })
            actions.appendChild(cancelBtn)
            actions.appendChild(confirmBtn)
            panel.appendChild(actions)
        }
        else if (this.#type === "form") {
            const formContainer = document.createElement("div")
            formContainer.className = "modal-form-container"
            panel.appendChild(formContainer)
            const actions = document.createElement("div")
            actions.className = "modal-actions"
            const cancelBtn = this.#makeButton("Cancel", "modal-btn-secondary", () => this.Hide())
            const confirmBtn = this.#makeButton("Confirm", "modal-btn-primary", () => {
                const form = panel.querySelector("form")
                if (!form) return

                const data = new FormData(form)
                const result = new Map()

                for (const [key, value] of data) {
                    if (result.has(key)) {
                        let existing = result.get(key)
                        if (!Array.isArray(existing)) existing = [existing]
                        existing.push(value)
                        result.set(key, existing)
                    } 
                    else {
                        const input = form.querySelector(`[name="${key}"]`)
                        if (input && input.multiple) result.set(key, [value])
                        else result.set(key, value)
                    }
                }
                for (const inputDef of this.#inputs) {
                    if (inputDef.type === "multiselect") {
                        const val = result.get(inputDef.label)
                        if (!val) result.set(inputDef.label, [])
                        else if (!Array.isArray(val)) result.set(inputDef.label, [val])
                    }
                }
                this.#onConfirm?.(result)
                this.Hide()
            })
            actions.appendChild(cancelBtn)
            actions.appendChild(confirmBtn)
            panel.appendChild(actions)
        }
        else {
            const text = document.createElement("p")
            text.className = "modal-text"
            panel.appendChild(text)
            const actions = document.createElement("div")
            actions.className = "modal-actions"
            const closeBtn = this.#makeButton("Close", "modal-btn-primary", () => this.Hide())
            actions.appendChild(closeBtn)
            panel.appendChild(actions)
        }

        document.body.appendChild(bg)
        document.body.appendChild(panel)

        this.#modal_panel = panel
        this.#modal_bg    = bg
    }

    #makeButton(label, className, handler) {
        const btn = document.createElement("button")
        btn.textContent = label
        btn.className = className
        btn.addEventListener("click", handler)
        return btn
    }

    #keyHandler(e) {
        if (e.key === "Escape") this.Hide()
    }

    #generateForm() {
        const form = document.createElement("form")
        for (const inputDef of this.#inputs) {
            const wrapper = document.createElement("div")
            wrapper.className = "form-field"

            const label = document.createElement("label")
            label.textContent = inputDef.label
            wrapper.appendChild(label)
            
            let field = null
            switch (inputDef.type) {
                case "textarea":
                    field = document.createElement("textarea")
                    if (inputDef.rows) field.rows = inputDef.rows
                    if (inputDef.placeholder) field.placeholder = inputDef.placeholder
                    if (inputDef.value) field.value = inputDef.value
                    break
                case "select":
                    field = document.createElement("select")
                    if (inputDef.options) {
                        for (const opt of inputDef.options) {
                            const option = document.createElement("option")
                            option.value = opt.value
                            option.textContent = opt.text
                            if (inputDef.value === opt.value) option.selected = true
                            field.appendChild(option)
                        }
                    }
                    break
                case "multiselect":
                    const container = document.createElement("div")
                    container.className = "multiselect-group"
                    if (inputDef.options) {
                        for (const opt of inputDef.options) {
                            const cbWrapper = document.createElement("label")
                            const cb = document.createElement("input")
                            cb.type = "checkbox"
                            cb.value = opt.value
                            cb.name = inputDef.label
                            if (inputDef.value && inputDef.value.includes(opt.value)) cb.checked = true
                            const span = document.createElement("span")
                            span.textContent = opt.text
                            cbWrapper.appendChild(cb)
                            cbWrapper.appendChild(span)
                            container.appendChild(cbWrapper)
                        }
                    }
                    wrapper.appendChild(container)
                    break
                case "number":
                    field = document.createElement("input")
                    field.type = "number"
                    if (inputDef.step) field.step = inputDef.step
                    if (inputDef.value !== undefined) field.value = inputDef.value
                    if (inputDef.placeholder) field.placeholder = inputDef.placeholder
                    break
                case "date":
                    field = document.createElement("input")
                    field.type = "date"
                    if (inputDef.value) field.value = inputDef.value
                    break
                default:
                    field = document.createElement("input")
                    field.type = "text"
                    if (inputDef.value !== undefined) field.value = inputDef.value
                    if (inputDef.placeholder) field.placeholder = inputDef.placeholder
                    break
            }
            if (field && inputDef.type !== "multiselect") {
                field.name = inputDef.label
                wrapper.appendChild(field)
            }
            form.appendChild(wrapper)
        }
        return form
    }

    Show() {
        const panel = this.#modal_panel
        const title = panel.querySelector(".modal-title")
        const text  = panel.querySelector(".modal-text")
        const img   = panel.querySelector(".modal-image")

        title.textContent = this.#title
        if (text) text.innerHTML = this.#text
        if (img) img.src = this.#image

        if (this.#type === "form") {
            const formContainer = panel.querySelector(".modal-form-container")
            if (formContainer) {
                formContainer.innerHTML = ""
                const form = this.#generateForm()
                formContainer.appendChild(form)
            }
        }
        this.#modal_bg.classList.add("is-visible")
        panel.classList.add("is-visible")
        const firstFocusable = panel.querySelector("button, input, select, textarea")
        firstFocusable?.focus()
        this.#boundKeyHandler = this.#keyHandler.bind(this)
        document.addEventListener("keydown", this.#boundKeyHandler)
        this.#onShow?.()
    }

    Hide() {
        this.#modal_panel.classList.remove("is-visible")
        this.#modal_bg.classList.remove("is-visible")
        document.removeEventListener("keydown", this.#boundKeyHandler)
        this.#boundKeyHandler = null
        this.#onHide?.()
        // this.Destroy()
    }

    Update(opts = {}) {
        if (opts.title     !== undefined) this.#title     = opts.title
        if (opts.text      !== undefined) this.#text      = opts.text
        if (opts.image     !== undefined) this.#image     = opts.image
        if (opts.severity  !== undefined) this.#severity  = opts.severity
        if (opts.onConfirm !== undefined) this.#onConfirm = opts.onConfirm
        if (opts.inputs    !== undefined) this.#inputs    = opts.inputs
    }

    Destroy() {
        // this.Hide()
        this.#modal_panel?.remove()
        this.#modal_bg?.remove()
        this.#modal_panel = null
        this.#modal_bg = null
    }
}