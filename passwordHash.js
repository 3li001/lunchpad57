const crypto = require("crypto");
const argon2 = require("argon2");
const fs = require("node:fs");
const path = require("path");

exports.passwordHash = async (salt, plainText) => {
  const file = path.join(__dirname, "pepper.txt");
  const pepper = fs.readFileSync(file, "utf8");

  const seasoned = salt.concat(plainText, pepper);
  const hash = await argon2.hash(seasoned);
  console.log(hash.length);
  return hash;
}

exports.verify = async (salt, plainText, hash) =>{
  const file = path.join(__dirname, "pepper.txt");
  const pepper = fs.readFileSync(file, "utf8");
  const seasoned = salt.concat(plainText, pepper);
  return await argon2.verify(hash, seasoned);
}

exports.saltGen = () => {
  var result = "";
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
  for(var i = 0; i < 32; i++){
    result += chars.charAt(crypto.randomInt(chars.length));
  }
  return result;
}
