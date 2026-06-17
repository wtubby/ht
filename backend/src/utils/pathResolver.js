const path = require('path');

// backend/src/utils 向上 3 层 = 项目根目录
const PROJECT_ROOT = path.join(__dirname, '../../..');

/**
 * 将数据库 file_path 解析为磁盘物理路径
 * 兼容 Windows 下 "/uploads/..." 的路径拼接
 * @param {string} dbPath
 * @returns {string}
 */
function resolvePhysicalPath(dbPath) {
  if (!dbPath) return dbPath;

  if (dbPath.startsWith('/uploads/') || dbPath.startsWith('\\uploads\\')) {
    const relativePath = dbPath.replace(/^[/\\]+/, '');
    return path.join(PROJECT_ROOT, relativePath);
  }

  if (path.isAbsolute(dbPath)) {
    return dbPath;
  }

  return path.join(PROJECT_ROOT, dbPath);
}

module.exports = {
  PROJECT_ROOT,
  resolvePhysicalPath,
};
