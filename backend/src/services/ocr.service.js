const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const { PROJECT_ROOT, resolvePhysicalPath } = require('../utils/pathResolver');
const { getOcrCredentials } = require('./systemSettings.service');

/**
 * 百度OCR服务
 * 提供增值税发票识别等OCR功能
 */

const UPLOADS_ROOT = path.resolve(PROJECT_ROOT, 'uploads');
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args) => {
  if (isDev) console.log(...args);
};

function assertPathUnderUploads(absolutePath) {
  const resolved = path.resolve(absolutePath);
  const relative = path.relative(UPLOADS_ROOT, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ApiError(400, '非法的文件路径', ERROR_CODES.VALIDATION_ERROR);
  }

  return resolved;
}

/**
 * 解析 OCR 请求中的文件路径并校验（仅允许 uploads 目录下的 PDF）
 * @param {string} filePath - 相对 uploads 的路径，或 /uploads/... 形式
 * @returns {string} 绝对路径
 */
function resolveOcrPdfPath(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/').trim();
  let absolutePath;

  if (normalized.startsWith('/uploads/') || normalized.startsWith('uploads/')) {
    const dbStyle = normalized.startsWith('/') ? normalized : `/${normalized}`;
    absolutePath = resolvePhysicalPath(dbStyle);
  } else {
    absolutePath = path.resolve(UPLOADS_ROOT, normalized);
  }

  absolutePath = assertPathUnderUploads(absolutePath);

  if (!fs.existsSync(absolutePath)) {
    throw new ApiError(404, '文件不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  if (!absolutePath.toLowerCase().endsWith('.pdf')) {
    throw new ApiError(400, '只支持PDF格式的发票', ERROR_CODES.VALIDATION_ERROR);
  }

  return absolutePath;
}

/**
 * 读取 uploads 中已有 PDF 并识别增值税发票
 * @param {string} filePath
 * @returns {Promise<Object>} 解析后的发票字段
 */
async function recognizeInvoiceFromPath(filePath) {
  const absolutePath = resolveOcrPdfPath(filePath);
  const pdfBuffer = await fs.promises.readFile(absolutePath);
  const ocrResult = await recognizeVatInvoice(pdfBuffer);
  return parseVatInvoiceResult(ocrResult);
}

// access_token缓存
let tokenCache = {
  token: null,
  expiresAt: 0,
  apiKey: null,
  secretKey: null,
};

/**
 * 获取百度API access_token（带缓存）
 * @returns {Promise<string>} access_token
 */
async function getAccessToken() {
  const { apiKey, secretKey } = await getOcrCredentials();

  if (tokenCache.apiKey !== apiKey || tokenCache.secretKey !== secretKey) {
    tokenCache = {
      token: null,
      expiresAt: 0,
      apiKey,
      secretKey,
    };
  }

  // 检查缓存是否有效（提前5分钟刷新）
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    devLog('使用缓存的access_token');
    return tokenCache.token;
  }

  devLog('正在获取新的百度API access_token...');
  try {
    const response = await axios.get(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
    );

    const { access_token, expires_in } = response.data;
    
    if (!access_token) {
      throw new Error('获取access_token失败：响应中没有token');
    }

    // 缓存token（expires_in单位为秒）
    tokenCache = {
      token: access_token,
      expiresAt: now + (expires_in || 2592000) * 1000, // 默认30天
      apiKey,
      secretKey,
    };

    devLog('access_token获取成功，有效期:', expires_in, '秒');
    return access_token;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('获取百度API access_token失败:', error.message);
    throw new Error('获取百度API授权失败: ' + error.message);
  }
}

/**
 * 识别增值税发票（PDF格式）
 * @param {Buffer} pdfBuffer PDF文件Buffer
 * @returns {Promise<Object>} OCR识别结果
 */
