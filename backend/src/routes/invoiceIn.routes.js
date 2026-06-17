const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const invoiceInValidation = require('../validations/invoiceIn');
const controller = require('../controllers/invoiceIn.controller');
const router = require('express').Router();

router.use(verifyToken);

router.get('/', validate(invoiceInValidation.list), controller.findAll);
router.get('/select-options', controller.getSelectOptions);
router.get('/:id', validate(invoiceInValidation.findOne), controller.findOne);
router.post('/', validate(invoiceInValidation.create), controller.create);
router.put('/:id', validate(invoiceInValidation.update), controller.update);
router.delete('/:id', validate(invoiceInValidation.remove), controller.remove);

module.exports = router;
