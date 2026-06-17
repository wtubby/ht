/**
 * 文件上传模块配置映射
 * 定义了各业务模块的文件上传配置
 */

export interface FileModuleConfig {
  moduleType: string;
  moduleName: string;
  moduleDesc: string;
  allowOcr?: boolean; // 是否允许OCR识别
  allowTempUpload?: boolean; // 是否允许临时上传
  maxFileSize?: number; // 最大文件大小(MB)
  accept?: string; // 接受的文件类型
}

// 文件模块配置常量
export const FILE_MODULE_CONFIGS: Record<string, FileModuleConfig> = {
  // 分包相关
  FB_BOND: {
    moduleType: 'FB_BOND',
    moduleName: '担保',
    moduleDesc: '分包合同担保文件',
    allowOcr: false,
    allowTempUpload: false,
    maxFileSize: 100,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
  },
  FB_CONTRACT: {
    moduleType: 'FB_CONTRACT',
    moduleName: '分包合同',
    moduleDesc: '分包合同相关文件',
    allowOcr: false,
    allowTempUpload: false,
    maxFileSize: 100,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
  },
  FB_INVOICE: {
    moduleType: 'FB_INVOICE',
    moduleName: '进项发票',
    moduleDesc: '进项发票文件',
    allowOcr: true,
    allowTempUpload: true,
    maxFileSize: 100,
    accept: '.pdf,.jpg,.jpeg,.png',
  },
  FB_PAYMENT: {
    moduleType: 'FB_PAYMENT',
    moduleName: '分包付款',
    moduleDesc: '分包付款凭证',
    allowOcr: false,
    allowTempUpload: false,
    maxFileSize: 100,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
  },

  // 总包相关
  ZB_CONTRACT: {
    moduleType: 'ZB_CONTRACT',
    moduleName: '总包合同',
    moduleDesc: '总包合同相关文件',
    allowOcr: false,
    allowTempUpload: false,
    maxFileSize: 100,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
  },
  ZB_INSPECT: {
    moduleType: 'ZB_INSPECT',
    moduleName: '检查记录',
    moduleDesc: '工程质量检查记录',
    allowOcr: false,
    allowTempUpload: false,
    maxFileSize: 100,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
  },
  ZB_INSURE: {
    moduleType: 'ZB_INSURE',
    moduleName: '工程保险',
    moduleDesc: '工程保险相关文件',
    allowOcr: false,
    allowTempUpload: false,
    maxFileSize: 100,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
  },
  ZB_INVOICE: {
    moduleType: 'ZB_INVOICE',
    moduleName: '销项发票',
    moduleDesc: '销项发票文件',
    allowOcr: true,
    allowTempUpload: true,
    maxFileSize: 100,
    accept: '.pdf,.jpg,.jpeg,.png',
  },
  ZB_RECEIVE: {
    moduleType: 'ZB_RECEIVE',
    moduleName: '总包收款',
    moduleDesc: '总包收款凭证',
    allowOcr: false,
    allowTempUpload: false,
    maxFileSize: 100,
    accept: '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
  },
};
