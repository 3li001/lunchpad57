const route = require("@lib/createRoute")("/")
const connect =require("../dbConnect.js");
//const rideshares = require("../tmp_data/rideshares.json")

route.router.get("/", async (req, res) => {
     const rideshares = await connect.getRideshares();
    //console.log(rideshares);
     
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
