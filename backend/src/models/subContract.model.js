const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubContract = sequelize.define('SubContract', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  main_contract_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联总包合同ID',
  },
  contract_name: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '分包合同名称',
  },
  contract_status: {
    type: DataTypes.ENUM('未签约', '执行中', '已完工', '已完结'),
    allowNull: false,
    defaultValue: '未签约',
    comment: '合同状态',
  },
  contract_type: {
    type: DataTypes.ENUM('专业分包', '劳务分包', '其他服务', '材料采购'),
    allowNull: false,
    comment: '合同类型',
  },
  party_b_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '承包单位ID(签约单位类型)',
  },
  party_c_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '分包单位ID(合作单位类型)',
  },
  amount_contract: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: '合同金额(暂估)',
  },
  amount_settlement: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: '结算金额(最终)',
  },
  // total_paid (已移除，改用 findAll 实时聚合)
  // total_invoiced_in (已移除，改用 findAll 实时聚合)
  date_signed: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '签约日期',
  },
  remarks: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '备注',
  },
  bond_perf_req: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否需要履约保证金',
  },
  bond_labor_req: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否需要民工保证金',
  },
  bond_perf_amt: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: '履约保证金约定金额(元)',
  },
  bond_labor_amt: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: '民工保证金约定金额(元)',
  },
  bond_perf_form: {
    type: DataTypes.ENUM('现金', '保函', '不限'),
    allowNull: true,
    comment: '履约保证金约定形式',
  },
  bond_labor_form: {
    type: DataTypes.ENUM('现金', '保函', '不限'),
    allowNull: true,
    comment: '民工保证金约定形式',
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
  tableName: 'sub_contracts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['main_contract_id'], name: 'idx_sub_contract_main' },
    { fields: ['contract_status'], name: 'idx_sub_contract_status' },
    { fields: ['contract_type'], name: 'idx_sub_contract_type' },
    { fields: ['party_b_id'], name: 'idx_sub_contract_party_b' },
    { fields: ['party_c_id'], name: 'idx_sub_contract_party_c' },
    { fields: ['date_signed'], name: 'idx_sub_contract_date_signed' },
    { fields: ['created_at'], name: 'idx_sub_contract_created_at' },
  ],
});

module.exports = SubContract;
