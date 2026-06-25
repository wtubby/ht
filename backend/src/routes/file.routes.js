const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fileController = require('../controllers/file.controller');
const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const fileValidation = require('../validations/file');
const { sanitizeFilename } = require('../utils/pathGenerator');
const { createMulterFileFilter } = require('../utils/fileUploadPolicy');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 临时目录以 . 开头，express.static 默认不对外暴露
    const tempDir = path.join(__dirname, '../../../uploads/.tmp');
    fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
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
  fileFilter: createMulterFileFilter(),
});

const router = express.Router();

router.use(verifyToken);

router.get('/', validate(fileValidation.list), fileController.findAll);
router.get('/config/modules', fileController.getModuleConfigs);
router.post('/upload-direct', upload.single('file'), validate(fileValidation.uploadDirect), fileController.uploadDirect);
router.delete('/:id', validate(fileValidation.remove), fileController.remove);
router.post('/:id/rename', validate(fileValidation.rename), fileController.rename);

module.exports = router;
