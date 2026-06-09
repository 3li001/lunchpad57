const sqlite3 = require("sqlite3");
const crypto = require("crypto");
const hash = require("./passwordHash.js");

class Connect {
    constructor() {
        console.log("dbConnect called");

        //const filePath = path.join(__dirname, "test.db");

        this.isConnected = null;
        this.connectionError = "Server is establishing connection to database, please hold a moment.";

        this.resetTokens = new Map();

        this.tryToConnect();

    }

    // putting this in a function so we can call it repeatedly if it fails, rather than just on the connect creation
    async tryToConnect(attempts = 0, maxAttempts = 2) {
        return new Promise((resolve) => {
            this.db = new sqlite3.Database("./test.db", (err) => {
                if (!err) {
                    console.log("connected to DB");
                    this.isConnected = true;
                    return resolve();
                }

                console.error("could not connect to DB", err);
                this.isConnected = false;
                if (err.code == "ETIMEDOUT") this.connectionError = "Database unavailable, please try again later.";
                else this.connectionError = err.code;

                if (attempts < maxAttempts) {
                    console.log(`Could not connect to DB, retrying... (attempt ${attempts + 1}/${maxAttempts})`);
                    resolve(this.tryToConnect(attempts + 1, maxAttempts));
                } else {
                    const errormsg = `Failed to connect after ${maxAttempts} attempts, giving up. Please try again later.`;
                    console.error(errormsg);
                    this.connectionError = errormsg;
                    resolve();
                }
            });
        });
    }


    // error page redirection check
    getStatus() {
        return {
            connected: this.isConnected,
            errorMsg: this.connectionError
        };
    }
    
