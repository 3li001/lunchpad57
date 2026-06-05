const route = require("@lib/createRoute")("/driver")
const { getDatabase } = require("../lib/devDatabase")

route.router.get("/register", async (req, res) => {
    const user_id = req.session.user_id

    if (user_id) {
        const existingDriver = getDatabase().getDriverByUserId(user_id)
        if (existingDriver) {
            return res.redirect("/")
        }
    }

    res.render("register-driver", {
        title: "Register as Driver",
        scripts: ["/pages/registerDriverPage.js"]
    })
})

module.exports = route
