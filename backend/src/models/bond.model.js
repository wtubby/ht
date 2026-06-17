const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { resolveBondDisplayStatus } = require('../utils/bond.helper');

const Bond = sequelize.define('Bond', {
  // 虚拟字段：自动计算的状态
  computed_status: {
    type: DataTypes.VIRTUAL,
    get() {
      return resolveBondDisplayStatus({
        status: this.getDataValue('status'),
        bond_form: this.getDataValue('bond_form'),
        date_end: this.getDataValue('date_end'),
      });
    },
  },
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '保证金记录ID',
  },
  sub_contract_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的分包合同ID',
  },
  bond_type: {
    type: DataTypes.ENUM('履约保证金', '民工保证金'),
    allowNull: false,
    comment: '保证金类型：履约保证金或民工保证金',
  },
  bond_form: {
    type: DataTypes.ENUM('现金', '保函'),
    allowNull: false,
    comment: '保证金形式：现金或保函',
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: '金额',
  },
  status: {
    type: DataTypes.ENUM('担保中', '已退还', '已过期'),
    allowNull: false,
    defaultValue: '担保中',
    comment: '状态：担保中、已退还、已过期（保函会根据到期日期自动判断）',
  },
  account_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '账户名称',
  },
  account_number: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: '账户号码',
  },
  bank_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '开户银行',
  },
  organization: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '开立机构（银行或保险公司）',
  },
  date_start: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '生效日期',
  },
  date_end: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '到期日期',
  },
  remarks: {
    type: DataTypes.TEXT,
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
  tableName: 'bond',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  indexes: [
    {
      unique: true,
      fields: ['sub_contract_id', 'bond_type'],
      name: 'uk_bond_sub_contract_type',
    },
    { fields: ['sub_contract_id'], name: 'idx_bond_sub_contract' },
    { fields: ['bond_type'], name: 'idx_bond_type' },
    { fields: ['bond_form'], name: 'idx_bond_form' },
    { fields: ['status'], name: 'idx_bond_status' },
    { fields: ['date_end'], name: 'idx_bond_date_end' },
    { fields: ['created_at'], name: 'idx_bond_created_at' },
  ],
});

module.exports = Bond;
