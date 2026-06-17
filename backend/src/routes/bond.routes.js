const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const bondValidation = require('../validations/bond');
const controller = require('../controllers/bond.controller');
const router = require('express').Router();

router.use(verifyToken);

router.get('/select-options', validate(bondValidation.selectOptions), controller.getSelectOptions);
router.post('/', validate(bondValidation.create), controller.create);
router.get('/', validate(bondValidation.list), controller.findAll);
router.post('/:id/refund', validate(bondValidation.refund), controller.refund);
router.get('/:id', validate(bondValidation.findOne), controller.findOne);
router.put('/:id', validate(bondValidation.update), controller.update);
router.delete('/:id', validate(bondValidation.remove), controller.remove);

module.exports = router;
