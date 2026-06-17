const { Op } = require('sequelize');
const db = require('../models');
const File = db.File;

/**
 * 为列表数据批量附加 has_files 状态
 * @param {Array} items - 列表项数组（需有 id 属性）
 * @param {string} fileModule - 文件模块标识
 * @returns {Array} 原数组引用
 */
async function attachFileStatus(items, fileModule) {
  if (!items || items.length === 0) return items;

  const ids = items.map(r => r.id);
  const fileCounts = await File.findAll({
    where: { file_module: fileModule, record_id: { [Op.in]: ids } },
    attributes: [
      'record_id',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'file_count'],
    ],
    group: ['record_id'],
    raw: true,
  });

  const fileCountMap = new Map();
  fileCounts.forEach(item => {
    fileCountMap.set(item.record_id, parseInt(item.file_count) > 0);
  });
  items.forEach(r => {
    r.has_files = fileCountMap.get(r.id) || false;
  });

  return items;
}

/**
 * 查询单条记录是否有文件
 * @param {string} fileModule - 文件模块标识
 * @param {number} recordId - 记录ID
 * @returns {boolean}
 */
async function checkFileStatus(fileModule, recordId) {
  const count = await File.count({
    where: { file_module: fileModule, record_id: recordId },
  });
  return count > 0;
}

module.exports = { attachFileStatus, checkFileStatus };
