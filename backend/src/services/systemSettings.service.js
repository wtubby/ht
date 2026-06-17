const db = require('../models');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');

const { SystemSettings } = db;

async function getSettingsRow() {
  const settings = await SystemSettings.findByPk(1);
  if (!settings) {
    throw new ApiError(500, '系统设置未初始化', ERROR_CODES.INTERNAL_ERROR);
  }
  return settings;
}

async function getPublicSettings() {
  const settings = await getSettingsRow();
  return {
    system_name: settings.system_name,
    system_logo: settings.system_logo,
    ocr_enabled: Boolean(settings.ocr_enabled),
  };
}

async function getSystemSettings() {
  const settings = await getSettingsRow();
  return settings;
}

async function updateSystemSettings(payload, userId) {
  const settings = await getSettingsRow();

  await settings.update({
    ...payload,
    updated_by: userId || null,
  });

  return settings;
}

async function getOcrCredentials() {
  const settings = await getSettingsRow();

  if (!settings.ocr_enabled) {
    throw new ApiError(400, 'OCR功能已关闭', ERROR_CODES.VALIDATION_ERROR);
  }
  if (!settings.baidu_ocr_api_key || !settings.baidu_ocr_secret_key) {
    throw new ApiError(400, 'OCR密钥未配置', ERROR_CODES.VALIDATION_ERROR);
  }

  return {
    apiKey: settings.baidu_ocr_api_key,
    secretKey: settings.baidu_ocr_secret_key,
  };
}

module.exports = {
  getPublicSettings,
  getSystemSettings,
  updateSystemSettings,
  getOcrCredentials,
};
