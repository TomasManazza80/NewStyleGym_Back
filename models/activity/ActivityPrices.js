const { DataTypes } = require('sequelize');
const sequelize = require('../../dbconnection/db');

const ActivityPrices = sequelize.define('ActivityPrices', {
  unaActividad: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  paseLibre: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  estudiante3dias: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true
});

module.exports = ActivityPrices;