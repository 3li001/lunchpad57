/////////////////////
// TEST DATA DON'T USE IN PRODUCTION
/////////////////////

// const { Module } = require("../models/module")
// const { Assessment } = require("../models/assessment")
// const { Deliverable } = require("../models/deliverable")
// const { Milestone } = require("../models/milestone")
// const { StudyTask } = require("../models/studyTask")
const { User } = require("../models/User")

const fs = require("node:fs");

/////////////////////
// This is a bunch of temp code until the database 
// is implemented, using JSON and hard-coded values 
// to test the functionality of the site. 
/////////////////////
class DevDatabase {
    constructor() {
        const drivers_data = JSON.parse(fs.readFileSync("tmp_data/drivers.json", "utf8") || "[]")
        const routes_data = JSON.parse(fs.readFileSync("tmp_data/rideshares.json", "utf8") || "[]")
        const vehicles_data = JSON.parse(fs.readFileSync("tmp_data/vehicles.json", "utf8") || "[]")
        const rides_data = JSON.parse(fs.readFileSync("tmp_data/rideshares.json", "utf-8") || "[]")
        const users_data = JSON.parse(fs.readFileSync("tmp_data/users.json", "utf-8") || "[]")

        this.drivers = drivers_data
        this.routes = routes_data
        this.vehicles = vehicles_data
        this.rides = rides_data
        this.users = users_data.map(User.Parse);

        this.resetTokens = new Map();

        this.next_driver_id = Math.max(0, ...drivers_data.map(d => d.driverID), 0) + 1
        this.next_route_id = Math.max(0, ...routes_data.map(r => r.id), 0) + 1
        this.next_vehicle_id = Math.max(0, ...vehicles_data.map(v => v.vehicleID), 0) + 1
        this.next_ride_id = Math.max(0, ...rides_data.map(v => v.id), 0) + 1
        this.next_user_id = Math.max(0, ...users_data.map(v => v.id), 0) + 1

    }

    saveUsers() {
        fs.writeFileSync("tmp_data/users.json", JSON.stringify(this.users.map(u => u.Serialize()), null, 4));
    }

    getUser(user_id) { return this.users.find(u => u.getId() == user_id); }
    getUserByEmail(email) { return this.users.find(u => u.getEmail() == email); }
    
    addUser(name, email, pass_hash) {
        let user = User.Parse({ id: this.next_user_id++, name, email, password: pass_hash });
        this.users.push(user);
        this.saveUsers();
    }
    
    deleteUser(user_id) {
        this.users.splice(this.users.findIndex(u => u.getId() == user_id), 1);
        this.saveUsers();
    }
    
    patchUser(user_id, patch) {
        this.users.find(u => u.getId() == user_id).setField(patch["field"], patch["value"]);
        this.saveUsers();
    }


    /////////////////////
    // Drivers & Vehicles
    /////////////////////
    getDriverByUserId(user_id) {
        return this.drivers.find(d => d.userID == user_id) || null
    }

    getVehicleById(vehicle_id) {
        return this.vehicles.find(v => v.vehicleID == vehicle_id) || null
    }

    addVehicle(make, model, year, mpg) {
        const vehicle = { vehicleID: this.next_vehicle_id++, vehicleMake: make, vehicleModel: model, vehicleYear: year, mpg }
        this.vehicles.push(vehicle)
        this.saveVehicles()
        return vehicle.vehicleID
    }

    registerDriver(user_id, vehicle_id, numberPlate) {
        const driver = { driverID: this.next_driver_id++, userID: user_id, vehicleID: vehicle_id, numberPlate, completedRides: 0 }
        this.drivers.push(driver)
        this.saveDrivers()
        return driver.driverID
    }

    saveVehicles() {
        fs.writeFileSync("tmp_data/vehicles.json", JSON.stringify(this.vehicles, null, 4))
    }

    saveDrivers() {
        fs.writeFileSync("tmp_data/drivers.json", JSON.stringify(this.drivers, null, 4))
    }

    /////////////////////
    // Rideshare Routes
    /////////////////////
    saveRoutes() {
        fs.writeFileSync("tmp_data/rideshares.json", JSON.stringify(this.routes, null, 4))
    }

    getDriverRoutes(user_id) {
        return this.routes.filter(r => r.user_id == user_id)
    }

    createRoute({ user_id, start_location, end_location, start_time, seats, stops }) {
        const route = {
            id: this.next_route_id++,
            user_id,
            start_location,
            end_location,
            start_time,
            seats,
            stops: stops || [],
            created_at: new Date().toISOString()
        }
        this.routes.push(route)
        this.saveRoutes()
        return route.id
    }

    deleteRoute(route_id, user_id) {
        const idx = this.routes.findIndex(r => r.id == route_id && r.user_id == user_id)
        if (idx !== -1) {
            this.routes.splice(idx, 1)
            this.saveRoutes()
        }
    }


    
    resetUserPassword(email, newHash) {
        const userIndex = this.users.findIndex(u => 
            u.getEmail().toLowerCase() === email.toLowerCase()
        );
        if (userIndex !== -1) {
            const user = this.users[userIndex];
            user.setField("password", newHash);
            this.saveUsers(); 
            console.log(` SUCCESS! private #password has been updated and saved for ${email}`);
            return true;
        }
        return false;
    }
    generateResetToken(email) {
            const user = this.getUserByEmail(email);
            if (!user) return null;

            const token = Math.floor(100000 + Math.random() * 900000).toString();
            this.resetTokens.set(email.toLowerCase(), token);
            
            return token;
    }
    resetUserPasswordWithToken(email, token, newHash) {
        const lowerEmail = email.toLowerCase();
        const savedToken = this.resetTokens.get(lowerEmail);

        if (!savedToken || savedToken !== token) {
            return false;
        }

        const userIndex = this.users.findIndex(u => u.getEmail().toLowerCase() === lowerEmail);
        if (userIndex !== -1) {
            this.users[userIndex].setField("password", newHash);
            this.saveUsers();
            
            this.resetTokens.delete(lowerEmail); 
            return true;
        }

        return false;
    }

}

let _db
module.exports = {
    DevDatabase,
    /**
     * 
     * @returns {DevDatabase}
     */
    getDatabase() {
        return _db ??= new DevDatabase()
    }
}