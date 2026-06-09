const route = require("@lib/createRoute")("/api")
const { getDatabase } = require("../lib/devDatabase")
const bcrypt = require("bcryptjs")
const { isValidPlate, isValidYear, isValidMpg } = require("../lib/validation")
const connect=require("../dbConnect");
// TODO: Move to separate API routes

route.router.delete("/account", async (req, res) => {
    const user_id = req.session.user_id

    await getDatabase().deleteUser(user_id)

    res.status(200).send()
})

route.router.patch("/account/profile", async (req, res) => {
    const user_id = req.session.user_id

    const { field, value } = req.body

    if (!field || !value) {
        return res.status(400).json({ message: "Missing fields." })
    }

    if (field !== "email" && field !== "name") {
        return res.status(400).json({ message: "Unsupported patch field." })
    }

    if (field === "email") {
        const user = await getDatabase().getUserByEmail(value)
        if (user) {
            return res.status(409).json({ message: "Email in use." })
        }
    }

    await getDatabase().patchUser(user_id, req.body)

    res.status(200).send()
})

const SALT_ROUNDS = 10

route.router.patch("/account/password", async (req, res) => {
    const user_id = req.session.user_id

    const { current, password } = req.body

    if (!current || !password) {
        return res.status(400).json({ message: "Missing fields." })
    }

    try {
        const user = await getDatabase().getUser(user_id)

        if (!user || !await bcrypt.compare(current, user.getPassword())) {
            return res.status(401).json({ message: "Invalid current password." })
        }

        const pass_hash = await bcrypt.hash(password, SALT_ROUNDS)
        await getDatabase().patchUser(user_id, { field: "password", value: pass_hash })

        return res.status(200).json({ message: "Password changed." })
    }
    catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Something went wrong, try again later." })
    }
})

route.router.post("/driver/register", async (req, res) => {
    const user_id = req.session.user_id
    const { make, model, year, mpg, numberPlate } = req.body

    if (!make || !model || !year || !mpg || !numberPlate) {
        return res.status(400).json({ message: "All fields are required." })
    }

    if (!isValidYear(year)) {
        return res.status(400).json({ message: "Invalid vehicle year." })
    }
    if (!isValidMpg(mpg)) {
        return res.status(400).json({ message: "Invalid MPG value." })
    }

    const plate = numberPlate.trim().toUpperCase()
    if (!isValidPlate(plate)) {
        return res.status(400).json({ message: "Invalid number plate format." })
    }

    const yearNum = parseInt(year)
    const mpgNum = parseInt(mpg)

    try {
        const db = getDatabase()
        const existing = db.getDriverByUserId(user_id)
        if (existing) {
            return res.status(409).json({ message: "You are already registered as a driver." })
        }

        const vehicle_id = db.addVehicle(make, model, yearNum, mpgNum)
        db.registerDriver(user_id, vehicle_id, plate)

        res.status(201).json({ message: "Driver registered successfully!" })
    }
    catch (error) {
        console.error(error)
        res.status(500).json({ message: "Something went wrong, please try again later." })
    }
})

module.exports = route