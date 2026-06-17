import BusinessFileUploader from '@/components/BusinessFileUploader';
import { COLORS } from '@/constants/colors';
import {
  fetchSubContractQuery,
  useAddSubContract,
  useDrawerDetailQuery,
  useDrawerFormLifecycle,
  useDrawerSaveSubmit,
  useSubContractSelectOptions,
  useUpdateSubContract,
} from '@/hooks';
import { getApiEntity, getSavedEntityId } from '@/utils/apiResponse';
import { amountFormatter, parseAmount, parseOptionalAmount } from '@/utils/format';
import { appendInactiveCompanyOption, appendMissingSelectOption } from '@/utils/selectOptions';
import {
  DrawerForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import type { FormInstance } from 'antd';
import { App, Button, Col, Row, Spin, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import SubContractBondFields from './SubContractBondFields';
import {
  isSubContractRequiredFilled,
  normalizeSubContractValues,
  subContractFieldRules,
  SUB_CONTRACT_REQUIRED_FIELDS,
} from './subContractForm.shared';

const { Title } = Typography;

const contractAmountFieldProps = {
  formatter: amountFormatter,
  parser: parseAmount,
};

const settlementAmountFieldProps = {
  formatter: amountFormatter,
  parser: parseOptionalAmount,
};

interface SubContractFormProps {
  visible: boolean;
  currentRecord?: API.SubContract;
  onCancel: () => void;
  onSuccess: () => void;
}

const selectSubContractDetail = (response: unknown) =>
  getApiEntity<API.SubContract>(response) ?? null;

const SubContractForm: React.FC<SubContractFormProps> = ({
  visible,
  currentRecord,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const formRef = useRef<FormInstance>();
  const addMutation = useAddSubContract();
  const updateMutation = useUpdateSubContract();
  const { data: selectOptionsData } = useSubContractSelectOptions();

  const [contractId, setContractId] = useState<number | null>(null);
  const [mainContractId, setMainContractId] = useState<number | null>(
    currentRecord?.main_contract_id ?? null,
  );
  const [detailRecord, setDetailRecord] = useState<API.SubContract | undefined>();
  const [canSubmit, setCanSubmit] = useState(false);

  const effectiveId = currentRecord?.id ?? contractId ?? null;
  const isEditMode = !!effectiveId;

  const resetFormState = useCallback(() => {
    setCanSubmit(false);
    setContractId(null);
    setMainContractId(null);
    setDetailRecord(undefined);
    formRef.current?.resetFields();
  }, []);

  const {
    hydratingRef,
    isActive,
    runIfMounted,
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
  });

  const mainContracts = selectOptionsData?.data?.mainContracts ?? [];
  const partyBCompanies = selectOptionsData?.data?.partyB ?? [];
  const partyCCompanies = selectOptionsData?.data?.partyC ?? [];

  const mainContractOptions = useMemo(() => {
    const options = mainContracts.map((contract) => ({
      label: `${contract.contract_name} (${contract.partyA?.company_name})`,
      value: contract.id!,
    }));
    return appendMissingSelectOption(
      options,
      detailRecord?.main_contract_id,
      detailRecord?.mainContract?.contract_name,
      '不在可选列表',
    );
  }, [mainContracts, detailRecord?.main_contract_id, detailRecord?.mainContract?.contract_name]);

  const partyBOptions = useMemo(() => {
    const options = partyBCompanies.map((company) => ({
      label: company.company_name,
      value: company.id!,
    }));
    return appendInactiveCompanyOption(options, detailRecord?.party_b_id, detailRecord?.partyB);
  }, [partyBCompanies, detailRecord?.party_b_id, detailRecord?.partyB]);

  const partyCOptions = useMemo(() => {
    const options = partyCCompanies.map((company) => ({
      label: company.company_name,
      value: company.id!,
    }));
    return appendInactiveCompanyOption(options, detailRecord?.party_c_id, detailRecord?.partyC);
  }, [partyCCompanies, detailRecord?.party_c_id, detailRecord?.partyC]);

  const applyDetail = useCallback(
    (data: API.SubContract) => {
      setContractId(data.id ?? null);
      setMainContractId(data.main_contract_id ?? null);
      setDetailRecord(data);
      hydratingRef.current = true;
      try {
        formRef.current?.resetFields();
        formRef.current?.setFieldsValue({
          ...data,
          bond_perf_req: !!data.bond_perf_req,
          bond_labor_req: !!data.bond_labor_req,
          date_signed: data.date_signed ? dayjs(data.date_signed) : undefined,
        });
      } finally {
        hydratingRef.current = false;
      }
      markFormClean();
    },
    [hydratingRef, markFormClean],
  );

  const detailId = visible ? (effectiveId ?? undefined) : undefined;

  const handleDetailError = useCallback(() => {
    message.error('获取分包合同详情失败');
  }, [message]);

  const { isLoading: detailLoading } = useDrawerDetailQuery({
    visible,
    detailId,
    getQuery: fetchSubContractQuery,
    select: selectSubContractDetail,
    onDetail: applyDetail,
    onError: handleDetailError,
  });

  const handleCreateSuccess = useCallback(
    ({ savedId, result, values }: { savedId: number; result: unknown; values: Record<string, unknown> }) => {
      setContractId(savedId);
      const savedContract = getApiEntity<API.SubContract>(result);
      setMainContractId(
        savedContract?.main_contract_id ?? (values.main_contract_id as number | undefined) ?? null,
      );
      if (savedContract) applyDetail(savedContract);
    },
    [applyDetail],
  );

  const getUpdateSuccessMessage = useCallback(
    () => (currentRecord?.id ? '合同更新成功' : '合同及附件保存成功'),
    [currentRecord?.id],
  );

  const { handleSubmit } = useDrawerSaveSubmit({
    formRef,
    effectiveId,
    isActive,
    runIfMounted,
    buildPayload: (values) => normalizeSubContractValues(values as API.SubContract),
    add: addMutation.mutateAsync,
    update: (id, data) => updateMutation.mutateAsync({ id, data }),
    getSavedId: getSavedEntityId,
    onCreateSuccess: handleCreateSuccess,
    notifySubmitSuccess,
    onSuccess,
    message,
    messages: {
      createLoading: '正在保存合同',
      updateLoading: '正在更新合同',
      continueSuccess: '保存成功，可继续上传附件',
      updateSuccess: '合同更新成功',
    },
    getUpdateSuccessMessage,
  });

  const handleValuesChange = (changedValues: Partial<API.SubContract>) => {
    markFormDirtyIfNotHydrating();
    const errors = formRef.current?.getFieldsError([...SUB_CONTRACT_REQUIRED_FIELDS]);
    const hasErrors = errors?.some((error) => error.errors.length > 0);
    const values = formRef.current?.getFieldsValue([...SUB_CONTRACT_REQUIRED_FIELDS]);
    setCanSubmit(isSubContractRequiredFilled(values) && !hasErrors);

    if ('main_contract_id' in changedValues) {
      setMainContractId(changedValues.main_contract_id ?? null);
    }

    if ('bond_perf_req' in changedValues && !changedValues.bond_perf_req) {
      formRef.current?.setFieldsValue({ bond_perf_amt: undefined, bond_perf_form: undefined });
    }
    if ('bond_labor_req' in changedValues && !changedValues.bond_labor_req) {
      formRef.current?.setFieldsValue({ bond_labor_amt: undefined, bond_labor_form: undefined });
    }
  };

  const isSaving = addMutation.isPending;
  const isUpdating = updateMutation.isPending;

  return (
    <DrawerForm
      formRef={formRef}
      title={isEditMode ? '编辑分包合同' : '新建分包合同'}
      width={1200}
      open={visible}
      onOpenChange={(vis) => {
        if (!vis) {
          attemptClose();
        }
      }}
      initialValues={{ contract_status: '未签约', bond_perf_req: false, bond_labor_req: false }}
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
          <Col span={16}>
            <div style={{ paddingRight: 16 }}>
              <Title level={5} style={{ marginBottom: 8, color: COLORS.textSecondary }}>
                合同信息
              </Title>

              <Row gutter={16} style={{ marginBottom: 8 }}>
                <Col span={24}>
                  <ProFormText
                    name="contract_name"
                    label="分包合同名称"
                    rules={subContractFieldRules.contract_name}
                    placeholder="请输入分包合同名称"
                    labelCol={{ span: 4 }}
                    wrapperCol={{ span: 20 }}
                  />
                </Col>
              </Row>

              <Row gutter={16} style={{ marginBottom: 8 }}>
                <Col span={24}>
                  <ProFormSelect
                    name="main_contract_id"
                    label="总包合同"
                    options={mainContractOptions}
                    rules={subContractFieldRules.main_contract_id}
                    placeholder="请选择总包合同"
                    labelCol={{ span: 4 }}
                    wrapperCol={{ span: 20 }}
                    fieldProps={{
                      showSearch: true,
                      filterOption: (input: string, option?: { label?: string }) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                    }}
                  />
                </Col>
              </Row>

              <Row gutter={16} style={{ marginBottom: 8 }}>
                <Col span={12}>
                  <ProFormRadio.Group
                    name="contract_type"
                    label="合同类型"
                    rules={subContractFieldRules.contract_type}
                    options={[
                      { label: '专业', value: '专业分包' },
                      { label: '劳务', value: '劳务分包' },
                      { label: '采购', value: '材料采购' },
                      { label: '其他', value: '其他服务' },
                    ]}
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    fieldProps={{
                      optionType: 'button',
                      buttonStyle: 'solid',
                      size: 'middle',
                    }}
                  />
                </Col>
                <Col span={12}>
                  <ProFormRadio.Group
                    name="contract_status"
                    label="合同状态"
                    options={[
                      { label: '未签', value: '未签约' },
                      { label: '执行', value: '执行中' },
                      { label: '完工', value: '已完工' },
                      { label: '完结', value: '已完结' },
                    ]}
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    fieldProps={{
                      optionType: 'button',
                      buttonStyle: 'solid',
                      size: 'middle',
                    }}
                  />
                </Col>
              </Row>

              <Row gutter={16} style={{ marginBottom: 8 }}>
                <Col span={12}>
                  <ProFormSelect
                    name="party_b_id"
                    label="承包单位"
                    options={partyBOptions}
                    rules={subContractFieldRules.party_b_id}
                    placeholder="请选择承包单位"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    fieldProps={{
                      showSearch: true,
                      filterOption: (input: string, option?: { label?: string }) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                    }}
                  />
                </Col>
                <Col span={12}>
                  <ProFormSelect
                    name="party_c_id"
                    label="分包单位"
                    options={partyCOptions}
                    rules={subContractFieldRules.party_c_id}
                    placeholder="请选择分包单位"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    fieldProps={{
                      showSearch: true,
                      filterOption: (input: string, option?: { label?: string }) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                    }}
                  />
                </Col>
              </Row>

              <Row gutter={16} style={{ marginBottom: 8 }}>
                <Col span={12}>
                  <ProFormDigit
                    label="合同金额"
                    name="amount_contract"
                    min={0}
                    precision={2}
                    rules={subContractFieldRules.amount_contract}
                    placeholder="请输入合同金额"
                    addonAfter="元"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    fieldProps={contractAmountFieldProps as Record<string, unknown>}
                  />
                </Col>
                <Col span={12}>
                  <ProFormDigit
                    label="结算金额"
                    name="amount_settlement"
                    min={0}
                    precision={2}
                    placeholder="请输入结算金额"
                    addonAfter="元"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    fieldProps={settlementAmountFieldProps as Record<string, unknown>}
                  />
                </Col>
              </Row>

              <Row gutter={16} style={{ marginBottom: 8 }}>
                <Col span={12}>
                  <ProFormDatePicker
                    label="签约日期"
                    name="date_signed"
                    placeholder="请选择签约日期"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                  />
                </Col>
              </Row>

              <ProFormTextArea
                label="备注"
                name="remarks"
                placeholder="请输入备注信息"
                labelCol={{ span: 4 }}
                wrapperCol={{ span: 20 }}
                fieldProps={{
                  rows: 3,
                  maxLength: 500,
                  showCount: true,
                }}
              />

              <SubContractBondFields />
            </div>
          </Col>

          <Col span={8}>
            <div style={{ paddingLeft: 16, borderLeft: `1px solid ${COLORS.border}` }}>
              <Title level={5} style={{ marginBottom: 8, color: COLORS.textSecondary }}>
                合同附件
              </Title>

              <Tooltip title={!isEditMode ? '请先保存合同信息，保存成功后可上传附件' : undefined}>
                <div>
                  <BusinessFileUploader
                    moduleType="FB_CONTRACT"
                    mainContractId={effectiveId ? (mainContractId ?? undefined) : undefined}
                    subContractId={effectiveId ?? undefined}
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

export default SubContractForm;
