import AttachmentPanel from '@/components/AttachmentPanel';
import DetailItem from '@/components/DetailItem';
import FilePreviewArea from '@/components/FilePreviewArea';
import {
  formatRecordDetailTitle,
  RECORD_DETAIL_CARD_STYLE,
  RECORD_DETAIL_DRAWER_BODY_STYLE,
  RECORD_DETAIL_DRAWER_WIDTH,
  RECORD_DETAIL_SECTION_COLOR,
  RemarkValue,
  sectionTitleStyle,
} from '@/components/RecordDetail/shared';
import { COLORS, MODULE_COLORS, UI_COLORS } from '@/constants/colors';
import {
  getBondDisplayStatusColor,
  getBondDisplayStatusHex,
  getBondTypeColor,
} from '@/constants/statusColors';
import { useBond } from '@/hooks';
import { useFilePreview } from '@/hooks/useFilePreview';
import { getFiles } from '@/services/wtu/file.api';
import { formatCurrency } from '@/utils/format';
import {
  FileTextOutlined,
  PrinterOutlined,
  RollbackOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Col, Drawer, Row, Space, Spin, Tag } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  canRefundBond,
  formatBondStatusLabel,
  hasBondAmountDeviation,
  hasBondFormDeviation,
} from './bond.shared';
import BondRefundModal from './BondRefundModal';
import { BondRefundPrintTemplate } from './BondRefundPrintTemplate';

interface BondDetailProps {
  visible: boolean;
  currentRecord?: API.Bond;
  onCancel: () => void;
  onRefund?: () => void;
  /** 嵌套打开时可传入较小宽度，默认与一级详情一致 */
  drawerWidth?: number;
}

