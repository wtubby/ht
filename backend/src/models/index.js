const sequelize = require('../config/database');
const User = require('./user.model');
const Company = require('./company.model');
const BankAccount = require('./bankAccount.model');
const MainContract = require('./mainContract.model');
const SubContract = require('./subContract.model');
const Payment = require('./payment.model');
const Receive = require('./receive.model');
const InvoiceIn = require('./invoiceIn.model');
const InvoiceOut = require('./invoiceOut.model');
const File = require('./file.model');
const Bond = require('./bond.model');
const SystemSettings = require('./systemSettings.model');

const db = {};

db.Sequelize = sequelize.Sequelize;
db.sequelize = sequelize;

db.User = User;
db.Company = Company;
db.CompanyBankAccount = BankAccount;
db.MainContract = MainContract;
db.SubContract = SubContract;
db.Payment = Payment;
db.Receive = Receive;
db.InvoiceIn = InvoiceIn;
db.InvoiceOut = InvoiceOut;
db.File = File;
db.Bond = Bond;
db.SystemSettings = SystemSettings;

// Define relationships
// Company relationships
db.Company.hasMany(db.CompanyBankAccount, { as: 'bankAccounts', foreignKey: 'company_id' });
db.CompanyBankAccount.belongsTo(db.Company, { as: 'company', foreignKey: 'company_id' });

// Main Contract relationships
db.MainContract.belongsTo(db.Company, { as: 'partyA', foreignKey: 'party_a_id' });
db.MainContract.belongsTo(db.Company, { as: 'partyB', foreignKey: 'party_b_id' });
db.MainContract.hasMany(db.SubContract, { as: 'subContracts', foreignKey: 'main_contract_id' });
db.MainContract.hasMany(db.Receive, { as: 'receives', foreignKey: 'main_contract_id' });
db.MainContract.hasMany(db.InvoiceOut, { as: 'invoicesOut', foreignKey: 'main_contract_id' });

// Sub Contract relationships
db.SubContract.belongsTo(db.MainContract, { as: 'mainContract', foreignKey: 'main_contract_id' });
db.SubContract.belongsTo(db.Company, { as: 'partyB', foreignKey: 'party_b_id' });
db.SubContract.belongsTo(db.Company, { as: 'partyC', foreignKey: 'party_c_id' });
db.SubContract.hasMany(db.Payment, { as: 'payments', foreignKey: 'sub_contract_id' });
db.SubContract.hasMany(db.InvoiceIn, { as: 'invoicesIn', foreignKey: 'sub_contract_id' });
db.SubContract.hasMany(db.Bond, { as: 'bonds', foreignKey: 'sub_contract_id' });

// Payment relationships
db.Payment.belongsTo(db.SubContract, { as: 'subContract', foreignKey: 'sub_contract_id' });
db.Payment.belongsTo(db.MainContract, { as: 'mainContract', foreignKey: 'main_contract_id' });

// Receive relationships
db.Receive.belongsTo(db.MainContract, { as: 'mainContract', foreignKey: 'main_contract_id' });

// Bond relationships
db.Bond.belongsTo(db.SubContract, { as: 'subContract', foreignKey: 'sub_contract_id' });
db.Bond.hasMany(db.File, { as: 'files', foreignKey: 'record_id', scope: { file_module: 'FB_BOND' } });

// Invoice relationships
db.InvoiceIn.belongsTo(db.SubContract, { as: 'subContract', foreignKey: 'sub_contract_id' });
db.InvoiceOut.belongsTo(db.MainContract, { as: 'mainContract', foreignKey: 'main_contract_id' });

// User relationships for audit fields
db.User.hasMany(db.Company, { as: 'createdCompanies', foreignKey: 'created_by' });
db.Company.belongsTo(db.User, { as: 'creator', foreignKey: 'created_by' });
db.User.hasMany(db.CompanyBankAccount, { as: 'createdBankAccounts', foreignKey: 'created_by' });
db.CompanyBankAccount.belongsTo(db.User, { as: 'creator', foreignKey: 'created_by' });
db.User.hasMany(db.MainContract, { as: 'createdMainContracts', foreignKey: 'created_by' });
db.MainContract.belongsTo(db.User, { as: 'creator', foreignKey: 'created_by' });
db.User.hasMany(db.SubContract, { as: 'createdSubContracts', foreignKey: 'created_by' });
db.SubContract.belongsTo(db.User, { as: 'creator', foreignKey: 'created_by' });
db.User.hasMany(db.Payment, { as: 'createdPayments', foreignKey: 'created_by' });
db.Payment.belongsTo(db.User, { as: 'creator', foreignKey: 'created_by' });
db.User.hasMany(db.Receive, { as: 'createdReceives', foreignKey: 'created_by' });
db.Receive.belongsTo(db.User, { as: 'creator', foreignKey: 'created_by' });
db.User.hasMany(db.InvoiceIn, { as: 'createdInvoicesIn', foreignKey: 'created_by' });
db.InvoiceIn.belongsTo(db.User, { as: 'creator', foreignKey: 'created_by' });
db.User.hasMany(db.InvoiceOut, { as: 'createdInvoicesOut', foreignKey: 'created_by' });
db.InvoiceOut.belongsTo(db.User, { as: 'creator', foreignKey: 'created_by' });
db.User.hasMany(db.Bond, { as: 'createdBonds', foreignKey: 'created_by' });
db.Bond.belongsTo(db.User, { as: 'creator', foreignKey: 'created_by' });

// File relationships
db.File.belongsTo(db.MainContract, { as: 'mainContract', foreignKey: 'main_contract_id' });
db.File.belongsTo(db.SubContract, { as: 'subContract', foreignKey: 'sub_contract_id' });
db.File.belongsTo(db.User, { as: 'uploader', foreignKey: 'uploaded_by' });
db.File.belongsTo(db.User, { as: 'creator', foreignKey: 'created_by' });
db.MainContract.hasMany(db.File, { as: 'files', foreignKey: 'main_contract_id' });
db.SubContract.hasMany(db.File, { as: 'files', foreignKey: 'sub_contract_id' });

module.exports = db;
