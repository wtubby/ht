import AmountProgressStatCard from '@/components/AmountProgressStatCard';
import AttachmentPanel from '@/components/AttachmentPanel';
import FilePreviewArea from '@/components/FilePreviewArea';
import {
  formatRecordDetailTitle,
  NESTED_RECORD_DETAIL_DRAWER_WIDTH,
  RECORD_DETAIL_CARD_STYLE,
  RECORD_DETAIL_DRAWER_BODY_STYLE,
  RECORD_DETAIL_DRAWER_WIDTH,
} from '@/components/RecordDetail/shared';
import { MODULE_COLORS, UI_COLORS } from '@/constants/colors';
import { getContractStatusColor, getContractTypeColor } from '@/constants/statusColors';
import {
  fetchInvoiceInsQuery,
  fetchPaymentsQuery,
  subContractKeys,
  useSubContract,
  useSubContractFiles,
} from '@/hooks';
import { useFilePreview } from '@/hooks/useFilePreview';
import type { BondCreatePreset, BondType } from '@/pages/Bond/bond.shared';
import { getPendingBondTypes } from '@/pages/Bond/bond.shared';
import BondDetail from '@/pages/Bond/BondDetail';
import BondForm from '@/pages/Bond/BondForm';
import { calcProgressPct } from '@/utils/format';
import {
  DollarOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { App, Badge, Button, Card, Col, Descriptions, Drawer, Row, Spin, Tabs, Tag, Tooltip } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InvoiceInTableCard from './InvoiceInTableCard';
import PaymentTableCard from './PaymentTableCard';
import SubContractBondDetailSection from './SubContractBondDetailSection';

interface SubContractDetailProps {
  visible: boolean;
  currentRecord?: API.SubContract;
  onCancel: () => void;
}

const SubContractDetail: React.FC<SubContractDetailProps> = ({
  visible,
  currentRecord,
  onCancel,
}) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [selectedPaymentKeys, setSelectedPaymentKeys] = useState<React.Key[]>([]);
  const [selectedInvoiceKeys, setSelectedInvoiceKeys] = useState<React.Key[]>([]);
  const [bondDetailVisible, setBondDetailVisible] = useState(false);
  const [currentBond, setCurrentBond] = useState<API.Bond | undefined>(undefined);
  const [bondFormVisible, setBondFormVisible] = useState(false);
  const [bondCreatePreset, setBondCreatePreset] = useState<BondCreatePreset | undefined>(undefined);
  const registeredBondIdRef = useRef<number | null>(null);
  const { previewVisible, previewFile, handleFilePreview, handlePreviewClose } = useFilePreview();

  const recordId = currentRecord?.id ?? 0;
  const detailEnabled = visible && !!currentRecord?.id;
  const {
    data: detailResponse,
    isLoading: basicLoading,
    isFetching: basicFetching,
    isError: basicError,
  } = useSubContract(recordId, detailEnabled);
  const typedBasic = detailResponse as { success?: boolean; data?: API.SubContract } | undefined;
  const displayRecord =
    typedBasic?.success && typedBasic.data ? typedBasic.data : (currentRecord ?? null);

  const subContractId = displayRecord?.id;
  const mainContractId = displayRecord?.main_contract_id;
  const relatedEnabled = detailEnabled && !!subContractId;
  const basicDetailLoading = detailEnabled && (basicLoading || basicFetching);

  useEffect(() => {
    if (basicError) {
      message.error('加载分包合同详情失败');
    }
  }, [basicError, message]);

  const refreshSubContract = useCallback(() => {
    if (subContractId) {
      queryClient.invalidateQueries({ queryKey: subContractKeys.subContract(subContractId) });
    }
  }, [queryClient, subContractId]);

  useEffect(() => {
    if (!visible) {
      setBondDetailVisible(false);
      setCurrentBond(undefined);
      setBondFormVisible(false);
      setBondCreatePreset(undefined);
      registeredBondIdRef.current = null;
    }
  }, [visible]);

  const handleViewBond = useCallback((bond: NonNullable<API.SubContract['bonds']>[number]) => {
    setBondFormVisible(false);
    setBondCreatePreset(undefined);
    setCurrentBond({ id: bond.id } as API.Bond);
    setBondDetailVisible(true);
  }, []);

  const handleRegisterBond = useCallback(
    (bondType: BondType) => {
      if (!subContractId) return;
      setBondDetailVisible(false);
      setCurrentBond(undefined);
      setBondCreatePreset({ sub_contract_id: subContractId, bond_type: bondType });
      setBondFormVisible(true);
    },
    [subContractId],
  );

  const handleBondDetailCancel = useCallback(() => {
    setBondDetailVisible(false);
    setCurrentBond(undefined);
  }, []);

  const handleBondFormCancel = useCallback(() => {
    setBondFormVisible(false);
    setBondCreatePreset(undefined);
  }, []);

  const handleBondRegistered = useCallback((bondId: number) => {
    registeredBondIdRef.current = bondId;
  }, []);

  const handleBondFormSuccess = useCallback(() => {
    setBondFormVisible(false);
    setBondCreatePreset(undefined);
    refreshSubContract();

    const focusId = registeredBondIdRef.current;
    registeredBondIdRef.current = null;
    if (focusId) {
      setCurrentBond({ id: focusId } as API.Bond);
      setBondDetailVisible(true);
    }
  }, [refreshSubContract]);

  const relatedListParams = useMemo(
    () => ({ sub_contract_id: subContractId!, pageSize: 1000 }),
    [subContractId],
  );

  const {
    data: paymentsRes,
    isLoading: paymentsLoading,
    isFetching: paymentsFetching,
  } = useQuery({
    ...fetchPaymentsQuery(relatedListParams),
    enabled: relatedEnabled,
  });
  const {
    data: invoicesRes,
    isLoading: invoicesLoading,
    isFetching: invoicesFetching,
  } = useQuery({
    ...fetchInvoiceInsQuery(relatedListParams),
    enabled: relatedEnabled,
  });
  const contractFilesEnabled = relatedEnabled && !!mainContractId;
  const {
    data: contractFiles = [],
    isError: contractFilesError,
    refetch: refetchContractFiles,
  } = useSubContractFiles(subContractId, mainContractId, contractFilesEnabled);

  const payments = useMemo(() => {
    const res = paymentsRes as API.PaymentList | undefined;
    return res?.data ?? [];
  }, [paymentsRes]);

  const invoices = useMemo(() => {
    const res = invoicesRes as API.InvoiceInList | undefined;
    return res?.data ?? [];
  }, [invoicesRes]);

  const paymentsTableLoading = relatedEnabled && (paymentsLoading || paymentsFetching);
  const invoicesTableLoading = relatedEnabled && (invoicesLoading || invoicesFetching);

  useEffect(() => {
    if (!relatedEnabled) {
      setSelectedPaymentKeys([]);
      setSelectedInvoiceKeys([]);
      return;
    }
    setSelectedPaymentKeys(payments.map((item) => item.id!));
    setSelectedInvoiceKeys(invoices.map((item) => item.id!));
  }, [relatedEnabled, subContractId, payments, invoices]);

  useEffect(() => {
    if (contractFilesError) {
      message.error(
        <span>
          加载合同附件失败{' '}
          <Button
            type="link"
            size="small"
            onClick={() => void refetchContractFiles()}
            style={{ padding: 0, height: 'auto' }}
          >
            重试
          </Button>
        </span>,
      );
    }
  }, [contractFilesError, message, refetchContractFiles]);

  // 使用 useMemo 缓存金额计算，避免每次渲染重复计算
  const paymentTotal = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0),
    [payments],
  );

  const invoiceTotal = useMemo(
    () => invoices.reduce((sum, i) => sum + Number(i.invoice_amount || 0), 0),
    [invoices],
  );

  // 计算百分比数据
  const baseAmount = useMemo(
    () => Number(displayRecord?.amount_settlement) || Number(displayRecord?.amount_contract) || 0,
    [displayRecord?.amount_settlement, displayRecord?.amount_contract],
  );

  const paymentPct = useMemo(
    () => calcProgressPct(paymentTotal, baseAmount),
    [paymentTotal, baseAmount],
  );

  const invoicePct = useMemo(
    () => calcProgressPct(invoiceTotal, baseAmount),
    [invoiceTotal, baseAmount],
  );

  const bondCount = displayRecord?.bonds?.length ?? 0;
  const pendingBondTypes = useMemo(
    () => (displayRecord ? getPendingBondTypes(displayRecord) : []),
    [displayRecord],
  );

  // 金额统计卡片数据
  const statCards = useMemo(
    () => [
      {
        label: '合同金额',
        value: Number(displayRecord?.amount_contract || 0),
        barColor: MODULE_COLORS.subContract.bg,
        textColor: MODULE_COLORS.subContract.color,
        pct: null as number | null,
      },
      {
        label: '结算金额',
        value: Number(displayRecord?.amount_settlement || 0),
        barColor: MODULE_COLORS.subContract.bg,
        textColor: MODULE_COLORS.subContract.color,
        pct: null as number | null,
      },
      {
        label: '付款总额',
        value: paymentTotal,
        barColor: MODULE_COLORS.payment.bg,
        textColor: MODULE_COLORS.payment.color,
        pct: paymentPct,
      },
      {
        label: '开票总额',
        value: invoiceTotal,
        barColor: MODULE_COLORS.invoiceIn.bg,
        textColor: MODULE_COLORS.invoiceIn.color,
        pct: invoicePct,
      },
    ],
    [
      displayRecord?.amount_contract,
      displayRecord?.amount_settlement,
      paymentTotal,
      invoiceTotal,
      paymentPct,
      invoicePct,
    ],
  );

  const contractTitle = formatRecordDetailTitle(
    displayRecord?.contract_name ?? currentRecord?.contract_name,
    '分包合同详情',
  );

  return (
    <>
    <Drawer
      title={
        <div>
          <FileTextOutlined
            style={{ marginRight: '8px', color: MODULE_COLORS.subContract.color }}
          />
          {contractTitle}
        </div>
      }
      open={visible}
      onClose={onCancel}
      width={RECORD_DETAIL_DRAWER_WIDTH}
      destroyOnClose
      styles={{ body: RECORD_DETAIL_DRAWER_BODY_STYLE }}
      footer={
        <div style={{ textAlign: 'right' }}>
          <Button onClick={onCancel}>关闭</Button>
        </div>
      }
    >
      <Spin spinning={basicDetailLoading}>
        {detailEnabled && displayRecord && (
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: (
                  <span>
                    <FileTextOutlined style={{ color: MODULE_COLORS.subContract.color }} />
                    基本信息
                  </span>
                ),
                children: (
                  <Row gutter={24}>
                    <Col span={16}>
                      <Card
                        variant="borderless"
                        style={RECORD_DETAIL_CARD_STYLE}
                      >
                        {/* 金额统计卡片 */}
                        <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
                          {statCards.map((card, idx) => (
                            <Col key={idx} xs={24} sm={12} xl={6}>
                              <AmountProgressStatCard
                                label={card.label}
                                value={card.value}
                                barColor={card.barColor}
                                textColor={card.textColor}
                                pct={card.pct}
                                labelFontSize={12}
                              />
                            </Col>
                          ))}
                        </Row>

                        <Descriptions
                          column={2}
                          bordered
                          styles={{
                            label: {
                              width: '100px',
                              padding: '12px 8px',
                              textAlign: 'center',
                            },
                            content: {
                              wordBreak: 'break-word',
                              padding: '12px 8px',
                            },
                          }}
                        >
                          <Descriptions.Item label="合同名称" span={2}>
                            <span style={{ marginRight: '10px' }}>
                              {displayRecord.contract_name}
                            </span>
                            <Tag color={getContractStatusColor(displayRecord.contract_status!)}>
                              {displayRecord.contract_status}
                            </Tag>
                            <Tag color={getContractTypeColor(displayRecord.contract_type!)}>
                              {displayRecord.contract_type}
                            </Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="总包合同" span={2}>
                            {displayRecord.mainContract?.contract_name || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="发包单位" span={1}>
                            {displayRecord.mainContract?.partyA?.company_name || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="承包单位" span={1}>
                            {displayRecord.partyB?.company_name || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="分包单位" span={1}>
                            {displayRecord.partyC?.company_name || '-'}
                          </Descriptions.Item>

                          <Descriptions.Item label="签约日期" span={1}>
                            {displayRecord.date_signed || '-'}
                          </Descriptions.Item>

                          <Descriptions.Item label="备注" span={2}>
                            <div
                              style={{
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {displayRecord.remarks || '-'}
                            </div>
                          </Descriptions.Item>
                          <Descriptions.Item label="创建人" span={1}>
                            {displayRecord.creator?.full_name || '-'}
                          </Descriptions.Item>
                          <Descriptions.Item label="创建时间" span={1}>
                            {displayRecord.created_at || '-'}
                          </Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>

                    <Col span={8}>
                      <AttachmentPanel
                        title="合同附件"
                        files={contractFiles}
                        onPreview={handleFilePreview}
                        iconColor={MODULE_COLORS.subContract.color}
                        fileIcon={<FileTextOutlined />}
                      />
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'payments',
                label: (
                  <span>
                    <DollarOutlined style={{ color: MODULE_COLORS.payment.color }} />
                    付款记录 ({payments.length})
                  </span>
                ),
                children: (
                  <PaymentTableCard
                    payments={payments}
                    selectedKeys={selectedPaymentKeys}
                    loading={paymentsTableLoading}
                    onSelectionChange={setSelectedPaymentKeys}
                  />
                ),
              },
              {
                key: 'bonds',
                label: (
                  <Tooltip
                    title={
                      pendingBondTypes.length > 0
                        ? `待登记：${pendingBondTypes.join('、')}`
                        : undefined
                    }
                  >
                    <Badge
                      dot={pendingBondTypes.length > 0}
                      color={UI_COLORS.actionWarning}
                      offset={[6, 0]}
                    >
                      <span>
                        <SafetyOutlined style={{ color: MODULE_COLORS.bond.color }} />
                        担保 ({bondCount})
                      </span>
                    </Badge>
                  </Tooltip>
                ),
                children: (
                  <SubContractBondDetailSection
                    contract={displayRecord}
                    onViewBond={handleViewBond}
                    onRegisterBond={handleRegisterBond}
                  />
                ),
              },
              {
                key: 'invoices',
                label: (
                  <span>
                    <FileDoneOutlined style={{ color: MODULE_COLORS.invoiceIn.color }} />
                    开票记录 ({invoices.length})
                  </span>
                ),
                children: (
                  <InvoiceInTableCard
                    invoices={invoices}
                    selectedKeys={selectedInvoiceKeys}
                    loading={invoicesTableLoading}
                    onSelectionChange={setSelectedInvoiceKeys}
                  />
                ),
              },
            ]}
          />
        )}
      </Spin>
    </Drawer>

      <FilePreviewArea
        previewVisible={previewVisible}
        previewFile={previewFile}
        onClose={handlePreviewClose}
      />

      <BondDetail
        visible={bondDetailVisible}
        currentRecord={currentBond}
        onCancel={handleBondDetailCancel}
        onRefund={refreshSubContract}
        drawerWidth={NESTED_RECORD_DETAIL_DRAWER_WIDTH}
      />
      <BondForm
        visible={bondFormVisible}
        createPreset={bondCreatePreset}
        onCancel={handleBondFormCancel}
        onSuccess={handleBondFormSuccess}
        onRegistered={handleBondRegistered}
        drawerWidth={NESTED_RECORD_DETAIL_DRAWER_WIDTH}
      />
    </>
  );
};

export default SubContractDetail;
