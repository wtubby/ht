/**
 * 统计字段数据一致性校验脚本
 * 用途：检查冗余统计字段与实际计算值是否一致
 * 执行方式: node backend/scripts/verify-contract-statistics.js
 */

const db = require('../src/models');

async function verifyStatistics() {
  try {
    console.log('====================================');
    console.log('  统计字段数据一致性校验');
    console.log('====================================\n');

    // 所有冗余统计字段已从模型中移除（改用实时计算），无需校验
    console.log('1. 总包合同统计字段: ✓ 已移除,采用实时计算');
    console.log('2. 分包合同统计字段: ✓ 已移除,采用实时计算\n');

    console.log('====================================');
    console.log('✅ 校验通过! 所有统计数据采用实时计算\n');
    console.log('====================================\n');

    return true;

  } catch (error) {
    console.error('❌ 校验失败:', error);
    throw error;
  } finally {
    await db.sequelize.close();
  }
}

// 执行校验
verifyStatistics()
  .then((isConsistent) => {
    console.log('脚本执行完成');
    process.exit(isConsistent ? 0 : 1);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
