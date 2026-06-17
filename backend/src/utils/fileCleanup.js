const fs = require('fs');
const { File } = require('../models');
const { resolvePhysicalPath } = require('../utils/pathResolver');

/**
 * 异步并发删除物理文件（失败不阻塞业务流程）
 * @param {Array} fileRecords - File 模型实例数组
 */
async function deletePhysicalFiles(fileRecords) {
  await Promise.allSettled(
    fileRecords.map(async (record) => {
      if (!record.file_path) return;
      const physicalPath = resolvePhysicalPath(record.file_path);
      try {
        await fs.promises.unlink(physicalPath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.error(`删除物理文件失败: ${physicalPath}`, err);
        }
      }
    }),
  );
}

/**
 * 根据 Where 条件清理文件（先删数据库记录，再删物理文件）
 * @param {Object} where - Sequelize where 条件
 * @param {Object} transaction - Sequelize 事务对象
 * @returns {Promise<number>} 实际删除的文件数量
 */
async function cleanupFiles(where, transaction) {
  const relatedFiles = await File.findAll({ where, transaction });
  const deletedCount = await File.destroy({ where, transaction });

  if (transaction && typeof transaction.afterCommit === 'function') {
    transaction.afterCommit(() => {
      deletePhysicalFiles(relatedFiles).catch((err) => {
        console.error('事务提交后删除物理文件失败:', err);
      });
    });
  } else {
    await deletePhysicalFiles(relatedFiles);
  }

  return deletedCount;
}

/**
 * 按模块标识 + 记录ID 删除关联文件（快捷方法）
 * @param {string} fileModule - 文件模块标识，如 'FB_INVOICE'
 * @param {number} recordId - 关联记录ID
 * @param {Object} transaction - 事务对象
 * @returns {Promise<number>} 删除的文件数量
 */
function cleanupModuleFiles(fileModule, recordId, transaction) {
  return cleanupFiles({ file_module: fileModule, record_id: recordId }, transaction);
}

module.exports = {
  cleanupFiles,
  cleanupModuleFiles,
  deletePhysicalFiles,
};
