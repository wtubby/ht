import BusinessFileUploader from '@/components/BusinessFileUploader';
import { COLORS, UI_COLORS } from '@/constants/colors';
import { fetchBondQuery, useAddBond, useBondAmountRatio, useBondSelectOptions, useDrawerDetailQuery, useDrawerFormLifecycle, useUpdateBond } from '@/hooks';
import { getErrorMessage } from '@/utils/apiError';
import { selectApiDetail } from '@/utils/apiResponse';
import { amountFormatter, formatCurrency } from '@/utils/format';
import { RollbackOutlined } from '@ant-design/icons';
import {
  DrawerForm,
  ProFormDatePicker,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Col,
  Form,
  InputNumber,
  Row,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyBondDefaults,
  BOND_TYPE_OPTIONS,
  calcBondAmountByRatio,
  calcBondRatioPercent,
  canRefundBond,
  collectBondDeviationMessages,
  DEFAULT_RATIO_BY_TYPE,
  formatBondStatusLabel,
  getContractBaseAmount,
  hasBondAmountDeviation,
  showBondWarnings,
  validateBondDateEndAfterStart,
  type BondCreatePreset,
  type BondFormValue,
  type BondType,
} from './bond.shared';
import BondRefundModal from './BondRefundModal';

const { Text, Title } = Typography;

const selectBondDetail = (response: unknown) => selectApiDetail<API.Bond>(response);

const resolveMainContractId = (contract: API.SubContract | null | undefined): number | null =>
  contract?.main_contract_id ?? contract?.mainContract?.id ?? null;

const mergeSubContractIntoList = (list: API.SubContract[], record?: API.Bond) => {
  if (!record?.sub_contract_id || !record.subContract) {
    return list;
  }
  if (list.some((c) => c.id === record.sub_contract_id)) {
    return list;
  }
  const nested = record.subContract;
  return [
    {
      id: record.sub_contract_id,
      main_contract_id: nested.mainContract?.id ?? record.sub_contract_id,
      contract_name: nested.contract_name ?? '',
      contract_type: '专业分包',
      party_b_id: 0,
      party_c_id: nested.partyC?.id ?? 0,
      amount_contract: nested.amount_contract ?? 0,
      partyC: nested.partyC,
      mainContract: nested.mainContract,
    } as API.SubContract,
    ...list,
  ];
};

/** 编辑回填：日期转 dayjs，配合 setFieldsValue 避免 initialValues 未生效 */
const mapBondRowToFormValues = (row: API.Bond) => ({
  sub_contract_id: row.sub_contract_id,
  bond_type: row.bond_type,
  bond_form: row.bond_form,
  amount: row.amount != null ? Number(row.amount) : undefined,
  organization: row.organization ?? undefined,
  date_start: row.date_start ? dayjs(row.date_start) : undefined,
  date_end: row.date_end ? dayjs(row.date_end) : undefined,
  remarks: row.remarks ?? undefined,
});

interface BondFormProps {
  visible: boolean;
  currentRecord?: API.Bond;
  createPreset?: BondCreatePreset;
  onCancel: () => void;
  onSuccess: () => void;
  /** 新建登记成功时回调，供容器定位列表行 */
  onRegistered?: (bondId: number) => void;
  /** 嵌套打开时可传入较小宽度 */
  drawerWidth?: number;
}

