import React, { forwardRef, useMemo } from 'react';
import { formatCurrencyOrDash } from '@/utils/format';

interface SubContract {
  amount_contract?: number | string;
  amount_settlement?: number | string;
  contract_name?: string;
}

interface PaymentData {
  subContract?: SubContract;
  payment_amount?: number | string;
  total_paid?: number | string;
  account_name?: string;
  bank_name?: string;
  account_number?: string;
  payment_date?: string;
  legal_representative?: string;
  manager?: string;
}

interface PaymentPrintTemplateProps {
  paymentData: PaymentData;
}

const DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const UNITS = ['仟', '佰', '拾', '万', '仟', '佰', '拾', ''];

const formatDate = (date: string | undefined): string => {
  if (!date) return '    年  月  日';
  const d = new Date(date);
  return `${d.getFullYear()} 年 ${String(d.getMonth() + 1).padStart(2, '0')} 月 ${String(d.getDate()).padStart(2, '0')} 日`;
};

const formatAccountNumber = (accountNumber: string | undefined): string => {
  if (!accountNumber) return '';
  const cleaned = accountNumber.replace(/\s/g, '');
  return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
};

const amountToChinese = (amount: number | undefined | null): React.ReactNode => {
  if (amount === null || amount === undefined || amount <= 0 || isNaN(Number(amount))) {
    return (
      <>
        {UNITS.map((u, i) => (
          <React.Fragment key={i}>
            <span className="fs">ⓧ</span>
            <span className="zs"> {u} </span>
          </React.Fragment>
        ))}
        <span className="fs">ⓧ</span>
        <span className="zs"> 元 </span>
        <span className="fs">零</span>
        <span className="zs"> 角 </span>
        <span className="fs">零</span>
        <span className="zs"> 分</span>
      </>
    );
  }

  const totalCents = Math.round(Number(amount) * 100);
  const yuan = Math.floor(totalCents / 100);
  const jiao = Math.floor((totalCents % 100) / 10);
  const fen = totalCents % 10;
  const yuanStr = yuan.toString().padStart(8, '0');
  const result: React.ReactNode[] = [];
  let started = false;

  for (let i = 0; i < 8; i++) {
    const digit = parseInt(yuanStr[i]);
    const digitText = digit === 0 ? (started ? DIGITS[0] : 'ⓧ') : DIGITS[digit];
    if (digit !== 0) started = true;
    result.push(
      <React.Fragment key={i}>
        <span className="fs">{digitText}</span>
        <span className="zs"> {UNITS[i]} </span>
      </React.Fragment>,
    );
  }

  result.push(
    <React.Fragment key="yuan">
      <span className="fs">{started ? '' : 'ⓧ'}</span>
      <span className="zs">{started ? '元 ' : ' 元 '}</span>
    </React.Fragment>,
  );
  result.push(
    <React.Fragment key="jf">
      <span className="fs">{DIGITS[jiao]}</span>
      <span className="zs"> 角 </span>
      <span className="fs">{DIGITS[fen]}</span>
      <span className="zs"> 分</span>
    </React.Fragment>,
  );

  return <>{result}</>;
};

const styles = `
  .print-template { font: 13pt/1.4 '宋体' !important; width: 237mm; margin: 0 auto; padding: 10mm; background: white; color: black; position: relative; }
  .print-template *, .print-template table { box-sizing: border-box; }
  .print-template table { width: 100%; border-collapse: collapse; margin-bottom: 0; table-layout: fixed; }
  .print-template th, .print-template td { border: 0.05pt solid windowtext; padding: 2px 5px; vertical-align: middle; font-size: 13pt; line-height: 1.4; word-wrap: break-word; }
  
  .fs { font-family: 华文仿宋; }
  .zs { font-family: 华文中宋; }
   
  .header { margin-bottom: 5px; }
  .header h1 { font: bold 26pt/1 华文中宋; margin: 20px 0 0 0; letter-spacing: 1.5px; }
  .header p { margin: 0; font: 13pt/1.3 华文仿宋; }
  
  .signature-table td { height: 50px; font: 13pt 华文中宋; border: none !important; }
  
  .contract-cell { height: 30px; padding: 2px 5px; position: relative; }
  .contract-content { font: 10pt 华文仿宋; white-space: normal; word-wrap: break-word; word-break: break-all; display: block; position: absolute; top: 3px; left: 5px; width: calc(100% - 10px); line-height: 1.1; }
  .contract-content.long { font-size: 9pt; }
  
  @media print {
    @page { size: 237mm 140mm; margin: 0mm !important; }
    html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; -webkit-print-color-adjust: exact; }
    body > *:not(.print-template) { display: none !important; }
    .print-template { display: block !important; position: absolute !important; left: 15mm !important; top: 0mm !important; width: 227mm !important; height: 140mm !important; margin: 0 !important; padding: 5mm 15mm 5mm 0mm !important; font-size: 13pt !important; page-break-inside: avoid !important; overflow: hidden !important; }
    .print-template table { width: 100% !important; page-break-inside: avoid !important; margin: 0 !important; }
    .print-template tr { page-break-inside: avoid !important; }
    .print-template td, .print-template th { padding: 2px 5px !important; font-size: 13pt !important; border: 0.05pt solid black !important; }
    .signature-table td { border: none !important; }
    .header { margin-top: 5px !important; margin-bottom: 0 !important; }
    .header h1 { margin: 20px 0 8px 0 !important; }
  }
  
  @media screen {
    .print-template { box-shadow: 0 0 10px rgba(0,0,0,0.1); margin: 5px auto; padding-left: 30mm; }
  }
`;

