const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const ocrValidation = require('../validations/ocr');
const ocrController = require('../controllers/ocr.controller');
const router = require('express').Router();

router.use(verifyToken);

router.post('/', validate(ocrValidation.recognize), ocrController.recognize);

module.exports = router;
