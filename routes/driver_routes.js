const route = require("@lib/createRoute")("/driver/routes")
const { getDatabase } = require("../lib/devDatabase")

route.router.get("/", async (req, res) => {
    const user_id = req.session.user_id
    const db = getDatabase()

    const routes = await db.getDriverRoutes(user_id)

    res.render("driver_routes", {
        title: "My Routes",
        routes,
        scripts: [
            "/pages/driverRoutesPage.js"
        ]
    })
})

route.router.post("/delete/:id", async (req, res) => {
    const user_id = req.session.user_id
    const db = getDatabase()

    await db.deleteRoute(req.params.id, user_id)
    res.redirect("/driver/routes")
})

module.exports = route
