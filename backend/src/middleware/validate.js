const Joi = require('joi');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');

/**
 * 验证中间件生成器
 * @param {Object} schema - Joi 验证 schema
 * @returns {Function} Express 中间件
 */
const validate = (schema) => (req, res, next) => {
  const validSchema = {};
  ['params', 'query', 'body'].forEach((key) => {
    if (schema[key]) {
      validSchema[key] = req[key];
    }
  });

  const { value, error } = Joi.compile(schema)
    .prefs({ errors: { label: 'key' }, abortEarly: false, convert: true })
    .validate(validSchema);

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new ApiError(400, errorMessage, ERROR_CODES.VALIDATION_ERROR));
  }

  // Express 5 中 req.query 为只读 getter，需 defineProperty 覆盖；params/body 可原地合并
  if (value.params) {
    Object.assign(req.params, value.params);
  }
  if (value.query) {
    Object.defineProperty(req, 'query', {
      value: { ...req.query, ...value.query },
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  if (value.body) {
    Object.assign(req.body, value.body);
  }
  return next();
};

module.exports = validate;
