/**
 * 文件数据一致性校验脚本
 * 用途：对比 uploads 物理文件与 files 数据表记录，查找孤儿数据
 * 检查两种孤儿场景：
 *   1. 数据库中有记录，但物理文件不存在（脏数据）
 *   2. 物理文件存在，但数据库中无记录（孤儿文件）
 * 执行方式: node backend/scripts/verify-file-integrity.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../src/models');

// uploads 目录的绝对路径（与 backend 平级）
const uploadsDir = path.join(__dirname, '../../uploads');

/**
 * 递归扫描目录，返回所有文件的相对路径列表（相对于 uploads 目录）
 */
function scanAllFiles(dir, basePath = '') {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      results.push(...scanAllFiles(fullPath, relativePath));
    } else if (entry.isFile()) {
      results.push(relativePath);
    }
  }

  return results;
}

/**
 * 将数据库的 file_path（以 /uploads/ 开头）转为相对于 uploads 目录的路径
 */
function dbPathToRelative(dbPath) {
  // dbPath 格式: /uploads/ZB1/FB1_files/filename.pdf
  // 去掉开头的 /uploads/ 得到 ZB1/FB1_files/filename.pdf
  return dbPath.replace(/^\/?uploads\//, '');
}

async function verifyFileIntegrity() {
  try {
    console.log('========================================');
    console.log('  文件存储数据一致性校验');
    console.log('========================================\n');

    // 1. 校验 uploads 目录是否存在
    if (!fs.existsSync(uploadsDir)) {
      console.error(`❌ uploads 目录不存在: ${uploadsDir}`);
      return false;
    }
    console.log(`📁 物理文件根目录: ${uploadsDir}\n`);

    // 2. 扫描所有物理文件
    console.log('正在扫描物理文件...');
    const physicalFiles = scanAllFiles(uploadsDir);
    console.log(`✅ 扫描完成，共发现 ${physicalFiles.length} 个物理文件\n`);

    // 3. 查询数据库所有文件记录
    console.log('正在查询数据库文件记录...');
    const dbFiles = await db.File.findAll({
      attributes: ['id', 'file_path', 'file_module', 'original_filename', 'record_id'],
      raw: true,
    });
    console.log(`✅ 查询完成，数据库中共 ${dbFiles.length} 条文件记录\n`);

    // 4. 建立映射关系
    // 物理文件相对路径 -> 文件信息
    const physicalFileSet = new Set(physicalFiles);
    // 数据库记录按相对路径索引（一对多，因为可能有多个记录指向同个文件路径）
    const dbFileMap = new Map();
    for (const file of dbFiles) {
      const relPath = dbPathToRelative(file.file_path);
      if (!dbFileMap.has(relPath)) {
        dbFileMap.set(relPath, []);
      }
      dbFileMap.get(relPath).push(file);
    }

    let totalIssues = 0;
    const orphanRecords = [];  // 数据库有记录但文件不存在
    const orphanFiles = [];    // 文件存在但数据库无记录

    // === 场景1：数据库有记录，但物理文件不存在 ===
    console.log('--- 场景1：数据库有记录但物理文件不存在 ---');
    for (const file of dbFiles) {
      const relPath = dbPathToRelative(file.file_path);
      const absolutePath = path.join(uploadsDir, relPath);

      if (!fs.existsSync(absolutePath)) {
        totalIssues++;
        orphanRecords.push({
          id: file.id,
          file_path: file.file_path,
          file_module: file.file_module,
          original_filename: file.original_filename,
          record_id: file.record_id,
        });
        console.log(`   ❌ [ID=${file.id}] ${file.file_path}`);
        console.log(`      模块: ${file.file_module}, 原始名: ${file.original_filename}`);
      }
    }
    if (orphanRecords.length === 0) {
      console.log('   ✅ 无脏数据记录\n');
    } else {
      console.log(`   ⚠️ 发现 ${orphanRecords.length} 条脏数据记录\n`);
    }

    // === 场景2：物理文件存在，但数据库无记录 ===
    console.log('--- 场景2：物理文件存在但数据库无记录 ---');
    for (const relPath of physicalFiles) {
      if (!dbFileMap.has(relPath)) {
        totalIssues++;
        orphanFiles.push(relPath);
        console.log(`   ❌ ${relPath}`);
      }
    }
    if (orphanFiles.length === 0) {
      console.log('   ✅ 无孤儿文件\n');
    } else {
      console.log(`   ⚠️ 发现 ${orphanFiles.length} 个孤儿文件\n`);
    }

    // 输出汇总
    console.log('========================================');
    console.log('  校验汇总');
    console.log('========================================\n');
    console.log(`   物理文件总数:     ${physicalFiles.length}`);
    console.log(`   数据库记录总数:   ${dbFiles.length}`);
    console.log(`   脏数据记录数:     ${orphanRecords.length}`);
    console.log(`   孤儿文件数:       ${orphanFiles.length}`);
    console.log(`   总计问题数:       ${totalIssues}\n`);

    if (totalIssues === 0) {
      console.log('✅ 校验通过！文件存储与数据库记录完全一致');
    } else {
      console.log('⚠️ 发现不一致问题，详情如上');

      if (orphanRecords.length > 0) {
        console.log('\n📋 脏数据修复建议:');
        console.log('   DELETE FROM files WHERE id IN (' +
          orphanRecords.map(r => r.id).join(',') + ');');
      }

      if (orphanFiles.length > 0) {
        console.log('\n📋 孤儿文件处理建议:');
        console.log('   手动确认后删除或重新导入数据库');
      }
    }
    console.log('========================================\n');

    return totalIssues === 0;
  } catch (error) {
    console.error('❌ 校验失败:', error);
    throw error;
  } finally {
    await db.sequelize.close();
  }
}

// 执行校验
verifyFileIntegrity()
  .then((isConsistent) => {
    console.log('脚本执行完成');
    process.exit(isConsistent ? 0 : 1);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
