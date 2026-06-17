import AttachmentPanel from '@/components/AttachmentPanel';
import DetailItem from '@/components/DetailItem';
import FilePreviewArea from '@/components/FilePreviewArea';
import {
  AmountRatioRow,
  formatRecordDetailTitle,
  RECORD_DETAIL_CARD_STYLE,
  RECORD_DETAIL_DRAWER_BODY_STYLE,
  RECORD_DETAIL_DRAWER_WIDTH,
  RemarkValue,
  sectionTitleStyle,
} from '@/components/RecordDetail/shared';
import { COLORS, MODULE_COLORS, UI_COLORS } from '@/constants/colors';
import { usePayment } from '@/hooks';
import { useFilePreview } from '@/hooks/useFilePreview';
import { getFiles } from '@/services/wtu/file.api';
import { formatCurrency } from '@/utils/format';
import {
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  PrinterOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { App, Button, Card, Col, Drawer, Dropdown, Row, Spin } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PaymentApplicationTemplate } from './PaymentApplicationTemplate';
import { PaymentPrintTemplate } from './PaymentPrintTemplate';

interface PaymentDetailProps {
  visible: boolean;
  currentRecord?: API.Payment;
  onCancel: () => void;
}

const PRINT_PAGE_STYLE = `
  @media print {
    @page {
      size: 267mm 140mm;
      margin: 0mm !important;
    }
    * {
      box-sizing: border-box !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact;
    }
    body > *:not(.print-template) {
      display: none !important;
    }
  }
`;

