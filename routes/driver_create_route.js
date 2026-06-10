const route = require("@lib/createRoute")("/driver/create_route")
const { getDatabase } = require("../lib/devDatabase")

route.router.get("/", async (req, res) => {
    res.render("create_route", {
        title: "Create Route",
        scripts: [
            "/pages/createRoutePage.js"
        ]
    })
})

route.router.post("/", async (req, res) => {
    const user_id = req.session.user_id
    const db = getDatabase()

    const { start_location, end_location, start_time, seats, stops } = req.body

   // const stops_array = stops
     //   ? stops.split("\n").map(s => s.trim()).filter(Boolean)
       // : []

    await db.createRoute({
        user_id,
        start_location,
        end_location,
        start_time,
        seats: parseInt(seats),
        //stops: stops_array
    })

    res.redirect("/driver/routes")
})

module.exports = route
