import { COLORS } from '@/constants/colors';
import { getPaymentApplicationData } from '@/services/wtu/paymentApplication.api';
import { getErrorMessage } from '@/utils/apiError';
import { formatAmountOrDash } from '@/utils/format';
import { Result, Spin } from 'antd';
import { forwardRef, useEffect, useState } from 'react';

interface PaymentApplicationTemplateProps {
  paymentId: number;
}

export const PaymentApplicationTemplate = forwardRef<
  HTMLDivElement,
  PaymentApplicationTemplateProps
>(({ paymentId }, ref) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<API.PaymentApplicationData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getPaymentApplicationData(paymentId);
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.message || '获取数据失败');
        }
      } catch (error) {
        setError(getErrorMessage(error, '网络错误'));
      } finally {
        setLoading(false);
      }
    };

    if (paymentId) {
      fetchData();
    }
  }, [paymentId]);

  // 计算百分比
  const calculatePercentage = (part: number | undefined, total: number | undefined): string => {
    if (!part || !total || total === 0) return '0%';
    const percentage = (part / total) * 100;
    return `${percentage.toFixed(0)}%`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return <Result status="error" title="加载失败" subTitle={error || '无法获取支付申请表数据'} />;
  }

  return (
    <div className="print-template" ref={ref}>
      {/* 打印专用样式 */}
      <style>{`
          /* 基础样式 */
          .print-template {
            font-family: '宋体', serif;
            margin: 20px;
            background-color: ${COLORS.bgHover};
            width: 100%;
            box-sizing: border-box;
          }

          .container {
            background-color: white;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
          }

          .print-template .header {
            text-align: center;
            margin: 10px 0;
          }

          .print-template .header h1 {
            font-size: 20px;
            font-weight: bold;
            margin: 10px 0;
          }

          .print-template .header h2 {
            font-size: 16px;
            font-weight: normal;
            margin: 10px 0;
          }

          .print-template .header-info {
            text-align: right;
            font-size: 14px;
            margin-bottom: 10px;
          }

          .print-template table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }

          .print-template th, 
          .print-template td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
            font-size: 12px !important;
          }

          .print-template .signature-row td {
            padding: 15px 8px;
          }

          .print-template .notes {
            font-size: 12px;
            margin-top: 20px;
            line-height: 1.8;
          }

          .print-template .left-align {
            text-align: left;
          }

          .print-template .right-align {
            text-align: right;
          }

          /* 打印专用样式 */
          @media print {
            @page {
              size: A4 landscape;
              margin: 10mm;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: 100% !important;
              overflow: visible !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            body > *:not(.print-template) {
              display: none !important;
            }

            .print-template {
              display: block !important;
              position: static !important;
              width: 100% !important;
              max-width: 297mm !important;
              height: auto !important;
              margin: 0 auto !important;
              padding: 15mm 20mm !important;
              font-size: 10pt !important;
              page-break-inside: avoid !important;
              background: white !important;
              box-sizing: border-box !important;
              overflow: visible !important;
            }
          }
        `}</style>

      <div className="container">
        <div className="header">
          <h1>四川能投发展建设有限公司</h1>
          <h2>工程费支付申请表</h2>
        </div>

        <div className="header-info">单位：元</div>

        {/* 工程费支付申请表 */}
        <table style={{ fontSize: '20px' }}>
          <tbody>
            <tr>
              <th style={{ width: '20%' }}>项目名称</th>
              <th>总包合同金额</th>
              <th>工程进度</th>
              <th>开发票金额</th>
              <th>第一次收款</th>
              <th>第二次收款</th>
              <th>第三次收款</th>
              <th>第四次收款</th>
              <th>累计收款金额</th>
            </tr>

            {/* 第一行:项目名称和总包合同信息 */}
            <tr>
              <td>{data.mainContract.contract_name || '-'}</td>
              <td>{formatAmountOrDash(data.mainContract.amount_contract)}</td>
              <td>
                {calculatePercentage(
                  data.mainContract.total_received,
                  data.mainContract.amount_contract,
                )}
              </td>
              <td>{formatAmountOrDash(data.mainContract.total_invoiced)}</td>
              <td>{formatAmountOrDash(data.mainContract.receivesByOrder?.[0])}</td>
              <td>{formatAmountOrDash(data.mainContract.receivesByOrder?.[1])}</td>
              <td>{formatAmountOrDash(data.mainContract.receivesByOrder?.[2])}</td>
              <td>{formatAmountOrDash(data.mainContract.receivesByOrder?.[3])}</td>
              <td>{formatAmountOrDash(data.mainContract.total_received)}</td>
            </tr>
            <tr>
              <td>当前分包合同</td>
              <td>分包合同金额</td>
              <td>工程进度</td>
              <td>收发票金额</td>
              <td>第一次付款</td>
              <td>第二次付款</td>
              <td>第三次付款</td>
              <td>第四次付款</td>
              <td>累计支付金额</td>
            </tr>

            {/* 当前分包合同明细行 */}
            {(() => {
              const currentContract = data.currentSubContract;

              return currentContract ? (
                <tr key={`contract-${currentContract.id}`}>
                  <td>{currentContract.contract_name}</td>
                  <td>{formatAmountOrDash(currentContract.amount_contract)}</td>
                  <td>
                    {calculatePercentage(
                      data.summary.total_paid_amount,
                      currentContract.amount_contract,
                    )}
                  </td>
                  <td>{formatAmountOrDash(data.allSubContracts[0]?.total_invoiced || 0)}</td>
                  <td>{formatAmountOrDash(currentContract.paymentsByOrder?.[0])}</td>
                  <td>{formatAmountOrDash(currentContract.paymentsByOrder?.[1])}</td>
                  <td>{formatAmountOrDash(currentContract.paymentsByOrder?.[2])}</td>
                  <td>{formatAmountOrDash(currentContract.paymentsByOrder?.[3])}</td>
                  <td>{formatAmountOrDash(data.summary.total_paid_amount)}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={9}>暂无分包合同信息</td>
                </tr>
              );
            })()}

            {/* 预估成本总金额行 */}
            <tr>
              <td colSpan={2}>预估成本总金额</td>
              <td>工程施工已列人工费</td>
              <td>工程施工已列材料费</td>
              <td>工程施工已列分包费</td>
              <td>工程施工已列其他费用</td>
              <td></td>
              <td></td>
              <td>累计支出金额</td>
            </tr>

            {/* 最后一行:合计 */}
            <tr>
              <td colSpan={2}></td>
              <td></td>
              <td></td>
              <td>{formatAmountOrDash(data.summary.total_contract_amount)}</td>
              <td></td>
              <td></td>
              <td></td>
              <td>{formatAmountOrDash(data.summary.total_paid_amount)}</td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            fontSize: '14px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <span>项目管理中心经办人：</span>

          <span style={{ marginLeft: '100px' }}>项目管理中心负责人：</span>

          <span style={{ marginLeft: '100px' }}>分管领导：</span>

          <span style={{ marginLeft: '100px' }}>总经理：</span>
        </div>

        {/* 备注说明 */}
        <div className="notes">
          备注：1、工程施工相关费用由财资部会计填写，其他由工程部人员填写，财资部会计复核；2、涉及一个项目多个分包单位的需工作人员自行插行，多次收款自行插列。
        </div>
      </div>
    </div>
  );
});

PaymentApplicationTemplate.displayName = 'PaymentApplicationTemplate';
