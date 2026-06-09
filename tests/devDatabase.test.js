const { DevDatabase } = require("../lib/devDatabase")

// Creates a clean in-memory database for each test.
// The real files are loaded once on require, then we wipe
// the arrays and stub out the save methods so nothing is written to disk.
function makeDb() {
    const db = new DevDatabase()
    db.users        = []
    db.drivers      = []
    db.vehicles     = []
    db.resetTokens  = new Map()
    db.next_user_id    = 1
    db.next_driver_id  = 1
    db.next_vehicle_id = 1
    db.saveUsers    = jest.fn()
    db.saveDrivers  = jest.fn()
    db.saveVehicles = jest.fn()
    return db
}

// ─── Users ────────────────────────────────────────────────────────────────────

describe("DevDatabase – users", () => {
    test("addUser stores a user that can be found by email", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "hash123")
        const user = db.getUserByEmail("ali@test.com")
        expect(user).not.toBeUndefined()
        expect(user.getName()).toBe("Ali")
    })

    test("getUserByEmail returns undefined for unknown email", () => {
        const db = makeDb()
        expect(db.getUserByEmail("nobody@test.com")).toBeUndefined()
    })

    test("getUser returns the correct user by id", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "hash123")
        const user = db.getUserByEmail("ali@test.com")
        expect(db.getUser(user.getId()).getEmail()).toBe("ali@test.com")
    })

    test("deleteUser removes the user", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "hash123")
        const user = db.getUserByEmail("ali@test.com")
        db.deleteUser(user.getId())
        expect(db.getUserByEmail("ali@test.com")).toBeUndefined()
    })

    test("patchUser updates the name", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "hash123")
        const user = db.getUserByEmail("ali@test.com")
        db.patchUser(user.getId(), { field: "name", value: "Bob" })
        expect(db.getUser(user.getId()).getName()).toBe("Bob")
    })

    test("multiple users get unique IDs", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "h1")
        db.addUser("Bob", "bob@test.com", "h2")
        const ali = db.getUserByEmail("ali@test.com")
        const bob = db.getUserByEmail("bob@test.com")
        expect(ali.getId()).not.toBe(bob.getId())
    })

    test("saveUsers is called when adding a user", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "hash")
        expect(db.saveUsers).toHaveBeenCalled()
    })
})

// ─── Drivers & Vehicles ───────────────────────────────────────────────────────

describe("DevDatabase – drivers & vehicles", () => {
    test("registerDriver creates a driver retrievable by user id", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "hash")
        const user = db.getUserByEmail("ali@test.com")
        const vehicleId = db.addVehicle("Toyota", "Corolla", 2020, 35)
        db.registerDriver(user.getId(), vehicleId, "AB12 CDE")

        const driver = db.getDriverByUserId(user.getId())
        expect(driver).not.toBeNull()
        expect(driver.numberPlate).toBe("AB12 CDE")
    })

    test("getDriverByUserId returns null when user is not a driver", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "hash")
        const user = db.getUserByEmail("ali@test.com")
        expect(db.getDriverByUserId(user.getId())).toBeNull()
    })

    test("addVehicle stores vehicle data correctly", () => {
        const db = makeDb()
        const vehicleId = db.addVehicle("Ford", "Focus", 2018, 40)
        const vehicle = db.getVehicleById(vehicleId)
        expect(vehicle.vehicleMake).toBe("Ford")
        expect(vehicle.vehicleModel).toBe("Focus")
        expect(vehicle.vehicleYear).toBe(2018)
        expect(vehicle.mpg).toBe(40)
    })

    test("getVehicleById returns null for unknown id", () => {
        const db = makeDb()
        expect(db.getVehicleById(999)).toBeNull()
    })

    test("new driver starts with zero completed rides", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "hash")
        const user = db.getUserByEmail("ali@test.com")
        const vehicleId = db.addVehicle("Toyota", "Yaris", 2021, 50)
        db.registerDriver(user.getId(), vehicleId, "XY99 ZZZ")
        expect(db.getDriverByUserId(user.getId()).completedRides).toBe(0)
    })

    test("two drivers get unique driverIDs", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "h1")
        db.addUser("Bob", "bob@test.com", "h2")
        const ali = db.getUserByEmail("ali@test.com")
        const bob = db.getUserByEmail("bob@test.com")
        const v1 = db.addVehicle("Toyota", "Corolla", 2020, 35)
        const v2 = db.addVehicle("Ford", "Focus", 2019, 40)
        db.registerDriver(ali.getId(), v1, "AB12 CDE")
        db.registerDriver(bob.getId(), v2, "XY34 FGH")

        const dA = db.getDriverByUserId(ali.getId())
        const dB = db.getDriverByUserId(bob.getId())
        expect(dA.driverID).not.toBe(dB.driverID)
    })

    test("saveDrivers is called when registering a driver", () => {
        const db = makeDb()
        const vehicleId = db.addVehicle("Toyota", "Corolla", 2020, 35)
        db.registerDriver(1, vehicleId, "AB12 CDE")
        expect(db.saveDrivers).toHaveBeenCalled()
    })
})

// ─── Password Reset ───────────────────────────────────────────────────────────

describe("DevDatabase – password reset", () => {
    test("generateResetToken returns a 6-digit string for a known user", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "hash")
        expect(db.generateResetToken("ali@test.com")).toMatch(/^\d{6}$/)
    })

    test("generateResetToken returns null for unknown email", () => {
        const db = makeDb()
        expect(db.generateResetToken("nobody@test.com")).toBeNull()
    })

    test("resetUserPassword updates the password hash", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "old_hash")
        expect(db.resetUserPassword("ali@test.com", "new_hash")).toBe(true)
        expect(db.getUserByEmail("ali@test.com").getPassword()).toBe("new_hash")
    })

    test("resetUserPassword is case-insensitive for email", () => {
        const db = makeDb()
        db.addUser("Ali", "ali@test.com", "old_hash")
        expect(db.resetUserPassword("ALI@TEST.COM", "new_hash")).toBe(true)
    })

    test("resetUserPassword returns false for unknown email", () => {
        const db = makeDb()
        expect(db.resetUserPassword("nobody@test.com", "hash")).toBe(false)
    })
})
