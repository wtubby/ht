const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BankAccount = sequelize.define('BankAccount', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联公司ID',
  },
  account_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '账户名称',
  },
  account_number: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: 'uk_account_number',
    comment: '账户号码',
  },
  bank_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '开户银行',
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否默认账户',
  },
  account_status: {
    type: DataTypes.ENUM('正常', '冻结', '销户'),
    allowNull: false,
    defaultValue: '正常',
    comment: '账户状态',
  },
  remarks: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '备注',
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '创建人ID',
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '最后修改人ID',
  },
}, {
  tableName: 'bank_accounts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = BankAccount;
