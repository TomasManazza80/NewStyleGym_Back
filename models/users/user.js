const Sequelize = require('sequelize');
const DataTypes = Sequelize.DataTypes;

const sequelize = require('../../dbconnection/db');

const user = sequelize.define(
  "user",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'user', // Valor por defecto
      validate: { isIn: [['admin', 'user', 'guest']] } // Validación para asegurar que el rol sea uno de los valores permitidos
    },
    meses: {
      type: DataTypes.ARRAY(DataTypes.STRING), // Almacena un arreglo de meses
      allowNull: true, // Puede ser nulo
      defaultValue: [] // Valor por defecto es un arreglo vacío
    }
  },
  {
    timestamps: true,
    paranoid: true,
  }
);

module.exports = user;