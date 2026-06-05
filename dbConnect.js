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
      const db = new sqlite3.Database("./test.db");
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
    try{
      const illegalUnameChars = /[;:$\-+='"% /|<>{}()\[\]&^£!*@#~?.,`\n]/;
      const nameCheck = name.length < 3 || name.length > 32 || illegalUnameChars.test(name);
      const illegalEmailChars = /[;:$\-+='"% /|<>{}()\[\]&^£!*#~?,`\n]/;
      const emailCheck = (email.length < 3 || email.length > 32 || illegalEmailChars.test(email)) && email.includes("@");
      console.log(nameCheck, emailCheck);
      if(nameCheck || emailCheck){
        console.log("check failed");
        return {success:false, message:"illegal characters entered"};
      }
    
      const salt = await hash.saltGen();
      const passHash = await hash.passwordHash(salt, password);
      const queryText = "INSERT INTO Users (username, email, passHash, salt) VALUES ($1, $2, $3, $4, $5)";
      await this.pool.query(
        queryText,
        [name, email, passHash, salt]
      );
      return {success:true, message:"User added"};
    }
    catch(err){
      console.error("addUser failed:", err);
      return {success:false, message:"failed to add user"};
    };
  }
 
 
  



  async getUsers(){
    const data = await this.pool.query("SELECT * from Users").catch(err => console.error("getUsers failed:", err));
    return data.rows;
  }

  async checkLoginInfo(username, email, password) {
    //console.log(username, email);
    const illegalUnameChars = /[;:$\-+='"% /|<>{}()\[\]&^£!*@#~?.,`\n]/;
    const nameCheck = username.length < 3 || username.length > 32 || illegalUnameChars.test(username);
    const illegalEmailChars = /[;:$\-+='"% /|<>{}()\[\]&^£!*#~?,`\n]/;
    const emailCheck = (email.length < 3 || email.length > 32 || illegalEmailChars.test(email)) && email.includes("@");
    //console.log(nameCheck, emailCheck);
    if(nameCheck || emailCheck){
      console.log("check failed");
      return false;
    }
    let match = false;
    let data;
    try {
      const lowerEmail = email.toLowerCase();
      data = await this.pool.query(
        "SELECT salt, passHash FROM Users WHERE username = $1 AND email = $2",
        [username, lowerEmail]
      );
    } catch (err) {
      console.error("checkLoginInfo failed", err);
      return match;
    }
    if (!data.rows.length) {
      return match;
    }
    const { salt, passhash } = data.rows[0];
    console.log(salt);
    match = await hash.verify(salt, password, passhash);
    return match;
  }

  async checkUserExists(username, email){
    console.log(username, email)
    const queryText = "SELECT username, email FROM Users WHERE username = $1 AND email = $2";
    const data = await this.pool.query(
      queryText,
      [username, email]
    ).catch(err =>{
        console.log(err);
    })
    console.log(data.rows);
    console.log(data.rows.length);
    if(data.rows.length >= 1){
      return {success: false, message: "User already exists"};
    }
    else{
      return {success:true, message: "Adding User..."};
    }

  }
}

const connect = new Connect();
module.exports = connect;
