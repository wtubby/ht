const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const invoiceOutValidation = require('../validations/invoiceOut');
const controller = require('../controllers/invoiceOut.controller');
const router = require('express').Router();

router.use(verifyToken);

router.get('/', validate(invoiceOutValidation.list), controller.findAll);
router.get('/select-options', controller.getSelectOptions);
router.get('/:id', validate(invoiceOutValidation.findOne), controller.findOne);
router.post('/', validate(invoiceOutValidation.create), controller.create);
router.put('/:id', validate(invoiceOutValidation.update), controller.update);
router.delete('/:id', validate(invoiceOutValidation.remove), controller.remove);

module.exports = router;
