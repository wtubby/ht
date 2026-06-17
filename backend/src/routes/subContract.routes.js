const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const subContractValidation = require('../validations/subContract');
const controller = require('../controllers/subContract.controller');
const router = require('express').Router();

router.use(verifyToken);

router.post('/', validate(subContractValidation.create), controller.create);
router.get('/', validate(subContractValidation.list), controller.findAll);
router.get('/select-options', controller.getSelectOptions);
router.get('/:id', validate(subContractValidation.findOne), controller.findOne);
router.put('/:id', validate(subContractValidation.update), controller.update);
router.delete('/:id', validate(subContractValidation.remove), controller.remove);

module.exports = router;
