const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  payment_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: '付款金额',
  },
  // 删除 contract_amount 字段
  sub_contract_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联分包合同ID',
  },
  main_contract_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联总包合同ID',
  },
  payer_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '付款方名称',
  },
  payee_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '收款方名称',
  },
  account_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '收款方账户名称',
  },
  account_number: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: '收款方账户号码',
  },
  bank_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '收款方开户银行',
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '付款日期',
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
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['sub_contract_id'], name: 'idx_payment_sub_contract' },
    { fields: ['main_contract_id'], name: 'idx_payment_main_contract' },
    { fields: ['payment_date'], name: 'idx_payment_date' },
    { fields: ['created_at'], name: 'idx_payment_created_at' },
    { fields: ['created_by'], name: 'idx_payment_created_by' },
  ],
});

module.exports = Payment;