    async addUser(name, email, password) {
        email = email.toLowerCase()
        try {
            const illegalUnameChars = /[;:$+="%/|<>{}()\[\]&^£!*@#~?.,`\n]/;
            const nameCheck = name.length < 3 || name.length > 32 || illegalUnameChars.test(name);
            const illegalEmailChars = /[;:$\-+='"% /|<>{}()\[\]&^£!*#~?,`\n]/;
            const emailCheck = email.length < 3 || email.length > 254 || !email.includes("@") || illegalEmailChars.test(email);

            if (nameCheck || emailCheck) {
                return { success: false, message: "illegal characters entered" };
            }

            const salt = await hash.saltGen();
            const passHash = await hash.passwordHash(salt, password);


            const queryText = `INSERT INTO Users (username, email, passHash, salt) VALUES (?, ?, ?, ?)`;

            //sqlite3 uses promises
            await new Promise((resolve, reject) => {
                this.db.run(queryText, [name, email, passHash, salt], function (err) {
                    if (err) return reject(err);
                    resolve(this); // `this` has lastID
                });
            });

            return { success: true, message: "User added" };
        } catch (err) {
            console.error("addUser failed:", err);
            return { success: false, message: "failed to add user" };
        }
    }






    async getUsers() {
        try {
            const rows = await new Promise((resolve, reject) => {
                this.db.all("SELECT * FROM Users", [], (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                });
            });

            return rows;
        } catch (err) {
            console.error("getUsers failed:", err);
            return [];
        }
    }

    async checkLoginInfo(email, password) {
        const illegalEmailChars = /[;:$\-+='"% /|<>{}()\[\]&^£!*#~?,`\n]/;
        const emailCheck = email.length < 3 || email.length > 254 || !email.includes("@") || illegalEmailChars.test(email);

        if (emailCheck) {
            console.log("check failed");
            return false;
        }

        let match = false;
        
        try {
            const lowerEmail = email.toLowerCase();
            const row = await new Promise((resolve, reject) => {
                this.db.get(
                    "SELECT salt, passHash FROM Users WHERE email = ?",
                    [lowerEmail],
                    (err, row) => {
                        if (err) return reject(err);
                        resolve(row);
                    }
                );
            });
            if (!row) {
                return false;
            }
            const { salt, passHash } = row;
            match = await hash.verify(salt, password, passHash);
            return match;
        } catch (err) {
            console.error("checkLoginInfo failed", err);
            return false;
        }
    }
    async getUser(userID){
        try{
            const row = await new Promise((resolve, reject) =>{
                this.db.get("Select * FROM Users WHERE userID = ?",[userID],
                    (err,row)=>{
                        if(err) return reject(err);
                        resolve(row);
                    }
                );
            });
        return row;
        }
        catch(err){
            console.error("getUser:",err);
            return {success:false, message: "Database error"};
        }
    }
    async getDriver(userID){
        try{
            const row=await new Promise((resolve,reject)=>{
                this.db.get("Select * FROM Drivers JOIN Vehicles on drivers.vehicleID=Vehicles.vehicleID Where userID=?",[userID],
                    (err,row)=>{
                        if(err) return reject(err);
                        resolve(row);
                    }
                );
            });
            return row;
        }
        catch(err){
            console.error("getDriver:",err);
            return{success:false, message: "Database error"};
        }
    }
async getVehicleID(make,model,year){
    try{
        const row=await new Promise((resolve,reject)=>{
            this.db.get("SELECT vehicleID FROM Vehicles WHERE vehicleMake=? AND vehicleModel =? AND  vehicleYear=?",[make,model,year],
                (err,row)=>{
                    if(err) return reject(err);
                    resolve(row);
                }
            );
        });
        return row;
    }
    catch(err){
        console.error("getVehicle:",err);
        return{success:false,message:"Database error"};
    }
}
async addDriver(userID,vehicleID,numberplate){
    try{
        const row=await new Promise((resolve,reject)=>{
            this.db.run("INSERT into Drivers(userID,vehicleID,numberplate) Values(?,?,?)",[userID,vehicleID,numberplate],
                (err,row)=>{
                    if(err) return reject(err);
                    resolve(row);
                }

            );
        });
        return row;
    }
    catch(err){
        console.error("addDriver:",err);
        return{success:false,message:"Database error"};
    }
}
    async getUserID(email) {
        try {
            const row = await new Promise((resolve, reject) => {
                this.db.get(
                    "SELECT userID FROM Users WHERE email = ?",
                    [email],
                    (err, row) => {
                        if (err) return reject(err);
                        resolve(row);
                    }
                );
            });
            return row;
        }

catch (err) {
    console.error("getUserID:", err);
    return { success: false, message: "Database error" };
  }
}
async getVehicleMakes(){
    return await new Promise((resolve, reject)=>{
        this.db.all("SELECT DISTINCT vehicleMake from Vehicles",
        (err,row)=>{
            if (err) return reject(err);
            resolve(row);
        }
     );
    });
}
async getVehicleModels(make){
    return await new Promise((resolve, reject)=>{
        this.db.all("SELECT DISTINCT vehicleModel FROM Vehicles WHERE vehicleMake=?",[make],
            (err,row)=>{
                if(err) return reject(err);
                resolve(row);
            }
        );
    });
}
async getVehicleYears(model){
    return await new Promise((resolve,reject)=>{
        this.db.all("SELECT vehicleYear FROM Vehicles WHERE vehicleModel=?",[model],
            (err,row)=>{
                if(err) return reject(err);
                resolve(row);
            }
        );
    });
}
async getRideshares() {
  return await new Promise((resolve, reject) => {
    this.db.all("SELECT userName, d.driverID, d.startID, d.endID, sp.placeID   AS start_placeID, sp.placeName AS start_placeName, sp.latitude  AS start_latitude, sp.longitude AS start_longitude, ep.placeID   AS end_placeID, ep.placeName AS end_placeName, ep.latitude  AS end_latitude, ep.longitude AS end_longitude FROM users join Drivers ON users.userID=Drivers.driverID JOIN DriverCommutes d on Drivers.driverID=d.driverID JOIN VerifiedPlaces sp ON d.startId = sp.placeID JOIN VerifiedPlaces ep ON d.endId = ep.placeID;",
(err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}
async checkUserExists(username, email) {
  console.log(username, email);

  try {
    const row = await new Promise((resolve, reject) => {
      this.db.get(
        "SELECT username, email FROM Users WHERE username = ? AND email = ?",
        [username, email],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
      }    catch (err) {
            console.error("getUserID:", err);
            return { success: false, message: "Database error" };
        }
    
  }

    async checkUserExists(username, email) {
        console.log(username, email);
        try {
            const row = await new Promise((resolve, reject) => {
                this.db.get(
                    "SELECT email FROM Users WHERE email = ?",
                    [email.toLowerCase()],
                    (err, row) => {
                        if (err) return reject(err);
                        resolve(row);
                    }
                );
            });

            console.log(row);

            if (row) {
                return { success: false, message: "User already exists" };
            } else {
                return { success: true, message: "Adding User..." };
            }

        } catch (err) {
            console.error("checkUserExists failed:", err);
            return { success: false, message: "Database error" };
        }
    }

    //generates a token if the user email exists in the SQLite db
    async generateResetToken(email) {
        try {
            const row = await new Promise((resolve, reject) => {
                this.db.get("SELECT email FROM Users WHERE LOWER(email) = LOWER(?)", [email], (err, row) => {
                    if (err) return reject(err);
                    resolve(row);
                });
            });

            if (!row) return null;
            const token = crypto.randomInt(100000, 1000000).toString();
            this.resetTokens.set(email.toLowerCase(), token);
            return token;
        } catch (err) {
            console.error("generateResetToken error:", err);
            return null;
        }
    }

    //verify if code matches to internal map
    verifyResetToken(email, token) {
        const savedToken = this.resetTokens.get(email.toLowerCase());
        return savedToken && savedToken === token;
    }

    //updates the passHash and salt columns for a user in the SQLite database
    async resetUserPasswordWithToken(email, passHash, salt) {
        try {
            const result = await new Promise((resolve, reject) => {
                this.db.run(
                    "UPDATE Users SET passHash = ?, salt = ? WHERE LOWER(email) = LOWER(?)",
                    [passHash, salt, email],
                    function (err) {
                        if (err) return reject(err);
                        resolve(this.changes > 0);
                    }
                );
            });

            if (result) {
                this.resetTokens.delete(email.toLowerCase());
                return true;
            }
            return false;
        } catch (err) {
            console.error("resetUserPasswordWithToken error:", err);
            return false;
        }
    }

}

const connect = new Connect();
module.exports = connect;
