import { COLORS } from '@/constants/colors';
import { useBondAmountRatio } from '@/hooks';
import {
  calcBondAmountByRatio,
  DEFAULT_RATIO_BY_TYPE,
  getContractBaseAmount,
  type BondType,
} from '@/pages/Bond/bond.shared';
import { amountFormatter, parseAmount } from '@/utils/format';
import { ProFormSelect } from '@ant-design/pro-components';
import { Col, Form, InputNumber, Row, Space, Switch, Typography } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { BOND_FORM_HINT_OPTIONS } from './subContractForm.shared';

const { Title } = Typography;

/** 单行 24 栅格：开关 5 + 金额+比例 13 + 形式 6 */
const BOND_COL = {
  switch: 8,
  amountRatio: 10,
  form: 6,
} as const;

/** 与分包表单半宽字段（合同金额、签约日期等）一致 */
const halfFieldLayout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};

const BOND_FIELD_CLASS = 'sub-contract-bond-field';

const BOND_FIELD_STYLES = `
  .sub-contract-bond-field .ant-input-number-affix-wrapper { width: 100%; }
  .sub-contract-bond-field .ant-form-item-explain-connected { min-height: 22px; line-height: 22px; }
`;

/** 仅保存/提交时校验 */
const bondFormItemProps = {
  className: BOND_FIELD_CLASS,
  validateTrigger: false as false,
};

type BondFieldsProps = {
  bondType: BondType;
  reqField: 'bond_perf_req' | 'bond_labor_req';
  amtField: 'bond_perf_amt' | 'bond_labor_amt';
  formField: 'bond_perf_form' | 'bond_labor_form';
  switchLabel: string;
  defaultForm?: string;
};

const createBondAmountRules = (reqField: BondFieldsProps['reqField']) => [
  ({ getFieldValue }: { getFieldValue: (name: string) => unknown }) => ({
    validator(_: unknown, value: unknown) {
      if (!getFieldValue(reqField)) {
        return Promise.resolve();
      }
      const num = Number(value);
      if (!Number.isFinite(num) || num <= 0) {
        return Promise.reject(new Error('请输入保证金金额'));
      }
      return Promise.resolve();
    },
  }),
];

const createBondFormRules = (reqField: BondFieldsProps['reqField']) => [
  ({ getFieldValue }: { getFieldValue: (name: string) => unknown }) => ({
    validator(_: unknown, value: unknown) {
      if (!getFieldValue(reqField)) {
        return Promise.resolve();
      }
      if (value === undefined || value === null || value === '') {
        return Promise.reject(new Error('请选择保证金形式'));
      }
      return Promise.resolve();
    },
  }),
];

const BondRow: React.FC<BondFieldsProps> = ({
  bondType,
  reqField,
  amtField,
  formField,
  switchLabel,
  defaultForm,
}) => {
  const form = Form.useFormInstance();
  const bondEnabled = Form.useWatch(reqField, form);
  const bondAmount = Form.useWatch(amtField, form);
  const amountContract = Form.useWatch('amount_contract', form);
  const baseAmount = getContractBaseAmount({ amount_contract: amountContract });
  const defaultRatio = DEFAULT_RATIO_BY_TYPE[bondType];
  const prevBondEnabledRef = useRef<boolean | undefined>(undefined);
  const baseAmountRef = useRef(baseAmount);
  baseAmountRef.current = baseAmount;

  const setBondAmount = useCallback(
    (amount: number | undefined) => {
      form.setFieldsValue({ [amtField]: amount });
    },
    [form, amtField],
  );

  const { ratio: ratioInput, resetRatio, handleRatioChange } = useBondAmountRatio({
    baseAmount,
    bondAmount,
    active: !!bondEnabled,
    defaultRatio,
    setBondAmount,
  });

  const fieldDisabled = !bondEnabled;

  const bondAmountRules = useMemo(() => createBondAmountRules(reqField), [reqField]);
  const bondFormRules = useMemo(() => createBondFormRules(reqField), [reqField]);

  useEffect(() => {
    const prev = prevBondEnabledRef.current;
    prevBondEnabledRef.current = !!bondEnabled;

    if (bondEnabled && prev === false) {
      const currentAmt = form.getFieldValue(amtField);
      const currentForm = form.getFieldValue(formField);
      const hasExisting =
        (currentAmt != null && currentAmt !== '') ||
        (currentForm != null && currentForm !== '');

      if (!hasExisting) {
        // 用户主动打开开关时填入默认值；编辑回填时已有值则保留
        const updates: Record<string, unknown> = {};
        if (defaultForm) updates[formField] = defaultForm;
        if (defaultRatio && baseAmountRef.current > 0) {
          updates[amtField] = calcBondAmountByRatio(baseAmountRef.current, defaultRatio);
        }
        if (Object.keys(updates).length > 0) {
          form.setFieldsValue(updates);
        }
      }
    }

    if (!bondEnabled) {
      resetRatio();
      form.setFields([
        { name: amtField, errors: [] },
        { name: formField, errors: [] },
      ]);
    }
  }, [bondEnabled, amtField, formField, form, defaultRatio, defaultForm, resetRatio]);

  return (
    <Row gutter={16} style={{ marginBottom: 8 }}>
      <Col span={BOND_COL.switch}>
        <Form.Item
          label={switchLabel}
          name={reqField}
          valuePropName="checked"
          labelCol={{ span: 16 }}
          wrapperCol={{ span: 8 }}
          className={BOND_FIELD_CLASS}
        >
          <Switch size="small" />
        </Form.Item>
      </Col>
      <Col span={BOND_COL.amountRatio}>
        <Form.Item
          label="金额"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 20 }}
          className={BOND_FIELD_CLASS}
        >
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item name={amtField} noStyle rules={bondAmountRules} validateTrigger={false}>
              <InputNumber<number>
                min={0}
                precision={2}
                placeholder="请输入保证金金额"
                controls={false}
                disabled={fieldDisabled}
                style={{ width: '65%' }}
                formatter={amountFormatter}
                parser={parseAmount}
              />
            </Form.Item>
            <InputNumber
              value={ratioInput}
              onChange={handleRatioChange}
              min={0}
              max={100}
              step={1}
              precision={0}
              addonAfter="%"
              disabled={fieldDisabled || baseAmount <= 0}
              style={{ width: '35%' }}
            />
          </Space.Compact>
        </Form.Item>
      </Col>
      <Col span={BOND_COL.form}>
        <ProFormSelect
          name={formField}
          label="形式"
          options={BOND_FORM_HINT_OPTIONS}
          placeholder="请选择"
          allowClear
          rules={bondFormRules}
          {...halfFieldLayout}
          formItemProps={bondFormItemProps}
          fieldProps={{
            disabled: fieldDisabled,
            style: { width: '100%' },
          }}
        />
      </Col>
    </Row>
  );
};

const SubContractBondFields: React.FC = () => (
  <>
    <style>{BOND_FIELD_STYLES}</style>
    <Title level={5} style={{ marginBottom: 8, color: COLORS.textSecondary }}>
      保证金
    </Title>
    <BondRow
      bondType="履约保证金"
      reqField="bond_perf_req"
      amtField="bond_perf_amt"
      formField="bond_perf_form"
      switchLabel="履约保证金"
      defaultForm="不限"
    />
    <BondRow
      bondType="民工保证金"
      reqField="bond_labor_req"
      amtField="bond_labor_amt"
      formField="bond_labor_form"
      switchLabel="民工保证金"
      defaultForm="现金"
    />
  </>
);

export default SubContractBondFields;
