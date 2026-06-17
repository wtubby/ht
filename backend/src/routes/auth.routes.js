const { verifyToken, optionalToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const { authValidation } = require('../validations');
const authController = require('../controllers/auth.controller');
const userController = require('../controllers/user.controller');
const router = require('express').Router();

// Public routes
router.post('/login', validate(authValidation.login), authController.login);
router.post('/refresh-token', validate(authValidation.refreshToken), authController.refreshToken);

// Protected routes
router.get('/currentUser', [verifyToken], userController.getCurrentUser);
router.post('/updatePassword', [verifyToken, validate(authValidation.updatePassword)], userController.updatePassword);
router.post('/logout', [optionalToken, validate(authValidation.logout)], authController.logout);

module.exports = router;
