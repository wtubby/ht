import { COLORS } from '@/constants/colors';
import { fetchCompanyQuery, useAddCompany, useDrawerDetailQuery, useDrawerFormLifecycle, useDrawerSaveSubmit, useUpdateCompany } from '@/hooks';
import { buildFirstBankPayload } from '@/utils/companyBankAccount';
import { getSavedEntityId, selectApiDetail } from '@/utils/apiResponse';
import { amountFormatter } from '@/utils/format';
import {
  DrawerForm,
  ProFormDatePicker,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import type { FormInstance } from 'antd';
import { Alert, App, Button, Col, Form, Modal, Row, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useCallback, useRef, useState } from 'react';
import type { CompanyDetailTabKey } from './CompanyDetail';
import CompanyFirstBankSection from './CompanyFirstBankSection';
const { Title } = Typography;
const FORM_ITEM_LAYOUT = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 },
};
const EDITABLE_COMPANY_FIELD_KEYS = [
  'company_name',
  'company_type',
  'company_status',
  'credit_code',
  'legal_person',
  'reg_capital',
  'establish_date',
  'address',
  'remarks',
] as const;
type CompanyFormValues = API.Company & {
  includeFirstBankAccount?: boolean;
  firstBankAccount?: API.CompanyBankAccount;
};
const pickEditableCompanyFields = (row: API.Company) =>
  Object.fromEntries(
    EDITABLE_COMPANY_FIELD_KEYS.map((key) => {
      if (key === 'establish_date' && row.establish_date) {
        return [key, dayjs(row.establish_date)];
      }
      return [key, row[key]];
    }),
  );
const buildCompanyPayload = (fields: CompanyFormValues): API.Company => {
  const payload = Object.fromEntries(
    EDITABLE_COMPANY_FIELD_KEYS.map((key) => {
      const value = fields[key];
      if (key === 'establish_date' && dayjs.isDayjs(value)) {
        return [key, value.format('YYYY-MM-DD')];
      }
      return [key, value];
    }),
  );
  return payload as API.Company;
};
interface CompanyFormProps {
  visible: boolean;
  currentRecord?: API.Company;
  onCancel: () => void;
  onSuccess: () => void;
  onOpenDetail?: (tab: CompanyDetailTabKey) => void;
}

const selectCompanyDetail = (response: unknown) => selectApiDetail<API.Company>(response);

