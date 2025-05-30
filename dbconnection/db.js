const { Sequelize } = require('sequelize');
require('dotenv').config();

// Construye la URL de conexión con el formato correcto para PostgreSQL
const dbUrl = process.env.DATABASE_URL;

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false,
  native: false
});

module.exports = sequelize;