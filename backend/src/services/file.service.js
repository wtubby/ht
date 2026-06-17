const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { File, MainContract, SubContract, User, InvoiceIn, InvoiceOut } = require('../models');
const {
  generateStorageDirectories,
  FILE_MODULE_MAP,
  uploadDir,
  sanitizeFilename,
  INVALID_FILENAME_CHARS,
} = require('../utils/pathGenerator');
const { resolvePhysicalPath } = require('../utils/pathResolver');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const { resolveListPagination } = require('../utils/listPagination');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function generateInvoiceFilename(invoice, originalFilename) {
  const cleanInvoiceNo = String(invoice.invoice_no).replace(INVALID_FILENAME_CHARS, '_');
  const cleanSeller = String(invoice.seller).replace(INVALID_FILENAME_CHARS, '_').substring(0, 20);
  const cleanDate = String(invoice.invoice_date).replace(INVALID_FILENAME_CHARS, '_');
  const cleanAmount = String(invoice.invoice_amount).replace(INVALID_FILENAME_CHARS, '_');
  const ext = path.extname(originalFilename);
  return `dzfp_${cleanInvoiceNo}_${cleanSeller}_${cleanDate}_${cleanAmount}${ext}`;
}

function hasCompleteRenameFields(fields) {
  if (!fields) return false;
  const invoiceNo = String(fields.invoice_no ?? '').trim();
  if (!invoiceNo || invoiceNo.startsWith('TEMP_')) return false;
  if (!String(fields.seller ?? '').trim()) return false;
  if (!fields.invoice_date) return false;
  const amount = fields.invoice_amount;
  return amount !== null && amount !== undefined && String(amount).trim() !== '';
}

