const path = require('path');
const fs = require('fs');

// 文件模块配置常量对象
const FILE_MODULE_MAP = {
  'FB_BOND':     { type: 'SUB',  suffix: '_bonds',    desc: '担保' },
  'FB_CONTRACT': { type: 'SUB',  suffix: '_files',    desc: '分包合同' },
  'FB_INVOICE':  { type: 'SUB',  suffix: '_invoice',  desc: '进项发票' },
  'FB_PAYMENT':  { type: 'SUB',  suffix: '_payments', desc: '分包付款' },
  'ZB_CONTRACT': { type: 'MAIN', suffix: '_files',    desc: '总包合同' },
  'ZB_INSPECT':  { type: 'MAIN', suffix: '_inspect',  desc: '检查记录' },
  'ZB_INSURE':   { type: 'MAIN', suffix: '_insure',   desc: '工程保险' },
  'ZB_INVOICE':  { type: 'MAIN', suffix: '_invoice',  desc: '销项发票' },
  'ZB_RECEIVE':  { type: 'MAIN', suffix: '_receive',  desc: '总包收款' },
};

// 文件名中需要替换为下划线的字符集合
// 包含：文件系统非法字符 + URL 特殊字符（# % & ? = + 空格）
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|#%&=+ ]/g;

// 上传根目录改为与 backend 平级的 uploads 目录
const uploadDir = path.join(__dirname, '../../../uploads');

/**
 * 根据模块配置和合同ID生成存储目录
 * @param {number} mainId - 总包合同ID
 * @param {number|null} subId - 分包合同ID
 * @param {string} fileModule - 文件模块标识
 * @returns {{mainDir: string, subDir: string, fullDir: string}} - 包含主目录、子目录和完整目录路径的对象
 */
function generateStorageDirectories(mainId, subId, fileModule) {
  const config = FILE_MODULE_MAP[fileModule];

  if (!config) {
    throw new Error(`未定义的文件模块: ${fileModule}`);
  }

  if (mainId == null) {
    throw new Error('mainId 不能为空');
  }
  if (config.type === 'SUB' && subId == null) {
    throw new Error(`模块 ${fileModule} 为分包类型，subId 不能为空`);
  }

  const mainDir = `ZB${mainId}`;

  // 命名规则说明：
  // - 分包模块（如 FB_PAYMENT）：生成 FB${subId}_payments，不包含 mainDir 前缀
  // - 总包模块（如 ZB_CONTRACT）：生成 ZB${mainId}_files，以 mainDir 为前缀
  //   原因：总包路径为 uploads/ZB${mainId}/ZB${mainId}_files，分包为 uploads/ZB${mainId}/FB${subId}_payments
  const subDir = config.type === 'SUB'
    ? `FB${subId}${config.suffix}`
    : `${mainDir}${config.suffix}`;

  return {
    mainDir,
    subDir,
    fullDir: path.join(uploadDir, mainDir, subDir),
  };
}

/**
 * 清理文件名，将不适合作为文件名或 URL 的字符替换为下划线
 * 包含：文件系统非法字符 + URL 特殊字符（# % & ? = + 空格）
 */
function sanitizeFilename(filename) {
  const sanitized = filename.replace(INVALID_FILENAME_CHARS, '_');
  if (!sanitized || /^_+$/.test(sanitized)) {
    throw new Error(`文件名无效: "${filename}"`);
  }
  return sanitized;
}

module.exports = {
  generateStorageDirectories,
  FILE_MODULE_MAP,
  uploadDir,
  sanitizeFilename,
  INVALID_FILENAME_CHARS,
};

