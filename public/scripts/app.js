let OVERLAY = null
let ACCOUNT_PANEL = null
let account_panel_open = false

let BURGER_NAV = null
let BURGER_NAV_BUTTON = null

function toggleAccountPanel() {
    account_panel_open = !account_panel_open
    if (account_panel_open) {
        ACCOUNT_PANEL.removeAttribute("hidden")
    }
    else {
        ACCOUNT_PANEL.setAttribute("hidden", "")
    }
}

document.addEventListener("DOMContentLoaded", (e) => {
    ACCOUNT_PANEL = document.querySelector("#NavAccountPanel")
    BURGER_NAV = document.querySelector("#BurgerNav")
    BURGER_NAV_BUTTON = document.querySelector("#BurgerNavButton")

    document.querySelector("#NavProfile").addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        toggleAccountPanel()
    })

    BURGER_NAV_BUTTON.addEventListener("click", () => {
        BURGER_NAV.classList.toggle("open")
    })
})
