import BusinessFileUploader from '@/components/BusinessFileUploader';
import { COLORS } from '@/constants/colors';
import { getContractStatusColor } from '@/constants/statusColors';
import {
  fetchMainContractQuery,
  useAddMainContract,
  useCompaniesForSelect,
  useDrawerDetailQuery,
  useDrawerFormLifecycle,
  useDrawerSaveSubmit,
  useUpdateMainContract,
} from '@/hooks';
import { getApiEntity, getSavedEntityId } from '@/utils/apiResponse';
import {
  formatMainContractDateValue,
  resolveMainContractStatus,
} from '@/utils/mainContractStatus';
import { amountFormatter, parseAmount, parseOptionalAmount } from '@/utils/format';
import { appendInactiveCompanyOption } from '@/utils/selectOptions';
import {
  DrawerForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import type { FormInstance } from 'antd';
import { App, Button, Col, Form, Row, Spin, Tag, Tooltip, Typography } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';
import dayjs from 'dayjs';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  isMainContractRequiredFilled,
  mainContractFieldRules,
  MAIN_CONTRACT_REQUIRED_FIELDS,
  normalizeMainContractValues,
} from './mainContractForm.shared';

const { Title, Text } = Typography;

// 合同金额（必填）
const contractAmountFieldProps = {
  formatter: amountFormatter,
  parser: parseAmount,
};

// 结算金额（可选，清空时不写入 0）
const settlementAmountFieldProps = {
  formatter: amountFormatter,
  parser: parseOptionalAmount,
};

interface MainContractFormProps {
  visible: boolean;
  currentRecord?: API.MainContract;
  onCancel: () => void;
  onSuccess: () => void;
}

const selectMainContractDetail = (response: unknown) =>
  getApiEntity<API.MainContract>(response) ?? null;

