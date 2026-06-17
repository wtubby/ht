const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const app = require('./app');
const db = require('./models');
const PORT = process.env.API_PORT || 3001;

// 先测试数据库连接
db.sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}.`);
    });
  })
  .catch(error => {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  });

// 全局未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // 给予进程优雅退出的时间
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});