const route = require("@lib/createRoute")("/driver/routes")
const { getDatabase } = require("../lib/devDatabase")
const connect = require("../dbConnect.js");
route.router.get("/", async (req, res) => {
    const user_id = req.session.user_id?.userID
    const db = getDatabase()
console.log(user_id);
    //const routes = await db.getDriverRoutes(user_id)
    const routes = await connect.getDriverRoutes(user_id);
    console.log(routes);
    res.render("driver_routes", {
        title: "My Routes",
        routes,
        scripts: [
            "/pages/driverRoutesPage.js"
        ], 
        routes
    })
})

route.router.post("/delete/:id", async (req, res) => {
    const user_id = req.session.user_id
    const db = getDatabase()

    await db.deleteRoute(req.params.id, user_id)
    res.redirect("/driver/routes")
})

module.exports = route
