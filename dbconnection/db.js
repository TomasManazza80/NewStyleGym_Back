const { Sequelize } = require('sequelize');

const DATABASE = 'postgres';
const USERNAME = 'postgres';
const PASSWORD = 'password';
const HOST = 'localhost';
const PORT = 5432;
const DIALECT = 'postgres';

const sequelize = new Sequelize(DATABASE, USERNAME, PASSWORD, {
  host: HOST,
  port: PORT,
  dialect: DIALECT,
  dialectOptions: {
    ssl: false // <--- Deshabilitar SSL
  },
  logging: false,
  native: false,
});

module.exports = sequelize;