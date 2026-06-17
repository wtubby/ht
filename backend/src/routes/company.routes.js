const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const companyValidation = require('../validations/company');
const controller = require('../controllers/company.controller');
const router = require('express').Router();

router.use(verifyToken);

router.post('/', validate(companyValidation.create), controller.create);
router.get('/', validate(companyValidation.list), controller.findAll);
router.get('/:id', validate(companyValidation.findOne), controller.findOne);
router.put('/:id', validate(companyValidation.update), controller.update);
router.delete('/:id', validate(companyValidation.remove), controller.remove);

module.exports = router;
