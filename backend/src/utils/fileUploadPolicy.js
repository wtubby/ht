const path = require('path');
const ApiError = require('./ApiError');
const ERROR_CODES = require('./errorCodes');

/** 与前端 fileModuleConfig.ts DEFAULT_ACCEPT 对齐 */
const DEFAULT_ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png',
]);

/** 发票模块仅允许 PDF 与图片 */
const INVOICE_ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

const INVOICE_FILE_MODULES = new Set(['FB_INVOICE', 'ZB_INVOICE']);

const EXTENSION_MIME_MAP = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel', 'application/vnd.ms-excel.sheet.macroEnabled.12'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
};

/** 禁止浏览器内联渲染的扩展名（兜底，防历史脏数据） */
const DANGEROUS_INLINE_EXTENSIONS = new Set([
  '.html', '.htm', '.xhtml', '.svg', '.js', '.mjs', '.jsx', '.ts', '.tsx',
  '.xml', '.xsl', '.xslt', '.php', '.asp', '.aspx', '.jsp', '.exe', '.bat', '.cmd', '.sh',
]);

function decodeOriginalName(file) {
  return Buffer.from(file.originalname, 'latin1').toString('utf8');
}

function getExtension(filename) {
  return path.extname(filename).toLowerCase();
}

function hasSuspiciousFilename(filename) {
  const lower = path.basename(filename).toLowerCase();
  return ['.html.', '.htm.', '.svg.', '.js.', '.exe.'].some((part) => lower.includes(part));
}

function isMimeAllowed(ext, mimetype) {
  const allowedMimes = EXTENSION_MIME_MAP[ext];
  if (!allowedMimes) return false;

  const mime = (mimetype || '').toLowerCase().split(';')[0].trim();
  if (!mime || mime === 'application/octet-stream') return true;

  return allowedMimes.includes(mime);
}

function getAllowedExtensions(fileModule) {
  if (fileModule && INVOICE_FILE_MODULES.has(fileModule)) {
    return INVOICE_ALLOWED_EXTENSIONS;
  }
  return DEFAULT_ALLOWED_EXTENSIONS;
}

function validateUploadFile(file, fileModule) {
  const originalname = decodeOriginalName(file);
  const ext = getExtension(originalname);

  if (!ext) {
    throw new ApiError(400, '文件必须包含扩展名', ERROR_CODES.VALIDATION_ERROR);
  }

  if (hasSuspiciousFilename(originalname)) {
    throw new ApiError(400, '不允许的文件名格式', ERROR_CODES.VALIDATION_ERROR);
  }

  const allowed = getAllowedExtensions(fileModule);
  if (!allowed.has(ext)) {
    throw new ApiError(400, `不支持的文件类型: ${ext}`, ERROR_CODES.VALIDATION_ERROR);
  }

  if (!isMimeAllowed(ext, file.mimetype)) {
    throw new ApiError(400, '文件类型与扩展名不匹配', ERROR_CODES.VALIDATION_ERROR);
  }
}

function createMulterFileFilter() {
  return (req, file, cb) => {
    try {
      // multipart 中 file_module 通常与 file 同批到达；发票模块的二次校验在 service 层
      validateUploadFile(file, req.body?.file_module);
      cb(null, true);
    } catch (err) {
      cb(err);
    }
  };
}

function applyUploadsStaticHeaders(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (DANGEROUS_INLINE_EXTENSIONS.has(ext)) {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

module.exports = {
  DEFAULT_ALLOWED_EXTENSIONS,
  INVOICE_ALLOWED_EXTENSIONS,
  DANGEROUS_INLINE_EXTENSIONS,
  validateUploadFile,
  createMulterFileFilter,
  applyUploadsStaticHeaders,
};
