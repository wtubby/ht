const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const mainContractValidation = require('../validations/mainContract');
const controller = require('../controllers/mainContract.controller');
const router = require('express').Router();

router.use(verifyToken);

router.post('/', validate(mainContractValidation.create), controller.create);
router.get('/', validate(mainContractValidation.list), controller.findAll);
router.get('/select-options', controller.getSelectOptions);
router.get('/:id/related', validate(mainContractValidation.findOne), controller.findRelated);
router.get('/:id', validate(mainContractValidation.findOne), controller.findOne);
router.put('/:id', validate(mainContractValidation.update), controller.update);
router.delete('/:id', validate(mainContractValidation.remove), controller.remove);

module.exports = router;
