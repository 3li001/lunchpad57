const fs = require("node:fs");
const {Pool} = require("pg");
const path = require("path");
const sqlite3 = require("sqlite3");
const hash = require("./passwordHash.js");

class Connect{
  constructor(){
   console.log("dbConnect called");

   //const filePath = path.join(__dirname, "test.db");
   
  this.isConnected = null;
  this.connectionError = "Server is establishing connection to database, please hold a moment.";


  this.tryToConnect();
  
}

  // putting this in a function so we can call it repeatedly if it fails, rather than just on the connect creation
  async tryToConnect(attempts = 0, maxAttempts = 2) {
     
    try {
      this.db = new sqlite3.Database("./test.db");
      console.log("connected to DB");
      this.isConnected = true;
      //console.log(this.isConnected);
    } catch (err) {
      console.error("could not connect to DB", err);
      this.isConnected = false;
      if (err.code == "ETIMEDOUT") this.connectionError = "Database unavailable, please try again later."
      else this.connectionError = err.code;

      if (attempts < maxAttempts) {
        // then try again a few times
        console.log(`Could not connect to DB, retrying... (attempt ${attempts + 1}/${maxAttempts})`);
        await this.tryToConnect(attempts + 1, maxAttempts);
      } else {
        let errormsg = `Failed to connect after ${maxAttempts} attempts, giving up. Please try again later.`;
        console.error(errormsg);
        this.connectionError = errormsg;
      }
    }
  }


  // error page redirection check
  getStatus() {
    return {
      connected: this.isConnected, 
      errorMsg: this.connectionError
    };
  }

 async addUser(name, email, password) {
  try {
    const illegalUnameChars = /[;:$\-+='"% /|<>{}()\[\]&^£!*@#~?.,`\n]/;
    const nameCheck = name.length < 3 || name.length > 32 || illegalUnameChars.test(name);
    const illegalEmailChars = /[;:$\-+='"% /|<>{}()\[\]&^£!*#~?,`\n]/;
    const emailCheck = (email.length < 3 || email.length > 32 || illegalEmailChars.test(email)) && email.includes("@");

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
  const emailCheck = (email.length < 3 || email.length > 32 || illegalEmailChars.test(email)) && email.includes("@");

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
  
async getUserID(email){
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
}

const connect = new Connect();
module.exports = connect;
