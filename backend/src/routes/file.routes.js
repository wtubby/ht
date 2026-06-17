const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fileController = require('../controllers/file.controller');
const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const fileValidation = require('../validations/file');
const { sanitizeFilename } = require('../utils/pathGenerator');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadRoot = path.join(__dirname, '../../../uploads');
    fs.mkdirSync(uploadRoot, { recursive: true });
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const sanitized = sanitizeFilename(originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `upload-${uniqueSuffix}-${sanitized}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

const router = express.Router();

router.use(verifyToken);

router.get('/', validate(fileValidation.list), fileController.findAll);
router.get('/config/modules', fileController.getModuleConfigs);
router.post('/upload-direct', upload.single('file'), validate(fileValidation.uploadDirect), fileController.uploadDirect);
router.delete('/:id', validate(fileValidation.remove), fileController.remove);
router.post('/:id/rename', validate(fileValidation.rename), fileController.rename);

module.exports = router;
