const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: 'uk_username',
    comment: '用户名',
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码(加密存储)',
  },
  user_role: {
    type: DataTypes.ENUM('admin', 'user'),
    allowNull: false,
    defaultValue: 'user',
    comment: '用户角色',
  },
  full_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '真实姓名',
  },
  user_status: {
    type: DataTypes.ENUM('正常', '禁用'),
    allowNull: false,
    defaultValue: '正常',
    comment: '用户状态',
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后登录时间',
  },
  token_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '令牌版本号(用于使旧 refresh token 失效)',
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '创建人ID',
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '最后修改人ID',
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = User;
