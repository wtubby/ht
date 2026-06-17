const ApiError = require('./ApiError');
const ERROR_CODES = require('./errorCodes');

const UNIQUE_FIELD_MESSAGES = {
  uk_company_name_type: '相同类型的单位名称已存在',
  company_name: '相同类型的单位名称已存在',
  uk_credit_code: '统一社会信用代码已存在',
  credit_code: '统一社会信用代码已存在',
  uk_account_number: '该银行账号已存在',
  account_number: '该银行账号已存在',
  uk_invoice_out_no: '发票号码已存在',
  uk_invoice_in_no: '发票号码已存在',
};

/**
 * 将 Sequelize 唯一约束错误转为业务 ApiError
 * @param {Error} error
 * @param {{ fallbackMessage?: string, statusCode?: number }} [options]
 */
function handleUniqueConstraintError(error, { fallbackMessage, statusCode = 400 } = {}) {
  if (error.name !== 'SequelizeUniqueConstraintError') {
    throw error;
  }

  const field = error.errors?.[0]?.path;
  const message = (field && UNIQUE_FIELD_MESSAGES[field]) || fallbackMessage;

  if (message) {
    throw new ApiError(statusCode, message, ERROR_CODES.DUPLICATE_ENTRY);
  }

  throw error;
}

module.exports = {
  handleUniqueConstraintError,
};
