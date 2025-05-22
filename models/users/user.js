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
      allowNull: true, // Cambiado a true para que sea opcional
      defaultValue: 'user', // Se mantendrá el valor por defecto
      validate: {
        isIn: [['admin', 'user']] // Simplificado los roles permitidos
      }
    },
    meses: {
      type: DataTypes.ARRAY(DataTypes.STRING), // Almacena un arreglo de meses
      allowNull: true, // Puede ser nulo
      defaultValue: [] // Valor por defecto es un arreglo vacío
    },
    actividad: {
      type: DataTypes.STRING,
      allowNull: false, // Cambiado a false para hacerlo requerido
      validate: {
        notEmpty: true // Asegura que no sea una cadena vacía
      }
    },
  },

  {
    timestamps: true,
    paranoid: true,
  }
);

module.exports = user;