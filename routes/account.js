const route = require("@lib/createRoute")("/account")
const { getDatabase } = require("../lib/devDatabase")

route.router.get("/", async (req, res) => {
    const user_id = req.session.user_id
    const db = getDatabase()

    const user = await db.getUser(user_id)
    const driver = db.getDriverByUserId(user_id)
    const vehicle = driver ? db.getVehicleById(driver.vehicleID) : null

    res.render("account", {
        title: "Account",
        user,
        driver,
        vehicle,
        scripts: [
            "/pages/accountPage.js",
            "/scripts/modal.js"
        ]
    })
})

module.exports = route
