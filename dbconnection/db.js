const { Sequelize } = require('sequelize');
require('dotenv').config();

// Construye la URL de conexión con el formato correcto para PostgreSQL
const dbUrl = `postgresql://newstylegym_database_user:PfhE3U8pXZMXNJXuAltLinsTTvGfc3jt@dpg-d0qrds2dbo4c73cc94c0-a.oregon-postgres.render.com/newstylegym_database`;

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