async function recognizeVatInvoice(pdfBuffer) {
  try {
    // 转为Base64
    const base64Pdf = pdfBuffer.toString('base64');

    // 获取access_token
    const access_token = await getAccessToken();

    devLog('正在调用百度OCR增值税发票识别API...');

    // 调用百度OCR API
    const formData = new URLSearchParams();
    formData.append('pdf_file', base64Pdf);

    const response = await axios.post(
      `https://aip.baidubce.com/rest/2.0/ocr/v1/vat_invoice?access_token=${access_token}`,
      formData,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 30000 // 30秒超时
      }
    );

    const ocrResult = response.data;

    // 检查是否识别成功
    if (!ocrResult || ocrResult.error_code) {
      throw new Error(ocrResult.error_msg || 'OCR识别失败');
    }

    if (!ocrResult.words_result) {
      throw new Error('未能识别发票内容，请检查PDF是否为电子发票');
    }

    devLog('OCR识别成功');
    return ocrResult;
  } catch (error) {
    console.error('百度OCR识别失败:', error.message);
    throw error;
  }
}

/**
 * 处理开票日期格式转换
 * @param {string} dateStr 原始日期字符串，如 "2024年12月26日"
 * @returns {string} 格式化后的日期，如 "2024-12-26"
 */
function formatInvoiceDate(dateStr) {
  if (!dateStr) return '';
  
  const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return dateStr; // 如果格式不匹配，保持原值
}

/**
 * 处理税率提取（去掉百分号）
 * @param {Array} commodityTaxRateArray 税率数组
 * @returns {number|null} 税率数字
 */
function extractTaxRate(commodityTaxRateArray) {
  if (!Array.isArray(commodityTaxRateArray) || commodityTaxRateArray.length === 0) {
    return null;
  }

  const firstTaxRate = commodityTaxRateArray[0];
  if (!firstTaxRate || !firstTaxRate.word) {
    return null;
  }

  const taxRateStr = String(firstTaxRate.word);
  
  // 去掉百分号并转换为数字，支持 "1%"、"13%" 等格式
  const percentMatch = taxRateStr.match(/(\d+(?:\.\d+)?)%?/);
  if (percentMatch) {
    return Math.round(parseFloat(percentMatch[1]));
  }

  return null;
}

/**
 * 解析增值税发票识别结果
 * @param {Object} ocrResult 百度OCR原始结果
 * @returns {Object} 解析后的发票数据
 */
function parseVatInvoiceResult(ocrResult) {
  const words_result = ocrResult.words_result;

  devLog('========== 识别到的原始字段 ==========');
  devLog('InvoiceNum:', words_result.InvoiceNum);
  devLog('InvoiceDate:', words_result.InvoiceDate);
  devLog('PurchaserName:', words_result.PurchaserName);
  devLog('SellerName:', words_result.SellerName);
  devLog('AmountInFiguers:', words_result.AmountInFiguers);
  devLog('CommodityTaxRate:', JSON.stringify(words_result.CommodityTaxRate, null, 2));
  devLog('Remarks:', words_result.Remarks);
  devLog('=========================================');

  // 处理日期格式转换
  const formattedDate = formatInvoiceDate(words_result.InvoiceDate);
  devLog('日期格式转换:', words_result.InvoiceDate, '->', formattedDate);

  // 处理税率
  const taxRate = extractTaxRate(words_result.CommodityTaxRate);
  devLog('提取的税率:', taxRate);

  // 提取关键字段
  const invoiceData = {
    invoice_no: words_result.InvoiceNum || '',
    invoice_date: formattedDate,
    buyer: words_result.PurchaserName || '',
    seller: words_result.SellerName || '',
    invoice_amount: words_result.AmountInFiguers || '',
    tax_rate: taxRate,
    remarks: words_result.Remarks || '',
  };

  devLog('========== 提取并格式化后的字段 ==========');
  devLog('invoice_no:', invoiceData.invoice_no);
  devLog('invoice_date:', invoiceData.invoice_date);
  devLog('buyer:', invoiceData.buyer);
  devLog('seller:', invoiceData.seller);
  devLog('invoice_amount:', invoiceData.invoice_amount);
  devLog('tax_rate:', invoiceData.tax_rate);
  devLog('remarks:', invoiceData.remarks);
  devLog('==========================================');

  return invoiceData;
}

module.exports = {
  recognizeInvoiceFromPath,
};
