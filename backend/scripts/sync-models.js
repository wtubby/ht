// 安全的数据库模型同步脚本
// 仅在开发环境中使用，生产环境中应使用迁移脚本

require('dotenv').config({ path: '../.env' });
const db = require('../src/models');

async function syncModels() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // 使用 alter 选项安全地更新表结构
    // 这会尝试修改现有表结构以匹配模型定义，而不会删除数据
    await db.sequelize.sync({ alter: true });
    console.log("All models were synchronized successfully.");
  } catch (error) {
    console.error('Unable to sync models:', error);
  } finally {
    // 关闭数据库连接
    await db.sequelize.close();
  }
}

// 只有直接运行此脚本时才执行同步
if (require.main === module) {
  syncModels();
}

module.exports = syncModels;