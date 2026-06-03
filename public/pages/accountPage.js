function escapeHtml(s) {
    if (s == null) return ''
    return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}


document.querySelectorAll('.account-tab').forEach(tab => {
    tab.addEventListener('click', function () {
        document.querySelectorAll('.account-tab').forEach(t => t.classList.remove('active'))
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'))
        this.classList.add('active')
        document.getElementById(this.dataset.tab).classList.add('active')
    })
})


function editField(rowId, label, currentValue, type = 'text') {
    const row = document.getElementById(rowId)
    if (row.classList.contains('editing')) return

    row.classList.add('editing')
    const valueEl = row.querySelector('.field-value')
    const editBtn = row.querySelector('.edit-btn')

    valueEl.innerHTML = `<input type="${type}" value="${currentValue}" aria-label="${label}">`
    const input = valueEl.querySelector('input')
    input.focus()
    input.select()

    editBtn.textContent = 'Save'
    editBtn.onclick = () => saveField(rowId, input)
    input.addEventListener('keydown', e => { if (e.key === 'Enter') saveField(rowId, input) })
}

async function saveField(rowId, input) {
    const newValue = input.value.trim()

    try {
        const res = await fetch('/api/account/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field: rowId.replace('field-', ''), value: newValue })
        })
        if (!res.ok) {
            const data = await res.json()
            TOAST_MANAGER.notifySmall(data.message || "Something went wrong, try again later.")
            return
        }
        window.location.reload()
    } catch (err) {
        console.error('Failed to save field:', err)
        TOAST_MANAGER.notifySmall("Something went wrong, try again later.")
    }
}


// Notification settings
function gatherPrefs() {
    const out = {}
    document.querySelectorAll('[data-pref]').forEach(el => {
        const k = el.dataset.pref
        if (el.type === 'checkbox') out[k] = el.checked
        else out[k] = parseInt(el.value, 10)
    })
    return out
}

function setSaveStatus(text, error = false) {
    const el = document.getElementById('NotificationSaveState')
    if (!el) return
    el.textContent = text
    el.classList.toggle('is-error', error)
}

async function saveNotificationPrefs() {
    setSaveStatus('Saving...')
    try {
        const res = await fetch('/api/account/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gatherPrefs())
        })
        if (!res.ok) throw new Error(res.status)
        setSaveStatus('Saved automatically')
        loadNotificationPreview()
    } catch (err) {
        console.error('Failed to save notification prefs:', err)
        setSaveStatus("Couldn't save settings", true)
    }
}

// Notification preview
function renderPreview(list) {
    const box = document.getElementById('NotificationPreview')
    if (!box) return

    if (!list || list.length === 0) {
        box.innerHTML = '<p class="empty-state">Nothing inside your warning window right now. No emails will be sent.</p>'
        return
    }

    box.innerHTML = list.map(n => {
        let when
        if (n.days_left < 0) when = `${Math.abs(n.days_left)} day(s) overdue`
        else if (n.days_left === 0) when = 'due today'
        else if (n.days_left === 1) when = 'due tomorrow'
        else when = `${n.days_left} day(s) left`
        return `
            <div class="notif-card ${n.priority || 'low'}">
                <div class="notif-card-title">${escapeHtml(n.title)}</div>
                <div class="notif-card-meta">${escapeHtml(when)}</div>
                <div class="notif-card-msg">${escapeHtml(n.message)}</div>
            </div>`
    }).join('')
}

async function loadNotificationPreview() {
    const box = document.getElementById('NotificationPreview')
    if (!box) return
    try {
        const res = await fetch('/api/notifications')
        if (!res.ok) throw new Error(res.status)
        const data = await res.json()
        renderPreview(data.notifications)
    } catch (err) {
        console.error('Failed to load reminders:', err)
        box.innerHTML = '<p class="empty-state">Could not load reminders.</p>'
    }
}

document.querySelectorAll('[data-pref]').forEach(el => {
    el.addEventListener('change', saveNotificationPrefs)
})

loadNotificationPreview()


async function changePassword() {
    const [current, next, confirm] = document.querySelectorAll('#SecurityPane input[type="password"]')
    if (next.value !== confirm.value) {
        TOAST_MANAGER.notifySmall("Passwords do not match!")
        return
    }
    try {
        const res = await fetch('/api/account/password', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current: current.value, password: next.value })
        })
        if (!res.ok) {
            const data = await res.json()
            TOAST_MANAGER.notifySmall(data.message || "Something went wrong, try again later.")
            return
        }
        ;[current, next, confirm].forEach(i => i.value = '')
        TOAST_MANAGER.notifySmall("Password changed successfully!")
    } catch (err) {
        console.error('Password change failed:', err)
        TOAST_MANAGER.notifySmall("Something went wrong, try again later.")
    }
}

async function deleteAccount() {
    const modal = new Modal({
        type: "confirm",
        title: "Delete Account",
        text: "Are you sure you'd like to delete your account? This action is permanent.",
        severity: "high",
        onConfirm: async () => {
            try {
                const res = await fetch('/api/account', { method: 'DELETE' })
                if (res.ok) window.location.href = '/auth/logout'
            } catch (err) {
                console.error('Delete failed:', err)
            }
        }
    })
    modal.Show()
}
