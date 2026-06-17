import BusinessFileUploader from '@/components/BusinessFileUploader';
import PartyBankAccountFields from '@/components/PartyBankAccountFields';
import { COLORS } from '@/constants/colors';
import {
  fetchPaymentQuery,
  getEmptyPartyBankAccountFieldValues,
  useAddPayment,
  useDrawerDetailQuery,
  useDrawerFormLifecycle,
  useDrawerSaveSubmit,
  usePartyBankAccountAutoFill,
  usePaymentSelectOptions,
  useUpdatePayment,
} from '@/hooks';
import { getSavedEntityId, selectApiDetail } from '@/utils/apiResponse';
import { amountFormatter, formatCurrencyOrDash, parseAmount } from '@/utils/format';
import type { ProFormInstance } from '@ant-design/pro-components';
import {
  DrawerForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { App, Button, Col, Row, Spin, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cleanPaymentSubmitData,
  isPaymentRequiredFilled,
  paymentFieldRules,
} from './paymentForm.shared';

const { Title } = Typography;

interface PaymentFormProps {
  visible: boolean;
  currentRecord?: API.Payment;
  onCancel: () => void;
  onSuccess: () => void;
}

const selectPaymentDetail = (response: unknown) => selectApiDetail<API.Payment>(response);

const PaymentForm: React.FC<PaymentFormProps> = ({
  visible,
  currentRecord,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const addMutation = useAddPayment();
  const updateMutation = useUpdatePayment();
  const formRef = useRef<ProFormInstance>();
  const hydratingRef = useRef(false);
  const [subContracts, setSubContracts] = useState<API.SubContract[]>([]);
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [mainContractId, setMainContractId] = useState<number | null>(null);
  const [subContractId, setSubContractId] = useState<number | null>(
    currentRecord?.sub_contract_id ?? null,
  );
  const [canSubmit, setCanSubmit] = useState(false);

  const effectiveId = currentRecord?.id ?? paymentId ?? null;
  const isEditMode = !!effectiveId;

  const {
    setPartyCompanyId,
    bankAccounts: payeeBankAccounts,
    availableBankAccounts: availablePayeeBankAccounts,
    requestPartyBankAccounts,
    resetPartyBankAccounts,
  } = usePartyBankAccountAutoFill({
    visible,
    formRef,
    hydratingRef,
  });

  const resetFormState = useCallback(() => {
    resetPartyBankAccounts();
    setPaymentId(null);
    setMainContractId(null);
    setSubContractId(null);
    setCanSubmit(false);
    formRef.current?.resetFields();
  }, [resetPartyBankAccounts]);

  const {
    isActive,
    runIfMounted,
    runIfActive,
    markFormClean,
    markFormDirtyIfNotHydrating,
    markFilesDirty,
    attemptClose,
    notifySubmitSuccess,
  } = useDrawerFormLifecycle({
    visible,
    onCancel,
    onReset: resetFormState,
    onOpenEdge: resetFormState,
    recordId: currentRecord?.id,
    onRecordSwitch: resetFormState,
    hydratingRef,
  });

  const { data: selectOptionsData, isFetching } = usePaymentSelectOptions();

  useEffect(() => {
    if (!selectOptionsData?.data) return;
    let contracts = selectOptionsData.data.subContracts || [];
    if (currentRecord?.subContract && currentRecord.sub_contract_id) {
      const exists = contracts.some((c) => c.id === currentRecord.sub_contract_id);
      if (!exists) {
        contracts = [...contracts, currentRecord.subContract as API.SubContract];
      }
    }
    setSubContracts(contracts);
  }, [selectOptionsData, currentRecord]);

  const subContractOptions = useMemo(
    () =>
      subContracts.map((contract) => {
        const subContractCompanyName = contract.partyC?.company_name || '-';
        const amountText = formatCurrencyOrDash(contract.amount_contract);
        const label = `${contract.contract_name} (${contract.contract_type})`;

        return {
          label,
          value: contract.id,
          extra: contract,
          subContractCompanyName,
          amountText,
          searchText: [label, subContractCompanyName, amountText].join(' '),
        };
      }),
    [subContracts],
  );

  const applyDetail = useCallback(
    (data: API.Payment) => {
      const mainId = data.subContract?.mainContract?.id;
      if (mainId) setMainContractId(mainId);
      setSubContractId(data.sub_contract_id ?? null);

      hydratingRef.current = true;
      try {
        formRef.current?.resetFields();
        formRef.current?.setFieldsValue({
          ...data,
          payment_date: data.payment_date ? dayjs(data.payment_date) : null,
          contract_amount: data.subContract?.amount_contract || undefined,
        });
      } finally {
        hydratingRef.current = false;
      }
      markFormClean();
      setPartyCompanyId(data.subContract?.partyC?.id ?? null);
    },
    [hydratingRef, markFormClean, setPartyCompanyId],
  );

  const detailId = visible ? (effectiveId ?? undefined) : undefined;

  const handleDetailError = useCallback(() => {
    message.error('获取付款详情失败');
  }, [message]);

  const { isLoading: detailLoading } = useDrawerDetailQuery({
    visible,
    detailId,
    getQuery: fetchPaymentQuery,
    select: selectPaymentDetail,
    onDetail: applyDetail,
    onError: handleDetailError,
  });

  const handleCreateSuccess = useCallback(
    ({ savedId }: { savedId: number }) => {
      setPaymentId(savedId);
      markFormClean();
    },
    [markFormClean],
  );

  const { handleSubmit } = useDrawerSaveSubmit({
    formRef,
    effectiveId,
    isActive,
    runIfMounted,
    buildPayload: cleanPaymentSubmitData,
    add: addMutation.mutateAsync,
    update: (id, data) => updateMutation.mutateAsync({ id, data }),
    getSavedId: getSavedEntityId,
    onCreateSuccess: handleCreateSuccess,
    notifySubmitSuccess,
    onSuccess,
    message,
    messages: {
      createLoading: '正在保存付款记录',
      updateLoading: '正在更新付款记录',
      continueSuccess: '保存成功，可继续上传附件',
      updateSuccess: '更新成功',
    },
  });

  const handleValuesChange = (_: Partial<API.Payment>, allValues: Partial<API.Payment>) => {
    markFormDirtyIfNotHydrating();
    setCanSubmit(isPaymentRequiredFilled(allValues));
  };

  const isSaving = addMutation.isPending;
  const isUpdating = updateMutation.isPending;

  return (
    <DrawerForm
      formRef={formRef}
      title={isEditMode ? '编辑付款记录' : '新建付款记录'}
      width={1200}
      open={visible}
      loading={isFetching}
      onOpenChange={(vis) => {
        if (!vis) {
          attemptClose();
        }
      }}
      onValuesChange={handleValuesChange}
      submitter={{
        render: () => [
          <Button key="cancel" onClick={attemptClose}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isEditMode ? isUpdating : isSaving}
            disabled={!isEditMode && !canSubmit}
            onClick={() => void handleSubmit()}
          >
            {isEditMode ? '提交' : canSubmit ? '保存并继续' : '请填写必填项'}
          </Button>,
        ],
      }}
      drawerProps={{
        destroyOnClose: true,
      }}
      layout="horizontal"
    >
      <Spin spinning={detailLoading}>
      <Row gutter={24}>
        {/* 左侧表单区域 */}
        <Col span={16}>
          <div style={{ paddingRight: 16 }}>
            <Title level={5} style={{ marginBottom: 8, color: COLORS.textSecondary }}>
              付款信息
            </Title>

            {/* 第一行:分包合同选择 */}
            <ProFormSelect
              name="sub_contract_id"
              label="分包合同"
              options={subContractOptions}
              rules={paymentFieldRules.sub_contract_id}
              placeholder="请选择分包合同"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
              fieldProps={{
                showSearch: true,
                filterOption: (input: string, option: any) =>
                  String(option?.searchText ?? option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase()),
                optionRender: (option: any) => {
                  const data = option.data ?? option;
                  return (
                    <div style={{ padding: '4px 0' }}>
                      <div
                        style={{
                          color: COLORS.text,
                          fontWeight: 500,
                          lineHeight: '22px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {data.label}
                      </div>
                      <div
                        style={{
                          color: COLORS.textTertiary,
                          display: 'flex',
                          flexWrap: 'wrap',
                          fontSize: 12,
                          gap: '4px 12px',
                          lineHeight: '20px',
                        }}
                      >
                        <span>签约单位：{data.subContractCompanyName}</span>
                        <span>合同金额：{data.amountText}</span>
                      </div>
                    </div>
                  );
                },
                onChange: async (value: number, option: any) => {
                  if (option && option.extra) {
                    const contract = option.extra;
                    if (contract.main_contract_id) {
                      setMainContractId(contract.main_contract_id);
                    }
                    setSubContractId(value);

                    const payerName = contract.partyB?.company_name || '';
                    const payeeName = contract.partyC?.company_name || '';
                    const contractAmount = contract.amount_contract || '';

                    runIfActive(() => {
                      formRef.current?.setFieldsValue({
                        payer_name: payerName,
                        payee_name: payeeName,
                        contract_amount: contractAmount,
                      });
                    });

                    if (contract.partyC?.id) {
                      requestPartyBankAccounts(contract.partyC.id, true);
                    } else {
                      resetPartyBankAccounts();
                    }
                  } else {
                    // 当清空选择时重置对应字段
                    setMainContractId(null);
                    setSubContractId(null);
                    resetPartyBankAccounts();
                    runIfActive(() => {
                      formRef.current?.setFieldsValue({
                        payer_name: undefined,
                        payee_name: undefined,
                        contract_amount: undefined,
                        ...getEmptyPartyBankAccountFieldValues(),
                      });
                    });
                  }
                },
              }}
            />

            {/* 第二行：付款日期 */}
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col span={12}>
                <ProFormDatePicker
                  label="付款日期"
                  name="payment_date"
                  rules={paymentFieldRules.payment_date}
                  placeholder="请选择付款日期"
                  fieldProps={{ style: { width: '100%' } }}
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                />
              </Col>
            </Row>

            {/* 第三行：合同金额 + 付款金额 */}
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col span={12}>
                <ProFormDigit
                  label="合同金额"
                  name="contract_amount"
                  min={0}
                  precision={2}
                  placeholder="从分包合同自动填充"
                  addonAfter="元"
                  disabled
                  fieldProps={{
                    formatter: amountFormatter,
                    parser: parseAmount,
                  }}
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                />
              </Col>
              <Col span={12}>
                <ProFormDigit
                  label="付款金额"
                  name="payment_amount"
                  min={0}
                  precision={2}
                  rules={paymentFieldRules.payment_amount}
                  placeholder="请输入付款金额"
                  addonAfter="元"
                  fieldProps={{
                    formatter: amountFormatter,
                    parser: parseAmount,
                  }}
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                />
              </Col>
            </Row>

            {/* 第四行：付款方 + 收款方 */}
            <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col span={12}>
                <ProFormText
                  name="payer_name"
                  label="付款方"
                  rules={paymentFieldRules.payer_name}
                  placeholder="请输入付款方名称"
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                />
              </Col>
              <Col span={12}>
                <ProFormText
                  name="payee_name"
                  label="收款方"
                  rules={paymentFieldRules.payee_name}
                  placeholder="请输入收款方名称"
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                />
              </Col>
            </Row>

            <PartyBankAccountFields
              formRef={formRef}
              availableAccounts={availablePayeeBankAccounts}
              allAccounts={payeeBankAccounts}
              accountRules={paymentFieldRules}
              selectLabelCol={{ span: 5 }}
              selectWrapperCol={{ span: 19 }}
              bankNameLabelCol={{ span: 5 }}
              bankNameWrapperCol={{ span: 19 }}
            />

            {/* 第六行：备注 */}
            <ProFormTextArea
              label="备注"
              name="remarks"
              placeholder="请输入备注信息"
              rules={paymentFieldRules.remarks}
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
              fieldProps={{
                rows: 4,
                maxLength: 500,
                showCount: true,
              }}
            />
          </div>
        </Col>

        {/* 右侧上传区域 */}
        <Col span={8}>
          <div
            style={{ paddingLeft: 16, borderLeft: `1px solid ${COLORS.border}`, height: '100%' }}
          >
            <Title level={5} style={{ marginBottom: 8, color: COLORS.textSecondary }}>
              付款附件
            </Title>
            <Tooltip title={!isEditMode ? '请先保存付款信息，保存成功后可上传附件' : undefined}>
              <div>
                <BusinessFileUploader
                  moduleType="FB_PAYMENT"
                  mainContractId={mainContractId ?? undefined}
                  subContractId={subContractId ?? undefined}
                  recordId={effectiveId ?? undefined}
                  disabled={!isEditMode}
                  onFilesChanged={markFilesDirty}
                />
              </div>
            </Tooltip>
          </div>
        </Col>
      </Row>
      </Spin>
    </DrawerForm>
  );
};

export default PaymentForm;
