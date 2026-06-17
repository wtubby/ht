const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const File = sequelize.define('File', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  file_module: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '关联模块',
  },
  record_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '关联记录ID',
  },
  main_contract_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '总包ID',
  },
  sub_contract_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '分包ID',
  },
  original_filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '原始文件名',
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: '文件存储路径',
  },
  file_size: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: '文件大小(字节)',
  },
  file_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '文件类型/扩展名',
  },
  uploaded_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '上传时间',
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '上传人ID',
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
  tableName: 'files',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['file_module'], name: 'idx_file_module' },
    { fields: ['record_id'], name: 'idx_file_record' },
    { fields: ['main_contract_id'], name: 'idx_file_main_contract' },
    { fields: ['sub_contract_id'], name: 'idx_file_sub_contract' },
    { fields: ['uploaded_at'], name: 'idx_file_uploaded_at' },
    { fields: ['uploaded_by'], name: 'idx_file_uploaded_by' },
  ],
});

module.exports = File;
