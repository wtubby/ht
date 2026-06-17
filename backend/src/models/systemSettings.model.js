const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SystemSettings = sequelize.define('SystemSettings', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  system_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: '项目管理系统',
  },
  system_logo: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  baidu_ocr_api_key: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  baidu_ocr_secret_key: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  ocr_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'system_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = SystemSettings;
