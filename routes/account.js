const route = require("@lib/createRoute")("/account")
const { getDatabase } = require("../lib/devDatabase")
const connect =require("../dbConnect.js");
route.router.get("/", async (req, res) => {
    console.log(req.session.user_id);
    const user_id = req.session.user_id?.userID;
    console.log(user_id);
    const db = getDatabase()

    const user = await connect.getUser(user_id)
    console.log(user);
    const driver = await connect.getDriver(user_id);
    console.log(driver);
    //const vehicle = driver ? db.getVehicleById(driver.vehicleID) : null

    res.render("account", {
        title: "Account",
        user,
        driver,
        //vehicle,
        scripts: [
            "/pages/accountPage.js",
            "/scripts/modal.js"
        ]
    })
})

module.exports = route
