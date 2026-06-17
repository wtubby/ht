const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const receiveValidation = require('../validations/receive');
const controller = require('../controllers/receive.controller');
const router = require('express').Router();

router.use(verifyToken);

router.post('/', validate(receiveValidation.create), controller.create);
router.get('/', validate(receiveValidation.list), controller.findAll);
router.get('/select-options', controller.getSelectOptions);
router.get('/:id', validate(receiveValidation.findOne), controller.findOne);
router.put('/:id', validate(receiveValidation.update), controller.update);
router.delete('/:id', validate(receiveValidation.remove), controller.remove);

module.exports = router;
