const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');

const { User } = db;

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.user_role, token_version: user.token_version },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, token_version: user.token_version },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
  );
}

/**
 * 用户登录
 */
async function login({ username, password }) {
  const user = await User.findOne({ where: { username } });

  if (!user) {
    throw new ApiError(404, '用户不存在', ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (user.user_status !== '正常') {
    throw new ApiError(403, '用户账户已被禁用', ERROR_CODES.FORBIDDEN);
  }

  const passwordIsValid = await bcrypt.compare(password, user.password);
  if (!passwordIsValid) {
    throw new ApiError(401, '密码错误', ERROR_CODES.INVALID_CREDENTIALS);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await user.update({
    last_login_at: new Date(),
  });

  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    user_role: user.user_role,
    accessToken,
    refreshToken,
  };
}

/**
 * 刷新 Access Token
 */
async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token 不能为空', ERROR_CODES.TOKEN_MISSING);
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new ApiError(404, '用户不存在', ERROR_CODES.UNAUTHORIZED);
    }

    if (user.user_status !== '正常') {
      throw new ApiError(403, '用户账户已被禁用', ERROR_CODES.FORBIDDEN);
    }

    if (decoded.token_version !== user.token_version) {
      throw new ApiError(401, 'Refresh token 已失效，请重新登录', ERROR_CODES.TOKEN_INVALID);
    }

    return {
      accessToken: generateAccessToken(user),
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Refresh token 已过期，请重新登录', ERROR_CODES.TOKEN_EXPIRED);
    }
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Refresh token 无效', ERROR_CODES.TOKEN_INVALID);
    }
    throw error;
  }
}

/**
 * 退出登录（使已签发的 token 失效）
 */
async function logout({ userId, refreshToken } = {}) {
  if (userId) {
    await User.increment('token_version', { where: { id: userId } });
    return;
  }

  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      await User.increment('token_version', { where: { id: decoded.id } });
    } catch {
      // 退出时忽略无效的 refresh token
    }
  }
}

/**
 * 获取当前登录用户
 */
async function getCurrentUser(userId) {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['password'] },
  });

  if (!user) {
    throw new ApiError(404, '用户不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  return user;
}

/**
 * 修改密码
 */
async function updatePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new ApiError(404, '用户不存在', ERROR_CODES.RESOURCE_NOT_FOUND);
  }

  const passwordIsValid = await bcrypt.compare(currentPassword, user.password);
  if (!passwordIsValid) {
    throw new ApiError(401, '当前密码不正确', ERROR_CODES.INVALID_CREDENTIALS);
  }

  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  await user.update({
    password: hashedNewPassword,
    token_version: user.token_version + 1,
  });
}

module.exports = {
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
  updatePassword,
};
