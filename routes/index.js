const route = require("@lib/createRoute")("/")
const rideshares = require("../tmp_data/rideshares.json")

route.router.get("/", async (req, res) => {
    res.render("index", {
        title: "RideShare",
        scripts: ["/scripts/modal.js", "/pages/homePage.js"],
        rideshares
    });
});

module.exports = route
