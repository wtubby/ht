const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const paymentValidation = require('../validations/payment');
const controller = require('../controllers/payment.controller');
const router = require('express').Router();

router.use(verifyToken);

router.post('/', validate(paymentValidation.create), controller.create);
router.get('/', validate(paymentValidation.list), controller.findAll);
router.get('/select-options', controller.getSelectOptions);
router.get('/:id', validate(paymentValidation.findOne), controller.findOne);
router.put('/:id', validate(paymentValidation.update), controller.update);
router.delete('/:id', validate(paymentValidation.remove), controller.remove);

module.exports = router;
