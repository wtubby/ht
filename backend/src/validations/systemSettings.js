const Joi = require('joi');

module.exports = {
  update: {
    body: Joi.object().keys({
      system_name: Joi.string().trim().max(100),
      system_logo: Joi.string().trim().max(500).allow(null, ''),
      baidu_ocr_api_key: Joi.string().trim().max(200).allow(null, ''),
      baidu_ocr_secret_key: Joi.string().trim().max(200).allow(null, ''),
      ocr_enabled: Joi.boolean(),
    }).min(1),
  },
};
