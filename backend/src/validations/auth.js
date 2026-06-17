const Joi = require('joi');

module.exports = {
  login: {
    body: Joi.object().keys({
      username: Joi.string().required().min(3).max(50).messages({
        'string.empty': '用户名不能为空',
        'string.min': '用户名至少3个字符',
        'string.max': '用户名最多50个字符',
      }),
      password: Joi.string().required().min(6).messages({
        'string.empty': '密码不能为空',
        'string.min': '密码至少6个字符',
      }),
      autoLogin: Joi.boolean().optional(),
      type: Joi.string().optional(),
    }),
  },

  refreshToken: {
    body: Joi.object().keys({
      refreshToken: Joi.string().trim().required().messages({
        'string.empty': 'Refresh token 不能为空',
        'any.required': 'Refresh token 不能为空',
      }),
    }),
  },

  logout: {
    body: Joi.object().keys({
      refreshToken: Joi.string().trim().optional(),
    }),
  },

  updatePassword: {
    body: Joi.object().keys({
      currentPassword: Joi.string().required().min(6).messages({
        'string.empty': '当前密码不能为空',
        'string.min': '当前密码至少6个字符',
      }),
      newPassword: Joi.string().required().min(6).max(128).invalid(Joi.ref('currentPassword')).messages({
        'string.empty': '新密码不能为空',
        'string.min': '新密码至少6个字符',
        'string.max': '新密码最多128个字符',
        'any.invalid': '新密码不能与当前密码相同',
      }),
    }),
  },
};