const MainContractForm: React.FC<MainContractFormProps> = ({
  visible,
  currentRecord,
  onCancel,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const formRef = useRef<FormInstance>();
  const addMutation = useAddMainContract();
  const updateMutation = useUpdateMainContract();

  const [contractId, setContractId] = useState<number | null>(null);
  const [detailRecord, setDetailRecord] = useState<API.MainContract | undefined>();
  const [canSubmit, setCanSubmit] = useState(false);

  const effectiveId = currentRecord?.id ?? contractId ?? null;
  const isEditMode = !!effectiveId;

  const resetFormState = useCallback(() => {
    setCanSubmit(false);
    setContractId(null);
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

  const { data: companiesData } = useCompaniesForSelect();
  const partyACompanies = companiesData?.data?.partyA ?? [];
  const partyBCompanies = companiesData?.data?.partyB ?? [];

  const applyDetail = useCallback(
    (data: API.MainContract) => {
      setContractId(data.id ?? null);
      setDetailRecord(data);
      hydratingRef.current = true;
      try {
        formRef.current?.resetFields();
        formRef.current?.setFieldsValue({
          ...data,
          date_signed: data.date_signed ? dayjs(data.date_signed) : undefined,
          date_start: data.date_start ? dayjs(data.date_start) : undefined,
          date_end: data.date_end ? dayjs(data.date_end) : undefined,
          date_warranty: data.date_warranty ? dayjs(data.date_warranty) : undefined,
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
    message.error('获取合同详情失败');
  }, [message]);

  const { isLoading: detailLoading } = useDrawerDetailQuery({
    visible,
    detailId,
    getQuery: fetchMainContractQuery,
    select: selectMainContractDetail,
    onDetail: applyDetail,
    onError: handleDetailError,
  });

  const handleCreateSuccess = useCallback(
    ({ savedId, result }: { savedId: number; result: unknown }) => {
      setContractId(savedId);
      const savedContract = getApiEntity<API.MainContract>(result);
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
    buildPayload: (values) => normalizeMainContractValues(values as API.MainContract),
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

  const handleValuesChange = () => {
    markFormDirtyIfNotHydrating();
    const form = formRef.current;
    if (!form) return;

    const fields = [...MAIN_CONTRACT_REQUIRED_FIELDS];
    const hasErrors = form.getFieldsError(fields).some((error) => error.errors.length > 0);
    const values = form.getFieldsValue(fields);
    setCanSubmit(isMainContractRequiredFilled(values) && !hasErrors);
  };

  const isSaving = addMutation.isPending;
  const isUpdating = updateMutation.isPending;

  const partyAOptions = useMemo(() => {
    const options = partyACompanies.map((company) => ({
      label: company.company_name,
      value: company.id!,
    }));
    return appendInactiveCompanyOption(options, detailRecord?.party_a_id, detailRecord?.partyA);
  }, [partyACompanies, detailRecord?.party_a_id, detailRecord?.partyA]);

  const partyBOptions = useMemo(() => {
    const options = partyBCompanies.map((company) => ({
      label: company.company_name,
      value: company.id!,
    }));
    return appendInactiveCompanyOption(options, detailRecord?.party_b_id, detailRecord?.partyB);
  }, [partyBCompanies, detailRecord?.party_b_id, detailRecord?.partyB]);

  return (
    <DrawerForm
      formRef={formRef}
      title={isEditMode ? '编辑合同' : '新建合同'}
      width={1200}
      open={visible}
      onOpenChange={(vis) => {
        if (!vis) {
          attemptClose();
        }
      }}
      initialValues={{}}
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
                <Col span={16}>
                  <ProFormText
                    rules={mainContractFieldRules.contract_name}
                    label="合同名称"
                    name="contract_name"
                    placeholder="请输入合同名称"
                    labelCol={{ span: 6 }}
                    wrapperCol={{ span: 18 }}
                  />
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="状态"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    shouldUpdate={(prev, cur) =>
                      prev.date_signed !== cur.date_signed ||
                      prev.date_end !== cur.date_end ||
                      prev.amount_settlement !== cur.amount_settlement
                    }
                  >
                    {({ getFieldValue }) => {
                      const status = resolveMainContractStatus(
                        {
                          date_signed: formatMainContractDateValue(getFieldValue('date_signed')),
                          date_end: formatMainContractDateValue(getFieldValue('date_end')),
                          amount_settlement: getFieldValue('amount_settlement'),
                        },
                        {
                          total_received: detailRecord?.total_received ?? 0,
                          total_invoiced: detailRecord?.total_invoiced ?? 0,
                        },
                      );
                      return (
                        <div>
                          <Tag color={getContractStatusColor(status)}>{status}</Tag>
                          <div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              根据签约/竣工日期及收开票金额自动计算
                            </Text>
                          </div>
                        </div>
                      );
                    }}
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16} style={{ marginBottom: 8 }}>
                <Col span={12}>
                  <ProFormSelect
                    name="party_a_id"
                    label="发包单位"
                    options={partyAOptions}
                    rules={mainContractFieldRules.party_a_id}
                    placeholder="请选择发包单位"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    fieldProps={{
                      showSearch: true,
                      filterOption: (input: string, option?: DefaultOptionType) =>
                        ((option?.label as string) ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase()),
                    }}
                  />
                </Col>
                <Col span={12}>
                  <ProFormSelect
                    name="party_b_id"
                    label="承包单位"
                    options={partyBOptions}
                    rules={mainContractFieldRules.party_b_id}
                    placeholder="请选择承包单位"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    fieldProps={{
                      showSearch: true,
                      filterOption: (input: string, option?: DefaultOptionType) =>
                        ((option?.label as string) ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase()),
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
                    rules={mainContractFieldRules.amount_contract}
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
                <Col span={12}>
                  <ProFormDatePicker
                    label="保修截止"
                    name="date_warranty"
                    placeholder="请选择保修到期日期"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                  />
                </Col>
                
              </Row>

              <Row gutter={16} style={{ marginBottom: 8 }}>
              <Col span={12}>
                  <ProFormDatePicker
                    label="开工日期"
                    name="date_start"
                    placeholder="请选择开工日期"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                  />
                </Col>
                <Col span={12}>
                  <ProFormDatePicker
                    label="竣工日期"
                    name="date_end"
                    placeholder="请选择竣工日期"
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
                  rows: 4,
                  maxLength: 500,
                  showCount: true,
                }}
              />
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
                    moduleType="ZB_CONTRACT"
                    mainContractId={effectiveId ?? undefined}
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

export default MainContractForm;
