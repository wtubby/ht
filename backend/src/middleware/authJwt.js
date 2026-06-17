const jwt = require('jsonwebtoken');
const db = require('../models');
const ApiError = require('../utils/ApiError');
const ERROR_CODES = require('../utils/errorCodes');
const User = db.User;

const verifyToken = async (req, res, next) => {
  try {
    let token = req.headers['authorization'];

    if (!token) {
      throw new ApiError(403, 'No token provided!', ERROR_CODES.TOKEN_MISSING);
    }

    // The token is expected to be in the format 'Bearer <token>'
    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 检查用户是否存在且状态正常
    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new ApiError(401, 'User not found', ERROR_CODES.UNAUTHORIZED);
    }
    
    if (user.user_status !== '正常') {
      throw new ApiError(403, 'User account is disabled', ERROR_CODES.FORBIDDEN);
    }

    if (decoded.token_version !== user.token_version) {
      throw new ApiError(401, 'Token has been revoked', ERROR_CODES.TOKEN_INVALID);
    }

    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token expired!', ERROR_CODES.TOKEN_EXPIRED));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid token!', ERROR_CODES.TOKEN_INVALID));
    }
    next(err);
  }
};

/**
 * 可选的 Token 验证（不强制要求）
 */
const optionalToken = async (req, res, next) => {
  try {
    let token = req.headers['authorization'];
    
    if (!token) {
      return next();
    }

    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (user && user.user_status === '正常') {
      req.userId = decoded.id;
      req.userRole = decoded.role;
      req.user = user;
    }
    
    next();
  } catch (err) {
    // 可选验证失败不阻塞请求
    next();
  }
};

const authJwt = {
  verifyToken,
  optionalToken,
};

module.exports = authJwt; 