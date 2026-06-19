const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Receive = sequelize.define('Receive', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  receive_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: '收款金额',
  },
  main_contract_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联总包合同ID',
  },
  payer_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '付款方名称（发包单位）',
  },
  payee_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '收款方名称（承包单位）',
  },
  account_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '收款方账户名称',
  },
  bank_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '开户银行',
  },
  account_number: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: '账户号码',
  },
  receive_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '收款日期',
  },
  receive_status: {
    type: DataTypes.ENUM('待确认', '已确认'),
    allowNull: false,
    defaultValue: '待确认',
    comment: '收款状态',
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
  tableName: 'receive',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['main_contract_id'], name: 'idx_receive_main_contract' },
    { fields: ['receive_date'], name: 'idx_receive_date' },
    { fields: ['receive_status'], name: 'idx_receive_status' },
    { fields: ['created_at'], name: 'idx_receive_created_at' },
    { fields: ['created_by'], name: 'idx_receive_created_by' },
  ],
});

module.exports = Receive;
