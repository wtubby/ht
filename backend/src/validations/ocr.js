const Joi = require('joi');

module.exports = {
  recognize: {
    body: Joi.object().keys({
      filePath: Joi.string().trim().min(1).required().messages({
        'string.empty': '请提供文件路径',
        'any.required': '请提供文件路径',
      }),
    }),
  },
};
