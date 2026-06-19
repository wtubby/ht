import BusinessFileUploader from '@/components/BusinessFileUploader';
import PartyBankAccountFields from '@/components/PartyBankAccountFields';
import { COLORS } from '@/constants/colors';
import { RECEIVE_STATUS_DEFAULT, RECEIVE_STATUS_OPTIONS } from '@/constants/statusColors';
import {
  fetchReceiveQuery,
  getEmptyPartyBankAccountFieldValues,
  useAddReceive,
  useDrawerDetailQuery,
  useDrawerFormLifecycle,
  useDrawerSaveSubmit,
  usePartyBankAccountAutoFill,
  useReceiveSelectOptions,
  useUpdateReceive,
} from '@/hooks';
import { getSavedEntityId, selectApiDetail } from '@/utils/apiResponse';
import { amountFormatter, formatAmountOrDash, parseAmount } from '@/utils/format';
import type { ProFormInstance } from '@ant-design/pro-components';
import {
  DrawerForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { App, Button, Col, Form, Row, Spin, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  cleanReceiveSubmitData,
  isReceiveRequiredFilled,
  receiveFieldRules,
} from './receiveForm.shared';

const { Title, Text } = Typography;

interface ReceiveFormProps {
  visible: boolean;
  currentRecord?: API.Receive;
  onCancel: () => void;
  onSuccess: () => void;
}

interface ContractOption {
  label: string;
  value: number;
  extra: API.MainContract;
}

const selectReceiveDetail = (response: unknown) => selectApiDetail<API.Receive>(response);

interface PartySnapshotFieldsProps {
  selectedContract: API.MainContract | null;
}

const PartySnapshotFields: React.FC<PartySnapshotFieldsProps> = ({ selectedContract }) => {
  const payerName = (Form.useWatch('payer_name') as string | undefined) ?? '';
  const payeeName = (Form.useWatch('payee_name') as string | undefined) ?? '';
  const currentPartyA = selectedContract?.partyA?.company_name?.trim() ?? '';
  const currentPartyB = selectedContract?.partyB?.company_name?.trim() ?? '';

  const payerOutdated =
    !!currentPartyA && !!payerName.trim() && payerName.trim() !== currentPartyA;
  const payeeOutdated =
    !!currentPartyB && !!payeeName.trim() && payeeName.trim() !== currentPartyB;

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          label="发包单位"
          labelCol={{ span: 10 }}
          wrapperCol={{ span: 14 }}
          extra={
            payerOutdated ? (
              <Text type="warning" style={{ fontSize: 12 }}>
               已更名「{currentPartyA}」
              </Text>
            ) : null
          }
        >
          {payerName || '-'}
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          label="承包单位"
          labelCol={{ span: 10 }}
          wrapperCol={{ span: 14 }}
          extra={
            payeeOutdated ? (
              <Text type="warning" style={{ fontSize: 12 }}>
                当前合同承包单位为「{currentPartyB}」
              </Text>
            ) : null
          }
        >
          {payeeName || '-'}
        </Form.Item>
      </Col>
    </Row>
  );
};

