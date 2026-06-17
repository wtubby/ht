import { formatAmount } from '@/utils/format';
import dayjs from 'dayjs';
import { forwardRef, useEffect } from 'react';

interface InvoiceOutPrintTemplateProps {
  invoiceData: API.InvoiceOut | null;
}

const formatTaxRate = (rate: number | null | undefined) => {
  if (rate === null || rate === undefined) return '-';
  return `${rate}%`;
};

const formatPrintDate = (date?: string) => {
  return date ? dayjs(date).format('YYYY年MM月DD日') : '';
};

const PRINT_STYLE_ID = 'invoice-print-style';

const PRINT_STYLES = `
  /* 基础样式 */
  .print-template {
    font-family: '宋体', SimSun, serif;
    font-size: 14px;
    width: 100%;
    min-height: 100%;
    margin: 0;
    padding: 8mm 15mm;
    background: white;
    color: black;
    position: relative;
    box-sizing: border-box;
  }

  .print-template * {
    box-sizing: border-box;
    font-family: inherit;
  }

  /* 标题 */
  .print-template .header h1 {
    font-size: 21px;
    font-weight: bold;
    margin: 10px 0;
    letter-spacing: 5px;
    text-align: center;
  }

  /* 表格 */
  .print-template table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 0;
    table-layout: fixed;
  }

  .print-template th,
  .print-template td {
    border: 1pt solid black;
    padding: 8px 6px;
    text-align: left;
    vertical-align: middle;
    line-height: 1.5;
  }

  .print-template .cell-text {
    word-wrap: break-word;
    word-break: normal;
  }

  .print-template .cell-amount {
    white-space: nowrap;
  }

  .print-template .cell-remarks {
    word-wrap: break-word;
    word-break: break-word;
  }

  /* 文本对齐 */
  .print-template .text-center {
    text-align: center;
  }

  .print-template .text-right {
    text-align: right;
  }

  /* 页眉信息 */
  .print-template .header {
    text-align: center;
    margin-bottom: 18px;
  }

  .print-template .header-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .print-template .amount-unit {
    margin-left: 10px;
  }

  /* 签名区域 */
  .print-template .signature-section {
    margin-top: 30px;
    display: flex;
    justify-content: space-between;
  }

  .print-template .signature-item {
    flex: 1;
    text-align: left;
    padding: 8px 0;
  }

  /* 列宽 */
  .print-template .col-seq { width: 5%; }
  .print-template .col-project { width: 22%; }
  .print-template .col-contract-amount { width: 32mm; }
  .print-template .col-counterparty { width: 16%; }
  .print-template .col-tax-rate { width: 7%; }
  .print-template .col-previous-invoiced { width: 32mm; }
  .print-template .col-current-invoice { width: 35mm; }
  .print-template .col-remarks { width: 12%; }

  /* 打印专用样式 */
  @media print {
    @page {
      size: A4 landscape;
      margin: 6mm;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .print-template {
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 8mm 15mm !important;
      page-break-inside: avoid !important;
      background: white !important;
      font-size: 14px !important;
    }

    .print-template table,
    .print-template tr {
      page-break-inside: avoid !important;
    }

    .print-template td,
    .print-template th {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }

  /* 屏幕预览样式 */
  @media screen {
    .print-template {
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      margin: 20px auto;
    }
  }
`;

export const InvoiceOutPrintTemplate = forwardRef<HTMLDivElement, InvoiceOutPrintTemplateProps>(
  function InvoiceOutPrintTemplate({ invoiceData }, ref) {
    useEffect(() => {
      let tag = document.getElementById(PRINT_STYLE_ID) as HTMLStyleElement | null;
      if (!tag) {
        tag = document.createElement('style');
        tag.id = PRINT_STYLE_ID;
        document.head.appendChild(tag);
      }
      tag.textContent = PRINT_STYLES;
    }, []);

    if (!invoiceData) return null;

    // 前期已开票 = 合同累计总开票金额 - 本次开票金额
    const totalInvoiced = invoiceData.mainContract?.total_invoiced ?? 0;
    const previousInvoiced = totalInvoiced - (invoiceData.invoice_amount ?? 0);

    return (
      <div className="print-template" ref={ref}>
        <div className="header">
          <h1>开票申请</h1>
        </div>

        <div className="header-info">
          <div>申请时间: {formatPrintDate(invoiceData.invoice_date)}</div>
          <div>申请部门: 项目管理中心</div>
          <div className="amount-unit">金额单位: 元</div>
        </div>

        <table>
          <colgroup>
            <col className="col-seq" />
            <col className="col-project" />
            <col className="col-contract-amount" />
            <col className="col-counterparty" />
            <col className="col-tax-rate" />
            <col className="col-previous-invoiced" />
            <col className="col-current-invoice" />
            <col className="col-remarks" />
          </colgroup>
          <thead>
            <tr>
              <th className="text-center">序号</th>
              <th className="text-center">项目名称</th>
              <th className="text-center cell-amount">合同总价</th>
              <th className="text-center">对方单位</th>
              <th className="text-center">税率</th>
              <th className="text-center cell-amount">前期已开票</th>
              <th className="text-center cell-amount">本次开票金额</th>
              <th className="text-center">备注</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-center">1</td>
              <td className="cell-text">{invoiceData.mainContract?.contract_name || '-'}</td>
              <td className="text-right cell-amount">
                {formatAmount(invoiceData.mainContract?.amount_contract)}
              </td>
              <td className="cell-text">{invoiceData.buyer || '-'}</td>
              <td className="text-center">{formatTaxRate(invoiceData.tax_rate)}</td>
              <td className="text-right cell-amount">{formatAmount(previousInvoiced)}</td>
              <td className="text-right cell-amount">{formatAmount(invoiceData.invoice_amount)}</td>
              <td className="cell-remarks">{invoiceData.remarks ?? ''}</td>
            </tr>
          </tbody>
        </table>

        <div className="signature-section">
          <div className="signature-item">经办人：</div>
          <div className="signature-item">部门负责人：</div>
          <div className="signature-item">财务资产部：</div>
        </div>
      </div>
    );
  },
);
