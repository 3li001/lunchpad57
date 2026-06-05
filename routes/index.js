const route = require("@lib/createRoute")("/")
const rideshares = require("../tmp_data/rideshares.json")

route.router.get("/", async (req, res) => {
    res.render("index", {
        title: "RideShare",
        scripts: ["/scripts/modal.js", "/pages/homePage.js"],
        rideshares
    });
});

route.router.post("/join-ride", async (req, res) => {
    const user_id = req.session.user_id

    
})

module.exports = route
