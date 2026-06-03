const route = require("@lib/createRoute")("/account")
const { getDatabase } = require("../lib/devDatabase")

route.router.get("/", async (req, res) => {
    const user_id = req.session.user_id
    const db = getDatabase()

    const user = await db.getUser(user_id)

    res.render("account", {
        title: "Account",
        user,
        scripts: [
            "/pages/accountPage.js",
            "/scripts/modal.js"
        ]
    })
})

module.exports = route
