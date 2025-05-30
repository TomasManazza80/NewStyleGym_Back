const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function authHash(argu) {
  const salt = await bcrypt.genSalt(10);
  const hashpassword = await bcrypt.hash(argu.password, salt);

  return hashpassword;
}

async function compareHash(Pass) {
  try {
    const res = await bcrypt.compare(Pass.userPass, Pass.dbPass);
    return res;
  } catch (err) {
    console.log("Error comparing passwords:", err);
    throw err;
  }
}

async function createToken(argu) {

  const token = await jwt.sign({
    id: argu.id,
    email: argu.email,
    password: argu.password,
    nombre: argu.nombre,
    apellido: argu.apellido,
    rol: argu.rol
  }, "mysecretkeyofcreatingtoken", {
    expiresIn: 604800,
  });

  return token;
}
module.exports = { authHash, createToken, compareHash };
