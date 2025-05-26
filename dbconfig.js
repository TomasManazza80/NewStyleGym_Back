require("dotenv").config();

module.exports = {
  db: {
    database: process.env.DATABASE_NAME || process.env.DATABASE,
    username: process.env.DB_USER || process.env.USERNAME,
    password: process.env.DB_PASSWORD || process.env.PASSWORD,
    host: process.env.DB_HOST || process.env.HOST,
    port: parseInt(process.env.DB_PORT || 5432), // Puerto específico para DB
    dialect: 'postgres',
    dialectOptions: {
      ssl: { // Configuración SSL obligatoria para Render
        require: true,
        rejectUnauthorized: false
      }
    },
    protocol: 'postgres',
    logging: false // Desactiva logs de SQL en producción
  }
};