// ─────────────────────────────────────────────
// 打印样式：提取到模块顶层，避免每次渲染重新分配
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// 子组件：合同约定 vs 台账对比
// ─────────────────────────────────────────────
const PlannedCompareSection: React.FC<{ bondData: API.Bond }> = ({ bondData }) => {
  const plannedAmount = bondData.planned_amount;
  const plannedForm = bondData.planned_form;
  const hasPlanned =
    (plannedAmount != null && plannedAmount > 0) || (plannedForm && plannedForm !== '不限');

  if (!hasPlanned) {
    return null;
  }

  const amountDeviation = hasBondAmountDeviation(plannedAmount, bondData.amount);
  const formDeviation = hasBondFormDeviation(plannedForm, bondData.bond_form);

  const renderCompareCell = (
    label: string,
    planned: React.ReactNode,
    actual: React.ReactNode,
    deviated: boolean,
  ) => (
    <Col span={12}>
      <div
        style={{
          padding: '12px 16px',
          borderRadius: 8,
          border: `1px solid ${deviated ? UI_COLORS.warningBorder : COLORS.border}`,
          background: deviated ? UI_COLORS.warningBgSoft : COLORS.bgSubtle,
          height: '100%',
        }}
      >
        <div style={{ fontSize: 12, color: COLORS.textTertiary, marginBottom: 8 }}>{label}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: COLORS.textTertiary }}>合同约定</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{planned}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: COLORS.textTertiary }}>台账实缴</div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: deviated ? UI_COLORS.warningText : COLORS.text,
              }}
            >
              {actual}
            </div>
          </div>
        </div>
      </div>
    </Col>
  );

  return (
    <div style={{ marginTop: 20, marginBottom: 8 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.textSecondary,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>约定与台账对比</span>
        {(amountDeviation || formDeviation) && <Tag color="orange">与约定不一致</Tag>}
      </div>
      <Row gutter={16}>
        {renderCompareCell(
          '保证金金额',
          plannedAmount != null && plannedAmount > 0 ? formatCurrency(plannedAmount) : '未约定',
          bondData.amount != null ? formatCurrency(bondData.amount) : '-',
          amountDeviation,
        )}
        {renderCompareCell(
          '保证金形式',
          plannedForm || '未约定',
          bondData.bond_form || '-',
          formDeviation,
        )}
      </Row>
    </div>
  );
};

// ─────────────────────────────────────────────
// 子组件：分包合同信息区块
// ─────────────────────────────────────────────
const SubContractSection: React.FC<{ bondData: API.Bond }> = ({ bondData }) => (
  <>
    <h3 style={sectionTitleStyle(MODULE_COLORS.subContract.color)}>
      <FileTextOutlined style={{ marginRight: '8px' }} />
      分包合同信息
    </h3>
    <Row gutter={24}>
      <DetailItem label="合同名称" value={bondData.subContract?.contract_name || '-'} span={12} />
      <DetailItem
        label="合同金额"
        value={
          <span style={{ color: UI_COLORS.amount, fontWeight: 600 }}>
            {formatCurrency(bondData.subContract?.amount_contract || 0)}
          </span>
        }
        span={12}
      />
      <DetailItem
        label="分包单位"
        value={bondData.subContract?.partyC?.company_name || '-'}
        span={12}
      />
      <DetailItem
        label="结算金额"
        value={
          <span style={{ color: UI_COLORS.amount, fontWeight: 600 }}>
            {formatCurrency(bondData.subContract?.amount_settlement || 0)}
          </span>
        }
        span={12}
      />
    </Row>
  </>
);

// ─────────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────────
const BondDetail: React.FC<BondDetailProps> = ({
  visible,
  currentRecord,
  onCancel,
  onRefund,
  drawerWidth = RECORD_DETAIL_DRAWER_WIDTH,
}) => {
  const { message: antdMessage } = App.useApp();
  const [files, setFiles] = useState<API.File[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const { previewVisible, previewFile, handleFilePreview, handlePreviewClose } = useFilePreview();
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const recordId = currentRecord?.id ?? 0;
  const detailEnabled = visible && !!currentRecord?.id;
  const { data: detailResponse, isLoading, isFetching, isError } = useBond(recordId, detailEnabled);
  const typedResponse = detailResponse as { success?: boolean; data?: API.Bond } | undefined;
  const bondData =
    typedResponse?.success && typedResponse.data ? typedResponse.data : (currentRecord ?? null);
  const detailLoading = detailEnabled && (isLoading || isFetching);
  const loading = detailLoading || filesLoading;

  useEffect(() => {
    if (isError) {
      antdMessage.error('加载担保详情失败');
    }
  }, [isError, antdMessage]);

  // ── 加载附件列表 ──────────────────────────────
  useEffect(() => {
    const recordId = bondData?.id;
    if (!visible || !recordId) {
      if (!visible) setFiles([]);
      return;
    }

    let cancelled = false;
    const loadFiles = async () => {
      setFilesLoading(true);
      try {
        const response = await getFiles({
          file_module: 'FB_BOND',
          record_id: recordId,
          pageSize: 1000,
        });
        if (!cancelled && response.success && response.data) {
          setFiles(response.data as API.File[]);
        }
      } catch (error) {
        if (!cancelled) {
          antdMessage.error('加载文件列表失败');
        }
      } finally {
        if (!cancelled) setFilesLoading(false);
      }
    };

    loadFiles();
    return () => {
      cancelled = true;
    };
  }, [visible, bondData?.id, antdMessage]);

  const handleRefundSuccess = () => {
    onCancel();
    onRefund?.();
  };

  // ── 打印 ──────────────────────────────────────
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `保证金退还付款单_${currentRecord?.id || ''}`,
    pageStyle: PRINT_PAGE_STYLE,
  });

  const handlePrintClick = useCallback(() => {
    if (!bondData) {
      antdMessage.warning('请选择要打印的保证金记录');
      return;
    }
    if (bondData.status !== '已退还') {
      antdMessage.warning('仅已退还的保证金可以打印付款单');
      return;
    }
    handlePrint();
  }, [bondData, handlePrint, antdMessage]);

  // ── 金额颜色 ──────────────────────────────────
  const getAmountColor = (bond: API.Bond) => {
    const displayStatus = bond.display_status || bond.status;
    return getBondDisplayStatusHex(bond.bond_form, displayStatus);
  };

  // ─────────────────────────────────────────────
  // 渲染
  // ─────────────────────────────────────────────
  const bondTitle = formatRecordDetailTitle(
    bondData?.subContract?.contract_name ?? currentRecord?.subContract?.contract_name,
    '保证金详情',
  );

  if (!bondData) {
    return (
      <Drawer
        title={bondTitle}
        open={visible}
        onClose={onCancel}
        width={drawerWidth}
        destroyOnClose
        styles={{ body: RECORD_DETAIL_DRAWER_BODY_STYLE }}
      >
        <Spin spinning={loading} />
      </Drawer>
    );
  }

  const drawerExtraItems = [
    canRefundBond(bondData) ? (
      <Button
        key="refund"
        icon={<RollbackOutlined />}
        type="primary"
        size="small"
        onClick={() => setRefundModalOpen(true)}
      >
        退还保证金
      </Button>
    ) : null,
    bondData.status === '已退还' ? (
      <Button key="print" icon={<PrinterOutlined />} size="small" onClick={handlePrintClick}>
        打印退还付款单
      </Button>
    ) : null,
  ].filter(Boolean);

  const drawerExtra = drawerExtraItems.length > 0 ? <Space>{drawerExtraItems}</Space> : undefined;

  return (
    <Drawer
      title={bondTitle}
      open={visible}
      onClose={onCancel}
      width={drawerWidth}
      destroyOnClose
      extra={drawerExtra}
      styles={{ body: RECORD_DETAIL_DRAWER_BODY_STYLE }}
    >
      <Spin spinning={loading}>
        <Row gutter={16}>
          {/* ── 左侧：担保主体信息 ── */}
          <Col span={16}>
            <Card
              variant="borderless"
              style={RECORD_DETAIL_CARD_STYLE}
              styles={{ body: { padding: '24px' } }}
            >
              <h3 style={sectionTitleStyle(MODULE_COLORS.bond.color, { isFirst: true })}>
                <SafetyOutlined style={{ marginRight: '8px' }} />
                担保信息
              </h3>

              {/* 金额 + 状态 + 基本字段 */}
              <Row gutter={24}>
                <Col span={8}>
                  <div
                    style={{
                      background: MODULE_COLORS.bond.bg,
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
                      <div
                        style={{
                          fontSize: '14px',
                          color: MODULE_COLORS.bond.color,
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <Tag
                          color={getBondTypeColor(bondData.bond_type!)}
                          style={{ fontSize: 13, padding: '2px 8px', margin: 0 }}
                        >
                          {bondData.bond_type}
                        </Tag>
                        <Tag
                          color={getBondDisplayStatusColor(
                            bondData.bond_form,
                            bondData.display_status || bondData.status,
                          )}
                          style={{ fontSize: 13, padding: '2px 8px', margin: 0 }}
                        >
                          {formatBondStatusLabel(
                            bondData.bond_form,
                            bondData.display_status || bondData.status,
                          )}
                        </Tag>
                      </div>
                      <div
                        style={{
                          fontSize: '28px',
                          fontWeight: 900,
                          color: getAmountColor(bondData),
                          lineHeight: 1.1,
                          marginBottom: '8px',
                        }}
                      >
                        {formatCurrency(bondData.amount || 0)}
                      </div>
                    </div>
                  </div>
                </Col>

                <Col span={16}>
                  <Row gutter={24}>
                    <DetailItem
                      label={bondData.bond_form === '现金' ? '缴纳日期' : '生效日期'}
                      value={bondData.date_start || '-'}
                      span={12}
                    />
                    <DetailItem
                      label={bondData.bond_form === '现金' ? '退还日期' : '到期日期'}
                      value={bondData.date_end || '-'}
                      span={12}
                    />
                    <DetailItem label="开立机构" value={bondData.organization || '-'} span={12} />
                    <DetailItem
                      label="备注"
                      value={<RemarkValue value={bondData.remarks} />}
                      span={12}
                    />
                  </Row>
                </Col>
              </Row>

              <PlannedCompareSection bondData={bondData} />

              {/* 退还账户信息 - 仅已退还且现金形式 */}
              {(bondData.display_status || bondData.status) === '已退还' &&
                bondData.bond_form === '现金' &&
                (bondData.account_name || bondData.account_number || bondData.bank_name) && (
                  <>
                    <h3 style={sectionTitleStyle(RECORD_DETAIL_SECTION_COLOR.success)}>
                      <RollbackOutlined style={{ marginRight: '8px' }} />
                      退还账户信息
                    </h3>
                    <Row gutter={24}>
                      <DetailItem label="账户户名" value={bondData.account_name || '-'} span={8} />
                      <DetailItem label="开户银行" value={bondData.bank_name || '-'} span={8} />
                      <DetailItem
                        label="账户号码"
                        value={bondData.account_number || '-'}
                        span={8}
                      />
                    </Row>
                  </>
                )}

              {/* 分包合同信息 */}
              <SubContractSection bondData={bondData} />
            </Card>
          </Col>

          {/* ── 右侧：附件 ── */}
          <Col span={8}>
            <AttachmentPanel
              title="保证金附件"
              files={files}
              onPreview={handleFilePreview}
              iconColor={MODULE_COLORS.bond.color}
            />
          </Col>
        </Row>
      </Spin>

      <FilePreviewArea
        previewVisible={previewVisible}
        previewFile={previewFile}
        onClose={handlePreviewClose}
      />

      {/* 打印模板（隐藏） */}
      <div style={{ display: 'none' }}>
        <BondRefundPrintTemplate ref={printRef} bondData={bondData} />
      </div>

      <BondRefundModal
        open={refundModalOpen}
        bond={bondData}
        onClose={() => setRefundModalOpen(false)}
        onSuccess={handleRefundSuccess}
      />
    </Drawer>
  );
};

export default BondDetail;
