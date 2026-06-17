/**
 * 副作用导入：确保各实体在模块加载时完成 registerCacheChild 登记。
 * 由 hooks/index.ts 引入，避免父实体 mutation 时子层登记尚未执行。
 */
import './useBond';
import './useInvoice';
import './usePayment';
import './useReceive';
import './useSubContract';