export const PaymentPrintTemplate = forwardRef<HTMLDivElement, PaymentPrintTemplateProps>(
  ({ paymentData }, ref) => {
    const {
      subContract,
      payment_amount,
      total_paid,
      account_name,
      bank_name,
      account_number,
      payment_date,
      legal_representative,
      manager,
    } = paymentData || {};

    const computed = useMemo(
      () => ({
        paidAmount: (Number(total_paid) || 0) - (Number(payment_amount) || 0),
        contractName: subContract?.contract_name || '-',
        isLong: (subContract?.contract_name || '').length > 46,
        bankInfo:
          bank_name && account_number
            ? `${bank_name} ${formatAccountNumber(account_number)}`.trim()
            : '-',
        paymentAmt: formatCurrencyOrDash(payment_amount),
        contractAmt: formatCurrencyOrDash(
          subContract?.amount_settlement !== null &&
            subContract?.amount_settlement !== undefined &&
            subContract?.amount_settlement !== 0
            ? subContract.amount_settlement
            : subContract?.amount_contract,
        ),
        date: formatDate(payment_date),
        chinese: amountToChinese(Number(payment_amount) || 0),
      }),
      [
        paymentData,
        subContract,
        payment_amount,
        total_paid,
        bank_name,
        account_number,
        payment_date,
      ],
    );

    return (
      <div className="print-template" ref={ref}>
        <style>{styles}</style>

        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="/logo2.png"
              alt="logo"
              style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }}
            />
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '20px', fontFamily: '华文行楷' }}>
                四川能投发展建设有限公司
              </span>
              <p style={{ fontSize: '5pt', margin: '3px 0 0', textAlign: 'left' }}>
                SICHUAN ENERGY INVESTMENT DEVELOPMENT CONSTRUCTION CO.,LTD.
              </p>
            </div>
          </div>
          <h1
            style={{
              fontSize: '26pt',
              textAlign: 'center',
              width: '100%',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                borderBottom: '0.5pt solid #000',
                paddingBottom: '4px',
              }}
            >
              付 款 申 请 单
            </span>
          </h1>
          <p style={{ fontSize: '14pt', textAlign: 'center' }}>{computed.date}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px' }}>
          <span>
            <span className="zs">申请部门:</span>
            <span className="fs">项目管理中心</span>
          </span>
          <span className="tr zs">附件&nbsp; 张</span>
        </div>

        <table style={{ textAlign: 'center' }} className="zs">
          <tbody>
            <tr>
              <td style={{ width: '20%' }}>总价款</td>
              <td style={{ width: '20%' }} className="fs">
                {computed.contractAmt}
              </td>
              <td style={{ width: '20%' }}>前期已付款</td>
              <td colSpan={2} style={{ width: '40%', textAlign: 'left' }} className="fs">
                {' '}
                &nbsp;{formatCurrencyOrDash(computed.paidAmount)}
              </td>
            </tr>
            <tr>
              <td colSpan={2}>事由</td>
              <td>本次申请金额</td>
              <td>法定代表人</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={2} className="contract-cell">
                <span className={`contract-content ${computed.isLong ? 'long' : ''}`}>
                  {computed.contractName}
                </span>
              </td>
              <td className="fs">{computed.paymentAmt}</td>
              <td>总经理</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: 'left' }}>
                &nbsp;减: 冲借款或前期预付款
              </td>
              <td></td>
              <td>分管领导</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: 'left' }}>
                &nbsp;减: 应扣质保金及其他
              </td>
              <td></td>
              <td>部门负责人{legal_representative || ''}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={2}>本次付款金额</td>
              <td className="fs">{computed.paymentAmt}</td>
              <td>经办人</td>
              <td>{manager || ''}</td>
            </tr>
            <tr>
              <td>收款单位全称</td>
              <td colSpan={4} className="fs" style={{ textAlign: 'left' }}>
                {account_name || '-'}
              </td>
            </tr>
            <tr>
              <td>开户行及帐号</td>
              <td colSpan={4} className="fs" style={{ textAlign: 'left' }}>
                {computed.bankInfo}
              </td>
            </tr>
            <tr>
              <td
                colSpan={5}
                style={{
                  padding: '3px 5px',
                  border: '0.05pt solid windowtext',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ font: '13pt 华文中宋', flexShrink: 0 }}>
                    &nbsp;&nbsp; &nbsp;付款金额（大写）:
                  </span>
                  <div style={{ flex: 1, letterSpacing: '3px' }}>
                    &nbsp;&nbsp;{computed.chinese}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <table className="signature-table" style={{ textAlign: 'center' }}>
          <tbody>
            <tr>
              <td style={{ width: '35%', textAlign: 'left' }}>财务负责人:</td>
              <td style={{ width: '35%', textAlign: 'left' }}>会计审核:</td>
              <td style={{ width: '30%', textAlign: 'left' }}>出纳付款:</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  },
);

PaymentPrintTemplate.displayName = 'PaymentPrintTemplate';