function resolveInvoiceForRename(invoiceOverride, dbInvoice) {
  const hasOverride = invoiceOverride && Object.keys(invoiceOverride).length > 0;

  if (hasOverride) {
    if (!hasCompleteRenameFields(invoiceOverride)) {
      throw new ApiError(
        400,
        '发票信息不完整，请填写发票号码、销售方、开票日期和金额后再重命名',
        ERROR_CODES.VALIDATION_ERROR,
      );
    }
    return {
      invoice_no: String(invoiceOverride.invoice_no).trim(),
      seller: String(invoiceOverride.seller).trim(),
      invoice_date: invoiceOverride.invoice_date,
      invoice_amount: invoiceOverride.invoice_amount,
    };
  }

  if (!dbInvoice) {
    throw new ApiError(404, '关联发票不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }
  if (!dbInvoice.invoice_no || String(dbInvoice.invoice_no).startsWith('TEMP_')) {
    throw new ApiError(400, '请先填写真实发票号后再重命名', ERROR_CODES.VALIDATION_ERROR);
  }
  return dbInvoice;
}

const fileInclude = [
  {
    model: MainContract,
    as: 'mainContract',
    attributes: ['id', 'contract_name'],
    required: false,
  },
  {
    model: SubContract,
    as: 'subContract',
    attributes: ['id', 'contract_name'],
    required: false,
  },
  {
    model: User,
    as: 'uploader',
    attributes: ['id', 'username', 'full_name'],
    required: false,
  },
];

async function findAll(query) {
  const {
    file_module,
    search,
    main_contract_id,
    sub_contract_id,
    record_id,
  } = query;

  const whereClause = {};
  if (file_module) whereClause.file_module = file_module;
  if (main_contract_id) whereClause.main_contract_id = parseInt(main_contract_id);
  if (sub_contract_id) whereClause.sub_contract_id = parseInt(sub_contract_id);
  if (record_id) whereClause.record_id = parseInt(record_id);
  if (search) {
    whereClause.original_filename = { [Op.like]: `%${search}%` };
  }

  const { pageSize, offset, page } = resolveListPagination(query);

  const { count, rows } = await File.findAndCountAll({
    where: whereClause,
    include: fileInclude,
    offset,
    limit: pageSize,
    order: [['uploaded_at', 'DESC']],
  });

  return {
    data: rows,
    total: count,
    current: page,
    pageSize,
  };
}

async function uploadDirect({ file, body, userId }) {
  if (!file) {
    throw new ApiError(400, '请上传文件', ERROR_CODES.VALIDATION_ERROR);
  }

  const { file_module, record_id, main_contract_id, sub_contract_id } = body;

  if (!file_module) {
    throw new ApiError(400, '缺少file_module参数', ERROR_CODES.VALIDATION_ERROR);
  }
  if (!main_contract_id) {
    throw new ApiError(400, '缺少main_contract_id参数', ERROR_CODES.VALIDATION_ERROR);
  }

  const mainContract = await MainContract.findByPk(main_contract_id);
  if (!mainContract) {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw new ApiError(404, '总包合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const moduleConfig = FILE_MODULE_MAP[file_module];
  if (moduleConfig?.type === 'SUB') {
    if (!sub_contract_id) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new ApiError(400, '缺少sub_contract_id参数', ERROR_CODES.VALIDATION_ERROR);
    }

    const subContract = await SubContract.findByPk(sub_contract_id);
    if (!subContract) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new ApiError(404, '分包合同不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
    }

    if (Number(subContract.main_contract_id) !== Number(main_contract_id)) {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new ApiError(400, '分包合同与总包合同不匹配', ERROR_CODES.VALIDATION_ERROR);
    }
  }

  const originalFilename = Buffer.from(file.originalname, 'latin1').toString('utf8');
  let storedFilename = sanitizeFilename(originalFilename);

  const { fullDir, mainDir, subDir } = generateStorageDirectories(
    main_contract_id,
    sub_contract_id,
    file_module,
  );

  ensureDir(fullDir);

  const ext = path.extname(storedFilename);
  const basename = path.basename(storedFilename, ext);
  const checkFullPath = path.join(fullDir, storedFilename);
  if (fs.existsSync(checkFullPath)) {
    storedFilename = `${basename}_${Date.now()}${ext}`;
  }

  const finalFullPath = path.join(fullDir, storedFilename);
  fs.renameSync(file.path, finalFullPath);

  const dbPath = `/uploads/${mainDir}/${subDir}/${storedFilename}`;

  try {
    return await File.create({
      file_module,
      record_id: record_id || null,
      main_contract_id: main_contract_id || null,
      sub_contract_id: sub_contract_id || null,
      original_filename: storedFilename,
      file_size: file.size,
      file_type: file.mimetype,
      file_path: dbPath,
      uploaded_at: new Date(),
      uploaded_by: userId,
      created_by: userId,
    });
  } catch (dbError) {
    if (fs.existsSync(finalFullPath)) {
      fs.unlinkSync(finalFullPath);
    }
    throw dbError;
  }
}

async function remove(id) {
  const fileRecord = await File.findByPk(id);
  if (!fileRecord) {
    throw new ApiError(404, '文件记录不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const filePath = fileRecord.file_path;
  await fileRecord.destroy();

  if (filePath) {
    const fullPath = resolvePhysicalPath(filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}

async function renameInvoiceFile(id, userId, invoiceOverride = null) {
  const fileRecord = await File.findByPk(id);
  if (!fileRecord) {
    throw new ApiError(404, '文件记录不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  if (fileRecord.file_module !== 'FB_INVOICE' && fileRecord.file_module !== 'ZB_INVOICE') {
    throw new ApiError(400, '仅发票模块支持结构化重命名');
  }

  const hasOverride = invoiceOverride && Object.keys(invoiceOverride).length > 0;
  if (!fileRecord.record_id && !hasOverride) {
    throw new ApiError(400, '文件未关联发票记录，无法重命名');
  }

  const model = fileRecord.file_module === 'FB_INVOICE' ? InvoiceIn : InvoiceOut;
  const dbInvoice = fileRecord.record_id ? await model.findByPk(fileRecord.record_id) : null;
  const invoice = resolveInvoiceForRename(invoiceOverride, dbInvoice);

  const newFilename = generateInvoiceFilename(invoice, fileRecord.original_filename);
  if (newFilename === fileRecord.original_filename) {
    return { fileRecord, message: '文件名已是最新，无需重命名' };
  }

  const oldPhysicalPath = resolvePhysicalPath(fileRecord.file_path);
  const newPhysicalPath = path.join(path.dirname(oldPhysicalPath), newFilename);

  if (fs.existsSync(newPhysicalPath)) {
    throw new ApiError(409, '目标文件名已存在，无法重命名');
  }

  fs.renameSync(oldPhysicalPath, newPhysicalPath);

  const newDbPath = fileRecord.file_path.replace(path.basename(fileRecord.file_path), newFilename);
  fileRecord.file_path = newDbPath;
  fileRecord.original_filename = newFilename;
  fileRecord.updated_by = userId;
  await fileRecord.save();

  return { fileRecord, message: '文件重命名成功' };
}

function getModuleConfigs() {
  return Object.entries(FILE_MODULE_MAP).map(([file_module, config]) => ({
    file_module,
    entity_type: config.type,
    dir_suffix: config.suffix,
    description: config.desc,
  }));
}

module.exports = {
  findAll,
  uploadDirect,
  remove,
  renameInvoiceFile,
  getModuleConfigs,
};
