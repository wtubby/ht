const db = require('../models');
const ApiError = require('./ApiError');
const ERROR_CODES = require('./errorCodes');
const { cleanupModuleFiles } = require('./fileCleanup');

/**
 * 删除业务记录并清理关联附件（事务模板）
 * @param {Object} options
 * @param {import('sequelize').ModelStatic} options.model - Sequelize 模型
 * @param {number} options.id - 记录 ID
 * @param {string} options.fileModule - 附件模块标识
 * @param {string} options.notFoundMessage - 记录不存在时的错误信息
 * @param {(record: import('sequelize').Model, transaction: import('sequelize').Transaction) => Promise<void>} [options.afterDestroy] - 删除记录后、提交前回调（同事务）
 * @returns {Promise<{ deletedFilesCount: number }>}
 */
async function removeRecordWithFiles({ model, id, fileModule, notFoundMessage, afterDestroy }) {
  const t = await db.sequelize.transaction();

  try {
    const record = await model.findByPk(id, { transaction: t });
    if (!record) {
      throw new ApiError(404, notFoundMessage, ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    const deletedFilesCount = await cleanupModuleFiles(fileModule, id, t);
    await record.destroy({ transaction: t });
    if (afterDestroy) {
      await afterDestroy(record, t);
    }
    await t.commit();

    return { deletedFilesCount };
  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }
    throw error;
  }
}

module.exports = {
  removeRecordWithFiles,
};
