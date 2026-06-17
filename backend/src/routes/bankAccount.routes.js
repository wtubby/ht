const { verifyToken } = require('../middleware/authJwt');
const validate = require('../middleware/validate');
const bankAccountValidation = require('../validations/bankAccount');
const controller = require('../controllers/bankAccount.controller');

const bankAccountRouter = require('express').Router();
bankAccountRouter.use(verifyToken);
bankAccountRouter.put('/:id', validate(bankAccountValidation.update), controller.update);
bankAccountRouter.delete('/:id', validate(bankAccountValidation.remove), controller.remove);
bankAccountRouter.put('/:id/set-default', validate(bankAccountValidation.setDefault), controller.setDefault);

const companyNestedRouter = require('express').Router({ mergeParams: true });
companyNestedRouter.use(verifyToken);
companyNestedRouter.post('/', validate(bankAccountValidation.create), controller.create);
companyNestedRouter.get('/', validate(bankAccountValidation.listByCompany), controller.findAllByCompany);

module.exports = { bankAccountRouter, companyNestedRouter };