const ReceiveForm: React.FC<ReceiveFormProps> = ({
  visible,
  currentRecord,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const addMutation = useAddReceive();
  const updateMutation = useUpdateReceive();
  const formRef = useRef<ProFormInstance>();
  const hydratingRef = useRef(false);
  const [mainContracts, setMainContracts] = useState<API.MainContract[]>([]);
  const [receiveId, setReceiveId] = useState<number | null>(null);
  const [selectedMainContractId, setSelectedMainContractId] = useState<number | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  const effectiveId = currentRecord?.id ?? receiveId ?? null;
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
    setReceiveId(null);
    setSelectedMainContractId(null);
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

  const { data: selectOptionsData, isFetching: loadingOptions } = useReceiveSelectOptions();
  const currentMainContractId = currentRecord?.main_contract_id;
  const currentMainContract = currentRecord?.mainContract;

  useEffect(() => {
    if (!selectOptionsData?.data) return;

    let contracts = selectOptionsData.data.mainContracts || [];

    if (currentMainContractId && currentMainContract) {
      const exists = contracts.some((c) => c.id === currentMainContractId);
      if (!exists) {
        contracts = [...contracts, currentMainContract as API.MainContract];
      }
    }

    setMainContracts(contracts);
  }, [selectOptionsData, currentMainContractId, currentMainContract]);

  const mainContractOptions = useMemo(
    () =>
      mainContracts
        .filter((c): c is API.MainContract & { id: number } => c.id != null)
        .map(
          (c) =>
            ({
              label: `${c.contract_name} (${c.contract_status})`,
              value: c.id,
              extra: c,
            }) satisfies ContractOption,
        ),
    [mainContracts],
  );

  const selectedContract = useMemo(() => {
    if (selectedMainContractId == null) return null;
    return mainContracts.find((c) => c.id === selectedMainContractId) ?? null;
  }, [selectedMainContractId, mainContracts]);

  const displayContractAmount = selectedContract?.amount_contract;

  const applyDetail = useCallback(
    (data: API.Receive) => {
      setReceiveId(data.id ?? null);
      setSelectedMainContractId(data.main_contract_id ?? null);
      setCanSubmit(isReceiveRequiredFilled(data));
      hydratingRef.current = true;
      try {
        formRef.current?.resetFields();
        formRef.current?.setFieldsValue({
          ...data,
          payee_name: data.payee_name ?? data.mainContract?.partyB?.company_name ?? '',
          receive_date: data.receive_date ? dayjs(data.receive_date) : null,
        });
      } finally {
        hydratingRef.current = false;
      }
      markFormClean();
      setPartyCompanyId(data.mainContract?.partyB?.id ?? null);
    },
    [hydratingRef, markFormClean, setPartyCompanyId],
  );

  const detailId = visible ? (effectiveId ?? undefined) : undefined;

  const handleDetailError = useCallback(() => {
    message.error('获取收款详情失败');
  }, [message]);

  const { isLoading: detailLoading } = useDrawerDetailQuery({
    visible,
    detailId,
    getQuery: fetchReceiveQuery,
    select: selectReceiveDetail,
    onDetail: applyDetail,
    onError: handleDetailError,
  });

  const handleCreateSuccess = useCallback(
    ({ savedId, values }: { savedId: number; values: Record<string, unknown> }) => {
      setReceiveId(savedId);
      setSelectedMainContractId((values.main_contract_id as number | undefined) ?? null);
      markFormClean();
    },
    [markFormClean],
  );

  const { handleSubmit } = useDrawerSaveSubmit({
    formRef,
    effectiveId,
    isActive,
    runIfMounted,
    buildPayload: (values) =>
      cleanReceiveSubmitData(values as Partial<API.Receive> & Record<string, unknown>),
    add: addMutation.mutateAsync,
    update: (id, data) => updateMutation.mutateAsync({ id, data }),
    getSavedId: getSavedEntityId,
    onCreateSuccess: handleCreateSuccess,
    notifySubmitSuccess,
    onSuccess,
    message,
    messages: {
      createLoading: '正在保存收款记录',
      updateLoading: '正在更新收款记录',
      continueSuccess: '保存成功，可继续上传附件',
      updateSuccess: '保存成功',
    },
  });

  const handleValuesChange = (
    _changedValues: Partial<API.Receive>,
    allValues: Partial<API.Receive>,
  ) => {
    markFormDirtyIfNotHydrating();
    setCanSubmit(isReceiveRequiredFilled(allValues));
  };

  const handleMainContractChange = useCallback(
    (value: number | undefined, option?: ContractOption | ContractOption[]) => {
      if (!value || !option || Array.isArray(option) || !option.extra) {
        setSelectedMainContractId(null);
        resetPartyBankAccounts();
        runIfActive(() => {
          formRef.current?.setFieldsValue({
            payer_name: undefined,
            payee_name: undefined,
            ...getEmptyPartyBankAccountFieldValues(),
          });
        });
        return;
      }

      const contract = option.extra;
      const payerName = contract.partyA?.company_name || '';
      const payeeName = contract.partyB?.company_name || '';

      setSelectedMainContractId(value);

      runIfActive(() => {
        formRef.current?.setFieldsValue({
          payer_name: payerName,
          payee_name: payeeName,
        });
      });

      if (contract.partyB?.id) {
        requestPartyBankAccounts(contract.partyB.id, true);
      } else {
        resetPartyBankAccounts();
      }
    },
    [runIfActive, requestPartyBankAccounts, resetPartyBankAccounts],
  );

  const isSaving = addMutation.isPending;
  const isUpdating = updateMutation.isPending;

  return (
    <DrawerForm
      formRef={formRef}
      title={isEditMode ? '编辑收款记录' : '新建收款记录'}
      width={1200}
      open={visible}
      loading={loadingOptions}
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
      labelCol={{ span: 5 }}
      wrapperCol={{ span: 19 }}
    >
      <Spin spinning={detailLoading}>
      <Row gutter={24}>
        <Col span={16}>
          <div style={{ paddingRight: 16 }}>
            <Title level={5} style={{ marginBottom: 8, color: COLORS.textSecondary }}>
              收款信息
            </Title>
            <Row gutter={16}>
              <Col span={12}>
                <ProFormDatePicker
                  label="收款日期"
                  name="receive_date"
                  rules={receiveFieldRules.receive_date}
                  placeholder="请选择收款日期"
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                  fieldProps={{ style: { width: '100%' } }}
                />
              </Col>
              <Col span={12}>
                <ProFormSelect
                  name="receive_status"
                  label="收款状态"
                  options={[...RECEIVE_STATUS_OPTIONS]}
                  rules={receiveFieldRules.receive_status}
                  placeholder="请选择收款状态"
                  initialValue={RECEIVE_STATUS_DEFAULT}
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                />
              </Col>
            </Row>
            <ProFormSelect
              name="main_contract_id"
              label="总包合同"
              options={mainContractOptions}
              rules={receiveFieldRules.main_contract_id}
              placeholder="请选择总包合同"
              fieldProps={{
                showSearch: true,
                allowClear: true,
                filterOption: (input: string, option?: ContractOption) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                onChange: handleMainContractChange,
              }}
            />

            <PartySnapshotFields selectedContract={selectedContract} />

            <ProFormText
              name="payer_name"
              hidden
              rules={receiveFieldRules.payer_name}
            />
            <ProFormText
              name="payee_name"
              hidden
              rules={receiveFieldRules.payee_name}
            />

            <Row gutter={16}>
              <Col span={12}>
                <ProFormDigit
                  label="收款金额"
                  name="receive_amount"
                  min={0}
                  precision={2}
                  rules={receiveFieldRules.receive_amount}
                  placeholder="请输入收款金额"
                  addonAfter="元"
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                  fieldProps={{
                    formatter: amountFormatter,
                    parser: parseAmount,
                  }}
                />
              </Col>
              <Col span={12}>
                <Form.Item label="合同金额" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
                  {displayContractAmount != null
                    ? `${formatAmountOrDash(displayContractAmount)} 元`
                    : '-'}
                </Form.Item>
              </Col>
            </Row>

            <PartyBankAccountFields
              formRef={formRef}
              availableAccounts={availablePayeeBankAccounts}
              allAccounts={payeeBankAccounts}
              accountRules={receiveFieldRules}
            />

            <ProFormTextArea
              label="备注"
              name="remarks"
              placeholder="请输入备注信息"
              rules={receiveFieldRules.remarks}
              fieldProps={{
                rows: 3,
                maxLength: 500,
                showCount: true,
              }}
            />
          </div>
        </Col>

        <Col span={8}>
          <div style={{ paddingLeft: 16, borderLeft: `1px solid ${COLORS.border}` }}>
            <Title level={5} style={{ marginBottom: 8, color: COLORS.textSecondary }}>
              收款附件
            </Title>
            <Tooltip title={!isEditMode ? '请先保存收款信息，保存成功后可上传附件' : undefined}>
              <div>
                <BusinessFileUploader
                  moduleType="ZB_RECEIVE"
                  mainContractId={selectedMainContractId ?? undefined}
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

export default ReceiveForm;