const CompanyForm: React.FC<CompanyFormProps> = ({
  visible,
  currentRecord,
  onCancel,
  onSuccess,
  onOpenDetail,
}) => {
  const { message } = App.useApp();
  const formRef = useRef<FormInstance>();
  const addMutation = useAddCompany();
  const updateMutation = useUpdateCompany();
  const hydratingRef = useRef(false);
  const [detailRecord, setDetailRecord] = useState<API.Company | undefined>();
  const editId = currentRecord?.id ?? null;
  const isEditMode = !!editId;
  const detailId = visible ? (editId ?? undefined) : undefined;

  const resetBusinessState = useCallback(() => {
    formRef.current?.resetFields();
    setDetailRecord(undefined);
  }, []);

  const handleOpenEdge = useCallback(() => {
    setDetailRecord(undefined);
    hydratingRef.current = true;
    try {
      formRef.current?.resetFields();
      if (!currentRecord?.id) {
        formRef.current?.setFieldsValue({ includeFirstBankAccount: false, company_status: '正常' });
      }
    } finally {
      hydratingRef.current = false;
    }
  }, [currentRecord?.id]);

  const {
    isActive,
    runIfMounted,
    markFormClean,
    markFormDirtyIfNotHydrating,
    attemptClose,
    notifySubmitSuccess,
  } = useDrawerFormLifecycle({
    visible,
    onCancel,
    onReset: resetBusinessState,
    onOpenEdge: handleOpenEdge,
    recordId: currentRecord?.id,
    onRecordSwitch: resetBusinessState,
    hydratingRef,
  });

  const applyCompanyDetail = useCallback(
    (data: API.Company) => {
      setDetailRecord(data);
      hydratingRef.current = true;
      try {
        formRef.current?.resetFields();
        formRef.current?.setFieldsValue(pickEditableCompanyFields(data));
      } finally {
        hydratingRef.current = false;
      }
      markFormClean();
    },
    [hydratingRef, markFormClean],
  );

  const handleDetailError = useCallback(() => {
    message.error('加载单位详情失败，请关闭后重试');
  }, [message]);

  const { isLoading: detailLoading, isError: detailError } = useDrawerDetailQuery({
    visible,
    detailId,
    getQuery: fetchCompanyQuery,
    select: selectCompanyDetail,
    onDetail: applyCompanyDetail,
    onError: handleDetailError,
  });

  const formBusy = isEditMode && (detailLoading || detailError);

  const buildPayload = useCallback(
    (values: Record<string, unknown>): API.Company => {
      const fields = values as CompanyFormValues;
      const companyData = buildCompanyPayload(fields);
      if (isEditMode) return companyData;

      const bankResult = buildFirstBankPayload(
        !!fields.includeFirstBankAccount,
        fields.firstBankAccount,
      );
      if (!bankResult.ok) {
        return companyData;
      }
      return {
        ...companyData,
        bankAccounts: bankResult.data.length > 0 ? bankResult.data : undefined,
      } as API.Company;
    },
    [isEditMode],
  );

  const { isSubmitting, handleSubmit } = useDrawerSaveSubmit({
    formRef,
    effectiveId: editId,
    isActive,
    runIfMounted,
    buildPayload,
    add: (data) => addMutation.mutateAsync(data),
    update: (id, data) => updateMutation.mutateAsync({ id, data }),
    getSavedId: getSavedEntityId,
    notifySubmitSuccess,
    onSuccess,
    message,
    closeAfterCreate: true,
    messages: {
      createLoading: '正在添加',
      updateLoading: '正在更新',
      continueSuccess: '添加成功',
      updateSuccess: '更新成功',
      closeCreateSuccess: '添加成功',
    },
    beforeSubmit: ({ values, isEditMode: editing }) => {
      if (editing && formBusy) {
        return { ok: false, message: '单位详情加载失败，请关闭后重试' };
      }
      if (!editing) {
        const fields = values as CompanyFormValues;
        const bankResult = buildFirstBankPayload(
          !!fields.includeFirstBankAccount,
          fields.firstBankAccount,
        );
        if (!bankResult.ok) {
          return { ok: false, message: bankResult.message };
        }
      }
      return undefined;
    },
  });

  const handleOpenBankManagement = useCallback(() => {
    if (!onOpenDetail) return;
    const openBankTab = () => onOpenDetail('bank');
    if (!formRef.current?.isFieldsTouched()) {
      openBankTab();
      return;
    }
    Modal.confirm({
      title: '当前修改尚未保存',
      content: '前往银行账户管理会关闭当前编辑表单，未保存的单位信息将丢失，确认继续吗？',
      okText: '继续前往',
      cancelText: '留在表单',
      onOk: openBankTab,
    });
  }, [onOpenDetail]);

  return (
    <DrawerForm
      title={isEditMode ? '编辑单位' : '新建单位'}
      width={1200}
      layout="horizontal"
      formRef={formRef}
      open={visible}
      onOpenChange={(open) => {
        if (!open) attemptClose();
      }}
      onValuesChange={() => markFormDirtyIfNotHydrating()}
      initialValues={{ company_status: '正常' }}
      drawerProps={{
        destroyOnClose: true,
      }}
      submitter={{
        render: () => [
          <Button key="cancel" onClick={attemptClose}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isSubmitting}
            disabled={formBusy}
            onClick={() => handleSubmit()}
          >
            {isEditMode ? '提交' : '添加'}
          </Button>,
        ],
      }}
    >
      <Spin spinning={detailLoading}>
        <Row gutter={24}>
          <Col span={24}>
            <Title level={5} style={{ marginBottom: 16, color: COLORS.textSecondary }}>
              基本信息
            </Title>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormText
              rules={[{ required: true, message: '单位名称为必填项' }]}
              label="单位名称"
              name="company_name"
              placeholder="请输入单位名称"
              {...FORM_ITEM_LAYOUT}
            />
          </Col>
          <Col span={12}>
            <ProFormSelect
              name="company_type"
              label="单位类型"
              options={[
                { label: '签约单位', value: '签约单位' },
                { label: '合作单位', value: '合作单位' },
              ]}
              rules={[{ required: true, message: '请选择单位类型' }]}
              placeholder="请选择单位类型"
              {...FORM_ITEM_LAYOUT}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormSelect
              name="company_status"
              label="单位状态"
              options={[
                { label: '正常', value: '正常' },
                { label: '禁用', value: '禁用' },
              ]}
              rules={[{ required: true, message: '请选择单位状态' }]}
              placeholder="请选择单位状态"
              {...FORM_ITEM_LAYOUT}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormText
              label="统一社会信用代码"
              name="credit_code"
              placeholder="请输入统一社会信用代码"
              {...FORM_ITEM_LAYOUT}
            />
          </Col>
          <Col span={12}>
            <ProFormText
              label="法定代表人"
              name="legal_person"
              placeholder="请输入法定代表人"
              {...FORM_ITEM_LAYOUT}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormDigit
              label="注册资金"
              name="reg_capital"
              min={0}
              precision={2}
              placeholder="请输入注册资金"
              addonAfter="万元"
              {...FORM_ITEM_LAYOUT}
              fieldProps={{
                formatter: amountFormatter,
                parser: (value) => {
                  if (!value) return undefined as unknown as number;
                  const num = Number(value.replace(/\$\s?|(,*)/g, ''));
                  return Number.isNaN(num) ? (undefined as unknown as number) : num;
                },
              }}
            />
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormDatePicker
              label="成立时间"
              name="establish_date"
              placeholder="请选择成立时间"
              {...FORM_ITEM_LAYOUT}
              fieldProps={{ style: { width: '100%' } }}
            />
          </Col>
          {detailRecord?.created_at && (
            <Col span={12}>
              <Form.Item label="创建时间" {...FORM_ITEM_LAYOUT}>
                <span style={{ lineHeight: '32px' }}>
                  {dayjs(detailRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}
                </span>
              </Form.Item>
            </Col>
          )}
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <ProFormText
              label="地址"
              name="address"
              placeholder="请输入详细地址"
              {...FORM_ITEM_LAYOUT}
            />
          </Col>
          <Col span={12}>
            <ProFormText
              label="备注"
              name="remarks"
              placeholder="请输入备注信息"
              {...FORM_ITEM_LAYOUT}
            />
          </Col>
        </Row>
        <Row gutter={24} style={{ marginTop: 24 }}>
          <Col span={24}>
            <Title level={5} style={{ marginBottom: 16, color: COLORS.textSecondary }}>
              银行账户
            </Title>
          </Col>
        </Row>
        {isEditMode ? (
          <Alert
            type="info"
            showIcon
            message="银行账户请在单位详情中管理"
            description="添加、编辑、冻结/销户等操作在详情 → 银行账户 Tab 中即时保存，无需在此修改。"
            action={
              onOpenDetail ? (
                <Button size="small" type="primary" onClick={handleOpenBankManagement}>
                  去管理
                </Button>
              ) : undefined
            }
          />
        ) : (
          <CompanyFirstBankSection />
        )}
      </Spin>
    </DrawerForm>
  );
};
export default CompanyForm;
