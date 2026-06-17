const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InvoiceOut = sequelize.define('InvoiceOut', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  invoice_no: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: 'uk_invoice_out_no',
    comment: '发票号码',
  },
  invoice_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: '发票金额',
  },
  main_contract_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联总包合同ID',
  },
  buyer: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '购买方名称(默认自动填充，可修改)',
  },
  seller: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '销售方名称(默认自动填充，可修改)',
  },
  invoice_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '开票日期',
  },
  tax_rate: {
    type: DataTypes.TINYINT,
    allowNull: true,
    comment: '税率（整数百分比，如 13 表示 13%）',
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
  tableName: 'invoice_out',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['main_contract_id'], name: 'idx_invoice_out_main_contract' },
    { fields: ['invoice_date'], name: 'idx_invoice_out_date' },
    { fields: ['buyer'], name: 'idx_invoice_out_buyer' },
    { fields: ['created_at'], name: 'idx_invoice_out_created_at' },
  ],
});

module.exports = InvoiceOut;
