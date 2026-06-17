const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MainContract = sequelize.define('MainContract', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  contract_no: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '合同编号(可选)',
  },
  contract_status: {
    type: DataTypes.ENUM('未签约', '执行中', '已完工', '已完结'),
    allowNull: false,
    defaultValue: '未签约',
    comment: '合同状态',
  },
  contract_name: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '合同名称',
  },
  party_a_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '发包单位ID',
  },
  party_b_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '承包单位ID',
  },
  amount_contract: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: '合同金额(签约暂估金额)',
  },
  amount_settlement: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: '结算金额(最终确认金额)',
  },
  date_signed: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '签约日期',
  },
  date_warranty: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '保修到期日期',
  },
  date_start: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '开工日期',
  },
  date_end: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '竣工日期',
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
  tableName: 'main_contracts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['contract_status'], name: 'idx_main_contract_status' },
    { fields: ['party_a_id'], name: 'idx_main_contract_party_a' },
    { fields: ['party_b_id'], name: 'idx_main_contract_party_b' },
    { fields: ['date_signed'], name: 'idx_main_contract_date_signed' },
    { fields: ['created_at'], name: 'idx_main_contract_created_at' },
    { fields: ['created_by'], name: 'idx_main_contract_created_by' },
    { fields: ['contract_no'], name: 'idx_main_contract_no' },
  ],
});

module.exports = MainContract;
