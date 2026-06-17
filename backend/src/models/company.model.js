const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  company_type: {
    type: DataTypes.ENUM('签约单位', '合作单位'),
    allowNull: false,
    comment: '公司类型',
  },
  company_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '公司名称',
  },
  credit_code: {
    type: DataTypes.STRING(30),
    allowNull: true,
    unique: 'uk_credit_code',
    comment: '统一社会信用代码(签约单位可为空)',
  },
  legal_person: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '法定代表人',
  },
  reg_capital: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: '注册资金',
  },
  establish_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '成立时间',
  },
  address: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '地址',
  },
  remarks: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '备注',
  },
  company_status: {
    type: DataTypes.ENUM('正常', '禁用'),
    allowNull: false,
    defaultValue: '正常',
    comment: '单位状态',
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
  tableName: 'company',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['company_name', 'company_type'],
      name: 'uk_company_name_type',
    },
  ],
});

module.exports = Company;
