const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const { systemSettingsValidation } = require('../validations');
const systemSettingsController = require('../controllers/systemSettings.controller');
const router = require('express').Router();

router.get('/public', systemSettingsController.getPublic);

router.use(verifyToken);
router.get('/', systemSettingsController.getDetail);
router.put('/', validate(systemSettingsValidation.update), systemSettingsController.update);

module.exports = router;