// 主组件
const PaymentDetail: React.FC<PaymentDetailProps> = ({ visible, currentRecord, onCancel }) => {
  const { message: antdMessage } = App.useApp();
  const printRef = useRef<HTMLDivElement>(null);
  const printAppRef = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<API.File[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const { previewVisible, previewFile, handleFilePreview, handlePreviewClose } = useFilePreview();

  const recordId = currentRecord?.id ?? 0;
  const detailEnabled = visible && !!currentRecord?.id;
  const {
    data: detailResponse,
    isLoading,
    isFetching,
    isError,
  } = usePayment(recordId, detailEnabled);
  const typedResponse = detailResponse as { success?: boolean; data?: API.Payment } | undefined;
  const displayData =
    typedResponse?.success && typedResponse.data ? typedResponse.data : (currentRecord ?? null);
  const detailLoading = detailEnabled && (isLoading || isFetching);
  const loading = detailLoading || filesLoading;

  useEffect(() => {
    if (isError) {
      antdMessage.error('加载付款详情失败');
    }
  }, [isError, antdMessage]);

  // 加载附件列表（通过后端参数过滤，避免分页截断）
  const loadFiles = async (mainId: number, subId: number, paymentId: number) => {
    setFilesLoading(true);
    try {
      const response = await getFiles({
        file_module: 'FB_PAYMENT',
        main_contract_id: mainId,
        sub_contract_id: subId,
        record_id: paymentId,
        pageSize: 1000,
      });
      if (response.success && response.data) {
        setFiles(response.data as API.File[]);
      }
    } catch (error) {
      antdMessage.error('加载文件列表失败');
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    if (visible && displayData?.id && displayData?.subContract?.mainContract?.id) {
      loadFiles(
        displayData.subContract.mainContract.id,
        displayData.sub_contract_id!,
        displayData.id,
      );
    } else if (!visible) {
      setFiles([]);
    }
  }, [
    visible,
    displayData?.id,
    displayData?.subContract?.mainContract?.id,
    displayData?.sub_contract_id,
  ]);

  // 打印前验证
  const handleBeforePrint = useCallback(async () => {
    if (!currentRecord) {
      antdMessage.warning('付款记录数据不完整，请稍候再试。');
      return Promise.reject('数据不完整');
    }
    return Promise.resolve();
  }, [currentRecord, antdMessage]);

  // 付款申请单打印配置
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `付款申请单_${currentRecord?.id || ''}`,
    pageStyle: PRINT_PAGE_STYLE,
    onBeforePrint: handleBeforePrint,
  });

  // 支付申请表打印配置
  const handlePrintApplication = useReactToPrint({
    contentRef: printAppRef,
    documentTitle: `工程款支付申请表_${currentRecord?.id || ''}`,
    onBeforePrint: handleBeforePrint,
  });

  // 打印付款申请单按钮点击
  const handlePrintClick = useCallback(() => {
    if (!currentRecord) {
      antdMessage.warning('请选择要打印的付款记录');
      return;
    }
    handlePrint();
  }, [currentRecord, handlePrint, antdMessage]);

  // 打印支付申请表按钮点击
  const handlePrintApplicationClick = useCallback(() => {
    if (!currentRecord) {
      antdMessage.warning('请选择要打印的付款记录');
      return;
    }
    handlePrintApplication();
  }, [currentRecord, handlePrintApplication, antdMessage]);

  const paymentTitle = formatRecordDetailTitle(
    displayData?.subContract?.contract_name ?? currentRecord?.subContract?.contract_name,
    '付款详情',
  );

  if (!displayData) {
    return (
      <Drawer
        title={paymentTitle}
        open={visible}
        onClose={onCancel}
        width={RECORD_DETAIL_DRAWER_WIDTH}
        destroyOnClose
        styles={{ body: RECORD_DETAIL_DRAWER_BODY_STYLE }}
      >
        <Spin spinning={loading} />
      </Drawer>
    );
  }

  const paymentAmount = displayData.payment_amount || 0;
  const subContractAmount = displayData.subContract?.amount_contract;

  const printMenuItems: MenuProps['items'] = [
    { key: 'payment', label: '打印付款申请单', onClick: handlePrintClick },
    { key: 'application', label: '打印支付申请表', onClick: handlePrintApplicationClick },
  ];

  const drawerExtra = (
    <Dropdown menu={{ items: printMenuItems }} trigger={['click']}>
      <Button type="primary" icon={<PrinterOutlined />} size="small">
        打印
      </Button>
    </Dropdown>
  );

  return (
    <Drawer
      title={paymentTitle}
      open={visible}
      onClose={onCancel}
      width={RECORD_DETAIL_DRAWER_WIDTH}
      destroyOnClose
      extra={drawerExtra}
      styles={{ body: RECORD_DETAIL_DRAWER_BODY_STYLE }}
    >
      <Spin spinning={loading}>
        <Row gutter={16}>
          {/* 左侧：付款主体信息 (占 16 份宽度) */}
          <Col span={16}>
            <Card
              variant="borderless"
              style={RECORD_DETAIL_CARD_STYLE}
              styles={{ body: { padding: '24px' } }}
            >
              <h3 style={sectionTitleStyle(MODULE_COLORS.payment.color, { isFirst: true })}>
                <DollarOutlined style={{ marginRight: '8px' }} />
                付款信息
              </h3>

              <Row gutter={24}>
                {/* 左侧:金额及日期 (占 8 份宽度) */}
                <Col span={8}>
                  <div
                    style={{
                      background: MODULE_COLORS.payment.bg,
                      borderRadius: '6px',
                      padding: '16px',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ width: '100%' }}>
                      <AmountRatioRow
                        currentAmount={paymentAmount}
                        contractAmount={subContractAmount}
                        totalAmount={displayData.total_paid}
                        totalTooltipLabel="累计付款"
                      />

                      <div
                        style={{
                          fontSize: '28px',
                          fontWeight: 900,
                          color: MODULE_COLORS.payment.color,
                          lineHeight: 1.1,
                          marginBottom: '8px',
                        }}
                      >
                        {formatCurrency(paymentAmount)}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: '5px',
                        paddingTop: '5px',
                        borderTop: `1px dashed ${MODULE_COLORS.payment.color}`,
                        width: '100%',
                        color: COLORS.textSecondary,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CalendarOutlined style={{ marginRight: 6 }} />
                      <span style={{ fontWeight: 500 }}>付款日期：</span>
                      {displayData.payment_date || '-'}
                    </div>
                  </div>
                </Col>

                {/* 右侧:付款详情 (占 16 份宽度) */}
                <Col span={16}>
                  <Row gutter={24}>
                    <DetailItem
                      label="账户户名"
                      value={displayData.account_name || '-'}
                      span={12}
                    />
                    <DetailItem label="开户银行" value={displayData.bank_name || '-'} span={12} />
                    <DetailItem
                      label="账户号码"
                      value={displayData.account_number || '-'}
                      span={12}
                    />
                    <DetailItem
                      label="备注"
                      value={<RemarkValue value={displayData.remarks} />}
                      span={12}
                    />
                  </Row>
                </Col>
              </Row>

              <h3 style={sectionTitleStyle(MODULE_COLORS.subContract.color)}>
                <FileTextOutlined style={{ marginRight: '8px' }} />
                分包合同信息
              </h3>
              <Row gutter={24}>
                <DetailItem
                  label="合同名称"
                  value={displayData.subContract?.contract_name || '-'}
                  span={12}
                />
                <DetailItem
                  label="合同金额"
                  value={
                    <span style={{ color: UI_COLORS.amount, fontWeight: 600 }}>
                      {formatCurrency(subContractAmount)}
                    </span>
                  }
                  span={12}
                />
                <DetailItem
                  label="付款方 (承包单位)"
                  value={displayData.payer_name || '-'}
                  span={12}
                />
                <DetailItem
                  label="收款方 (分包单位)"
                  value={displayData.payee_name || '-'}
                  span={12}
                />
              </Row>

              {/* --- 总包合同信息区块 --- */}
              {displayData.subContract?.mainContract?.contract_name && (
                <>
                  <h3 style={sectionTitleStyle(MODULE_COLORS.mainContract.color)}>
                    <ProjectOutlined style={{ marginRight: '8px' }} />
                    总包合同信息
                  </h3>
                  <Row gutter={24}>
                    <DetailItem
                      label="合同名称"
                      value={displayData.subContract.mainContract.contract_name || '-'}
                      span={12}
                    />
                    <DetailItem
                      label="合同金额"
                      value={
                        <span style={{ color: UI_COLORS.amount, fontWeight: 600 }}>
                          {formatCurrency(displayData.subContract.mainContract.amount_contract)}
                        </span>
                      }
                      span={12}
                    />
                    <DetailItem
                      label="发包单位"
                      value={displayData.subContract.mainContract.partyA?.company_name || '-'}
                      span={12}
                    />
                    <DetailItem
                      label="承包单位"
                      value={displayData.subContract.mainContract.partyB?.company_name || '-'}
                      span={12}
                    />
                  </Row>
                </>
              )}
            </Card>
          </Col>

          {/* 右侧：附件 */}
          <Col span={8}>
            <AttachmentPanel
              title="付款附件"
              files={files}
              onPreview={handleFilePreview}
              iconColor={MODULE_COLORS.payment.color}
            />
          </Col>
        </Row>
      </Spin>

      {/* 打印模板 - 隐藏但存在于DOM中 */}
      <div style={{ display: 'none' }}>
        <PaymentPrintTemplate ref={printRef} paymentData={displayData!} />
      </div>

      {/* 支付申请表打印模板 - 独立组件 */}
      <div style={{ display: 'none' }}>
        {displayData?.id && (
          <PaymentApplicationTemplate ref={printAppRef} paymentId={displayData.id} />
        )}
      </div>

      <FilePreviewArea
        previewVisible={previewVisible}
        previewFile={previewFile}
        onClose={handlePreviewClose}
      />
    </Drawer>
  );
};

export default PaymentDetail;
