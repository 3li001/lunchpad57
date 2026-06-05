const fs = require("fs")
const path = require("path")

let nodemailer
try {
    nodemailer = require("nodemailer")
} catch (e) {
    nodemailer = null
}

const OUTBOX = path.join(__dirname, "..", "tmp_data", "email_outbox.json")

function saveToOutbox(msg) {
    let list = []
    try {
        list = JSON.parse(fs.readFileSync(OUTBOX, "utf8"))
    } catch (e) {
        list = []
    }
    list.push({ ...msg, created_at: new Date().toISOString() })
    fs.writeFileSync(OUTBOX, JSON.stringify(list, null, 4))
}

function smtpConfigured() {
    return process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
}


async function sendEmail(to, subject, body) {
    const msg = {
        from: process.env.SMTP_FROM || "rideshare@example.com",
        to,
        subject,
        text: body
    }

    if (!nodemailer || !smtpConfigured()) {
        saveToOutbox(msg)
        console.log("[email preview]", to, "-", subject)
        return { sent: false, preview: true }
    }

    const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })

    await transport.sendMail(msg)
    return { sent: true, preview: false }
}

module.exports = { sendEmail }