const BondForm: React.FC<BondFormProps> = ({
  visible,
  currentRecord,
  createPreset,
  onCancel,
  onSuccess,
  onRegistered,
  drawerWidth = 1200,
}) => {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const addMutation = useAddBond();
  const updateMutation = useUpdateBond();
  const [subContracts, setSubContracts] = useState<API.SubContract[]>([]);
  const [contractAmount, setContractAmount] = useState<number>(0);
  const [selectedContract, setSelectedContract] = useState<API.SubContract | null>(null);
  const [bondId, setBondId] = useState<number | null>(null);
  const [selectedSubContractId, setSelectedSubContractId] = useState<number | null>(null);
  const [mainContractId, setMainContractId] = useState<number | null>(null);
  const [isSavingBond, setIsSavingBond] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateBlockMessage, setDuplicateBlockMessage] = useState<string | null>(null);
  const [canSaveBond, setCanSaveBond] = useState(false);
  const [detailRecord, setDetailRecord] = useState<API.Bond | undefined>();
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const presetAppliedRef = useRef(false);

  const effectiveId = currentRecord?.id ?? bondId ?? undefined;
  const isEditMode = !!effectiveId;
  const isCreateMode = !isEditMode;

  const watchedAmount = Form.useWatch('amount', form);
  const displayStatus = detailRecord?.display_status || detailRecord?.status || '担保中';
  const isNonGuaranteeStatus = !!detailRecord && displayStatus !== '担保中';
  const showRatioInput = contractAmount > 0 && !isNonGuaranteeStatus;

  const setBondAmount = useCallback((amount: number | undefined) => {
    form.setFieldsValue({ amount });
  }, [form]);

  const { ratio: selectedRatio, setRatio, resetRatio, handleRatioChange } = useBondAmountRatio({
    baseAmount: contractAmount,
    bondAmount: watchedAmount,
    active: showRatioInput,
    setBondAmount,
    clearAmountOnRatioClear: true,
  });

  const clearBondFormState = useCallback(() => {
    setDuplicateBlockMessage(null);
    setDetailRecord(undefined);
    setBondId(null);
    setSelectedSubContractId(null);
    setSelectedContract(null);
    setContractAmount(0);
    resetRatio();
    setMainContractId(null);
    setCanSaveBond(false);
    form.resetFields();
  }, [form, resetRatio]);

  const resetBusinessState = useCallback(() => {
    clearBondFormState();
    setIsSavingBond(false);
    setIsSubmitting(false);
    setRefundModalOpen(false);
  }, [clearBondFormState]);

  const handleCloseEdge = useCallback(() => {
    presetAppliedRef.current = false;
  }, []);

  const {
    hydratingRef,
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
    onReset: resetBusinessState,
    onOpenEdge: clearBondFormState,
    onCloseEdge: handleCloseEdge,
    recordId: currentRecord?.id,
    onRecordSwitch: clearBondFormState,
  });

  const needSelectOptions = visible && (isCreateMode || !!currentRecord?.id);
  const { data: selectOptionsData } = useBondSelectOptions(isCreateMode, needSelectOptions);

  const applySelectedSubContract = useCallback(
    (contract: API.SubContract | null, subContractId: number | null) => {
      setSelectedSubContractId(subContractId);
      if (contract) {
        setSelectedContract(contract);
        setContractAmount(getContractBaseAmount(contract));
        setMainContractId(resolveMainContractId(contract));
      } else {
        setSelectedContract(null);
        setContractAmount(0);
        setMainContractId(null);
      }
    },
    [],
  );

  const applyTypeDefaults = useCallback(
    (contract: API.SubContract | null, bondType: BondType, resetAmount = true) => {
      const result = applyBondDefaults(contract, bondType);
      if (result.blocked) {
        setDuplicateBlockMessage(result.blockMessage || null);
        return;
      }
      setDuplicateBlockMessage(null);

      const patch: Record<string, unknown> = {};
      if (result.bond_form) {
        patch.bond_form = result.bond_form;
      }
      if (resetAmount) {
        const base = getContractBaseAmount(contract);
        if (base > 0) {
          if (result.amount != null && result.amount > 0) {
            patch.amount = result.amount;
            setRatio(calcBondRatioPercent(result.amount, base));
          } else {
            const defaultRatio = DEFAULT_RATIO_BY_TYPE[bondType];
            patch.amount = calcBondAmountByRatio(base, defaultRatio);
            setRatio(defaultRatio);
          }
        } else {
          setRatio(null);
        }
      }
      if (Object.keys(patch).length > 0) {
        form.setFieldsValue(patch);
      }
    },
    [form, setRatio],
  );

  useEffect(() => {
    const list =
      (selectOptionsData as { data?: { subContracts?: API.SubContract[] } } | undefined)?.data
        ?.subContracts ?? [];
    setSubContracts(mergeSubContractIntoList(list, detailRecord));
  }, [selectOptionsData, detailRecord]);

  const applyBondDetail = useCallback(
    (data: API.Bond) => {
      setDetailRecord(data);
      setBondId(data.id ?? null);
      hydratingRef.current = true;
      try {
        form.setFieldsValue(mapBondRowToFormValues(data));
      } finally {
        hydratingRef.current = false;
      }
      markFormClean();

      if (data.sub_contract_id) {
        const contract = (data.subContract as API.SubContract | undefined) ?? null;
        applySelectedSubContract(contract, data.sub_contract_id);
      }
    },
    [form, applySelectedSubContract, markFormClean],
  );

  const detailId = visible ? effectiveId : undefined;

  const handleDetailError = useCallback(() => {
    message.error('获取担保详情失败');
  }, [message]);

  const { isLoading: detailLoading, refetchDetail } = useDrawerDetailQuery({
    visible,
    detailId,
    getQuery: fetchBondQuery,
    select: selectBondDetail,
    onDetail: applyBondDetail,
    onError: handleDetailError,
  });

  // 应用新建预设（依赖 subContracts 加载）
  useEffect(() => {
    if (!visible || currentRecord?.id) return;

    if (presetAppliedRef.current || !createPreset?.sub_contract_id || !subContracts.length) {
      return;
    }

    const contract = subContracts.find((c) => c.id === createPreset.sub_contract_id) ?? null;
    if (!contract) return;

    presetAppliedRef.current = true;
    const bondType = createPreset.bond_type || '履约保证金';
    hydratingRef.current = true;
    try {
      form.setFieldsValue({
        sub_contract_id: createPreset.sub_contract_id,
        bond_type: bondType,
        bond_form: '现金',
        status: '担保中',
      });
      applySelectedSubContract(contract, createPreset.sub_contract_id);
      applyTypeDefaults(contract, bondType);
    } finally {
      hydratingRef.current = false;
    }
    markFormClean();
  }, [
    visible,
    currentRecord?.id,
    subContracts,
    createPreset,
    form,
    applySelectedSubContract,
    applyTypeDefaults,
    markFormClean,
  ]);

  const handleSaveResponse = useCallback(
    (response: API.BondResponse | null) => {
      if (!response?.success) return null;
      showBondWarnings(response.warnings, message);
      return response;
    },
    [message],
  );

  const handleAdd = useCallback(
    async (fields: API.Bond) => {
      const hide = message.loading('正在保存担保');
      try {
        const response = (await addMutation.mutateAsync({
          ...fields,
          status: '担保中',
        })) as API.BondResponse;
        hide();
        return handleSaveResponse(response);
      } catch (error) {
        hide();
        message.error(getErrorMessage(error, '保存失败请重试！'));
        return null;
      }
    },
    [addMutation, handleSaveResponse, message],
  );

  const handleUpdate = useCallback(
    async (fields: API.Bond) => {
      const id = effectiveId;
      if (!id) return null;

      const hide = message.loading('正在更新担保');
      try {
        const { status, ...payload } = fields;
        void status;
        const response = (await updateMutation.mutateAsync({
          id,
          data: payload as API.Bond,
        })) as API.BondResponse;
        hide();
        return handleSaveResponse(response);
      } catch (error) {
        hide();
        message.error(getErrorMessage(error, '更新失败请重试！'));
        return null;
      }
    },
    [effectiveId, handleSaveResponse, message, updateMutation],
  );

  const confirmBondDeviationsIfNeeded = useCallback(
    async (values: API.Bond): Promise<boolean> => {
      if (isNonGuaranteeStatus) return true;
      const bondType = (values.bond_type as BondType) || '履约保证金';
      const deviationMessages = collectBondDeviationMessages(selectedContract, bondType, {
        amount: values.amount,
        bond_form: values.bond_form,
      });
      if (deviationMessages.length === 0) return true;

      return new Promise((resolve) => {
        modal.confirm({
          title: '与合同约定不一致',
          content: (
            <div>
              {deviationMessages.map((msg) => (
                <div key={msg} style={{ marginBottom: 8 }}>
                  {msg}
                </div>
              ))}
            </div>
          ),
          okText: '确认继续',
          cancelText: '返回修改',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
    },
    [isNonGuaranteeStatus, selectedContract, modal],
  );

  const prepareBondSubmit = useCallback(async (): Promise<API.Bond | null> => {
    if (duplicateBlockMessage) {
      message.warning(duplicateBlockMessage);
      return null;
    }
    let values: API.Bond;
    try {
      values = await form.validateFields();
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) return null;
      throw error;
    }
    if (!isActive()) return null;
    const confirmed = await confirmBondDeviationsIfNeeded(values);
    if (!confirmed || !isActive()) return null;
    return values;
  }, [confirmBondDeviationsIfNeeded, duplicateBlockMessage, form, isActive, message]);

  const subContractOptions = useMemo(
    () =>
      subContracts.map((contract) => {
        const pending = contract.pending_bond_types?.length
          ? ` · 待登记${contract.pending_bond_types.join('、')}`
          : '';
        return {
          label: `${contract.contract_name || ''}（${contract.partyC?.company_name || ''}）${pending}`,
          value: contract.id,
        };
      }),
    [subContracts],
  );

  const handleSaveBond = useCallback(async () => {
    try {
      const values = await prepareBondSubmit();
      if (!values) return;

      setIsSavingBond(true);
      const result = isEditMode ? await handleUpdate(values) : await handleAdd(values);
      if (!isActive()) return;

      if (result?.data?.id) {
        setSelectedSubContractId(values.sub_contract_id);
        applyBondDetail(result.data);
        message.success('保存成功，可继续上传附件');
      }
    } catch (error) {
      message.error(getErrorMessage(error, '保存失败请重试！'));
    } finally {
      runIfMounted(() => setIsSavingBond(false));
    }
  }, [
    applyBondDetail,
    handleAdd,
    handleUpdate,
    isActive,
    isEditMode,
    message,
    prepareBondSubmit,
    runIfMounted,
  ]);

  const handleFinalSubmit = useCallback(async () => {
    if (!effectiveId) {
      message.warning('请先保存担保信息');
      return;
    }
    try {
      const values = await prepareBondSubmit();
      if (!values) return;

      setIsSubmitting(true);

      if (isEditMode && (currentRecord?.id || detailRecord?.id)) {
        const result = await handleUpdate(values);
        if (!isActive()) return;
        if (result) {
          message.success('更新成功');
          notifySubmitSuccess(onSuccess);
        }
      } else if (bondId) {
        const hide = message.loading('正在提交');
        try {
          const { status, ...payload } = values;
          void status;
          const response = (await updateMutation.mutateAsync({
            id: bondId,
            data: { ...payload, status: '担保中' } as API.Bond,
          })) as API.BondResponse;
          hide();
          if (!isActive()) return;
          if (response?.success && response.data) {
            showBondWarnings(response.warnings, message);
            message.success('担保登记成功');
            if (response.data.id) {
              onRegistered?.(response.data.id);
            }
            notifySubmitSuccess(onSuccess);
          }
        } catch (error) {
          hide();
          runIfActive(() => message.error(getErrorMessage(error, '提交失败请重试！')));
        }
      }
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) return;
      message.error(getErrorMessage(error, '提交失败请重试！'));
    } finally {
      runIfMounted(() => setIsSubmitting(false));
    }
  }, [
    bondId,
    currentRecord?.id,
    detailRecord?.id,
    effectiveId,
    handleUpdate,
    isActive,
    isEditMode,
    message,
    notifySubmitSuccess,
    onRegistered,
    onSuccess,
    prepareBondSubmit,
    runIfActive,
    runIfMounted,
    updateMutation,
  ]);

  const handleContractChange = useCallback(
    (contractId: number) => {
      const contract = subContracts.find((c) => c.id === contractId) ?? null;
      applySelectedSubContract(contract, contractId);
      const bondType = (form.getFieldValue('bond_type') as BondType) || '履约保证金';
      applyTypeDefaults(contract, bondType);
    },
    [applySelectedSubContract, applyTypeDefaults, form, subContracts],
  );

  const handleBondTypeChange = useCallback(
    (bondType: BondType) => {
      applyTypeDefaults(selectedContract, bondType);
    },
    [applyTypeDefaults, selectedContract],
  );

  const handleValuesChange = useCallback(
    (_: Partial<API.Bond>, allValues: Partial<API.Bond>) => {
      markFormDirtyIfNotHydrating();
      const amount = Number(allValues.amount);
      setCanSaveBond(
        !!(
          allValues.sub_contract_id &&
          allValues.bond_type &&
          allValues.bond_form &&
          Number.isFinite(amount) &&
          amount > 0
        ),
      );
    },
    [markFormDirtyIfNotHydrating],
  );

  const watchedBondType = Form.useWatch('bond_type', form) as BondType | undefined;
  const watchedBondForm = Form.useWatch('bond_form', form) as BondFormValue | undefined;
  const activeBondType = watchedBondType || '履约保证金';
  const bondForm: BondFormValue = watchedBondForm || '现金';
  const plannedHint = selectedContract?.bond_registry?.[activeBondType];
  const showAmountDeviationHint =
    !isNonGuaranteeStatus &&
    hasBondAmountDeviation(plannedHint?.planned_amount ?? null, watchedAmount);

  return (
    <DrawerForm
      form={form}
      title={isEditMode ? '编辑担保记录' : '新建担保记录'}
      width={drawerWidth}
      open={visible}
      onOpenChange={(open) => {
        if (!open) attemptClose();
      }}
      initialValues={{
        bond_form: '现金',
        status: '担保中',
        bond_type: createPreset?.bond_type || '履约保证金',
        sub_contract_id: createPreset?.sub_contract_id,
      }}
      onFinish={handleFinalSubmit}
      drawerProps={{
        destroyOnClose: true,
        extra: canRefundBond(detailRecord) ? (
          <Button
            icon={<RollbackOutlined />}
            type="primary"
            size="small"
            onClick={() => setRefundModalOpen(true)}
          >
            退还保证金
          </Button>
        ) : undefined,
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
            loading={isEditMode ? isSubmitting : isSavingBond}
            disabled={!isEditMode && (!canSaveBond || !!duplicateBlockMessage)}
            onClick={isEditMode ? () => void form.submit() : () => void handleSaveBond()}
          >
            {isEditMode ? '提交' : canSaveBond ? '保存并继续' : '请填写必填项'}
          </Button>,
        ],
      }}
      layout="horizontal"
    >
      <Spin spinning={detailLoading}>
        <Row gutter={24}>
          <Col span={16}>
            <Title level={5} style={{ marginBottom: 16, color: COLORS.textSecondary }}>
              担保信息
            </Title>

            {duplicateBlockMessage && (
              <Alert
                type="warning"
                showIcon
                message={duplicateBlockMessage}
                style={{ marginBottom: 16 }}
              />
            )}

            <ProFormSelect
              name="sub_contract_id"
              label="分包合同"
              options={subContractOptions}
              rules={[{ required: true, message: '请选择分包合同' }]}
              placeholder={isCreateMode ? '请选择待登记的分包合同' : '请选择分包合同'}
              extra={
                isCreateMode ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    仅显示合同约定需缴纳保证金、且尚未建立台账的分包
                  </Text>
                ) : undefined
              }
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
              fieldProps={{
                showSearch: true,
                disabled: isEditMode,
                filterOption: (input, option) =>
                  String(option?.label ?? '')
                    .toLowerCase()
                    .includes(input.toLowerCase()),
                onChange: handleContractChange,
              }}
            />

            {selectedContract && (
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={12}>
                  <Form.Item label="分包单位" labelCol={{ span: 10 }} wrapperCol={{ span: 14 }}>
                    <div style={{ padding: '4px 0', fontSize: 14 }}>
                      {selectedContract.partyC?.company_name || '-'}
                    </div>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="合同金额" labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
                    <div
                      style={{
                        padding: '4px 0',
                        color: UI_COLORS.amountHighlight,
                        fontSize: 14,
                        fontWeight: 'bold',
                      }}
                    >
                      {formatCurrency(selectedContract.amount_contract || 0)}
                    </div>
                  </Form.Item>
                </Col>
              </Row>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <ProFormRadio.Group
                  name="bond_type"
                  label="担保类型"
                  options={BOND_TYPE_OPTIONS}
                  rules={[{ required: true, message: '请选择保证金类型' }]}
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                  fieldProps={{
                    optionType: 'button',
                    buttonStyle: 'solid',
                    disabled: isEditMode && isNonGuaranteeStatus,
                    onChange: (e) => handleBondTypeChange(e.target.value as BondType),
                  }}
                />
              </Col>
              <Col span={12}>
                <ProFormRadio.Group
                  name="bond_form"
                  label="担保形式"
                  options={[
                    { label: '现金', value: '现金' },
                    { label: '保函', value: '保函' },
                  ]}
                  rules={[{ required: true, message: '请选择保证金形式' }]}
                  labelCol={{ span: 8 }}
                  wrapperCol={{ span: 16 }}
                  fieldProps={{
                    optionType: 'button',
                    buttonStyle: 'solid',
                    onChange: () => {
                      if (isNonGuaranteeStatus) return;
                      form.setFieldsValue({
                        organization: undefined,
                        date_start: undefined,
                        date_end: undefined,
                      });
                    },
                    disabled: isNonGuaranteeStatus,
                  }}
                />
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="担保金额"
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                  required
                  extra={
                    showAmountDeviationHint && plannedHint?.planned_amount != null ? (
                      <Text type="warning" style={{ fontSize: 12 }}>
                        与合同约定金额 {formatCurrency(plannedHint.planned_amount)} 不一致
                      </Text>
                    ) : null
                  }
                  rules={[
                    { required: true, message: '请输入担保金额' },
                    {
                      validator: (_, value) => {
                        if (value == null || value === '') {
                          return Promise.reject(new Error('请输入担保金额'));
                        }
                        const num = Number(value);
                        if (!Number.isFinite(num) || num < 0) {
                          return Promise.reject(new Error('请输入有效金额'));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Space.Compact style={{ width: '100%' }}>
                    <Form.Item
                      name="amount"
                      noStyle
                      rules={[{ required: true, message: '请输入担保金额' }]}
                    >
                      <InputNumber<number>
                        min={0}
                        precision={2}
                        placeholder="默认取合同约定，可修改"
                        controls={false}
                        disabled={isNonGuaranteeStatus}
                        style={{ width: showRatioInput ? '60%' : '100%' }}
                        formatter={amountFormatter}
                        parser={(value) => {
                          const cleaned = String(value ?? '')
                            .replace(/,/g, '')
                            .trim();
                          if (!cleaned) return null as unknown as number;
                          const num = Number(cleaned);
                          return Number.isFinite(num) ? num : (null as unknown as number);
                        }}
                      />
                    </Form.Item>
                    {showRatioInput && (
                      <InputNumber
                        value={selectedRatio}
                        onChange={handleRatioChange}
                        min={0}
                        max={100}
                        step={1}
                        precision={0}
                        addonAfter="%"
                        style={{ width: '40%' }}
                      />
                    )}
                  </Space.Compact>
                </Form.Item>
              </Col>
              <Col span={12}>
                {isEditMode && detailRecord ? (
                  <Form.Item label="当前状态" labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}>
                    <Tag color={displayStatus === '担保中' ? 'success' : 'default'}>
                      {formatBondStatusLabel(bondForm, displayStatus)}
                    </Tag>
                    {canRefundBond(detailRecord) && (
                      <div style={{ fontSize: 12, color: COLORS.textTertiary, marginTop: 4 }}>
                        可点击右上角「退还保证金」
                      </div>
                    )}
                  </Form.Item>
                ) : (
                  <Form.Item name="status" hidden initialValue="担保中">
                    <input type="hidden" />
                  </Form.Item>
                )}
              </Col>
            </Row>

            {bondForm === '保函' && !isNonGuaranteeStatus && (
              <ProFormText
                name="organization"
                label="开立机构"
                placeholder="请输入开立机构（银行或保险公司）"
                labelCol={{ span: 5 }}
                wrapperCol={{ span: 19 }}
                rules={[
                  { required: true, message: '请填写开立机构' },
                  { max: 100, message: '开立机构不能超过100个字符' },
                ]}
              />
            )}

            <Row gutter={16}>
              <Col span={12}>
                <ProFormDatePicker
                  label={bondForm === '现金' ? '缴纳日期' : '生效日期'}
                  name="date_start"
                  labelCol={{ span: 10 }}
                  wrapperCol={{ span: 14 }}
                  dependencies={['date_end']}
                  rules={
                    isNonGuaranteeStatus
                      ? []
                      : [
                          {
                            validator: async (
                              _rule: unknown,
                              value: dayjs.Dayjs | null | undefined,
                            ) => {
                              const end = form.getFieldValue('date_end');
                              const err = validateBondDateEndAfterStart(end, value);
                              if (err) throw new Error(err);
                            },
                          },
                        ]
                  }
                  fieldProps={{
                    style: { width: '100%' },
                    disabled: isNonGuaranteeStatus,
                  }}
                />
              </Col>
              <Col span={12}>
                <ProFormDatePicker
                  label={bondForm === '现金' ? '预计退还' : '到期日期'}
                  name="date_end"
                  labelCol={{ span: 8 }}
                  wrapperCol={{ span: 16 }}
                  dependencies={['date_start']}
                  rules={
                    isNonGuaranteeStatus
                      ? []
                      : [
                          {
                            validator: async (
                              _rule: unknown,
                              value: dayjs.Dayjs | null | undefined,
                            ) => {
                              const start = form.getFieldValue('date_start');
                              const err = validateBondDateEndAfterStart(value, start);
                              if (err) throw new Error(err);
                            },
                          },
                        ]
                  }
                  fieldProps={{
                    style: { width: '100%' },
                    disabled: isNonGuaranteeStatus,
                  }}
                />
              </Col>
            </Row>

            <ProFormText
              name="remarks"
              label="备注"
              placeholder="请输入备注信息"
              labelCol={{ span: 5 }}
              wrapperCol={{ span: 19 }}
              fieldProps={{ disabled: isNonGuaranteeStatus }}
            />
          </Col>

          <Col span={8}>
            <div style={{ paddingLeft: 16, borderLeft: `1px solid ${COLORS.border}` }}>
              <Title level={5} style={{ marginBottom: 8, color: COLORS.textSecondary }}>
                担保附件
              </Title>
              <Tooltip title={!isEditMode ? '请先保存担保信息，保存成功后可上传附件' : undefined}>
                <div>
                  <BusinessFileUploader
                    moduleType="FB_BOND"
                    mainContractId={mainContractId ?? undefined}
                    subContractId={selectedSubContractId ?? undefined}
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

      <BondRefundModal
        open={refundModalOpen}
        bond={detailRecord}
        onClose={() => setRefundModalOpen(false)}
        onSuccess={() => {
          setRefundModalOpen(false);
          if (effectiveId) {
            void refetchDetail();
          }
        }}
      />
    </DrawerForm>
  );
};

export default BondForm;
