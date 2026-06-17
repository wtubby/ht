import { TAX_RATE_OPTIONS } from '@/constants/taxRate';
import { INVOICE_FIELD_RULES, SECTION_TITLE_STYLE } from '@/pages/Invoice/invoiceForm.shared';
import {
  ProFormDatePicker,
  ProFormRadio,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Col, Row, Spin } from 'antd';
import React from 'react';

type InvoiceContractFieldName = 'sub_contract_id' | 'main_contract_id';

interface InvoiceFormFieldsProps<TOption = unknown> {
  contractFieldName: InvoiceContractFieldName;
  contractOptions: { label: string; value: number }[];
  contractLoading: boolean;
  onContractSearch: (value: string) => void;
  onContractChange: (value: number | null | undefined, option?: TOption | TOption[]) => void;
}

const InvoiceFormFields = <TOption,>({
  contractFieldName,
  contractOptions,
  contractLoading,
  onContractSearch,
  onContractChange,
}: InvoiceFormFieldsProps<TOption>) => (
  <div style={{ paddingRight: 16 }}>
    <div style={SECTION_TITLE_STYLE}>发票信息</div>

    <Row gutter={16} style={{ marginBottom: 8 }}>
      <Col span={12}>
        <ProFormText
          name="invoice_no"
          label="发票号码"
          rules={INVOICE_FIELD_RULES.invoice_no}
          placeholder="请输入发票号码"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
        />
      </Col>
      <Col span={12}>
        <ProFormDatePicker
          name="invoice_date"
          label="开票日期"
          rules={INVOICE_FIELD_RULES.invoice_date}
          placeholder="请选择开票日期"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          fieldProps={{ style: { width: '100%' } }}
        />
      </Col>
    </Row>

    <ProFormSelect
      name={contractFieldName}
      label="关联合同"
      rules={INVOICE_FIELD_RULES.contract}
      placeholder="请输入合同名称搜索"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 20 }}
      fieldProps={{
        showSearch: true,
        optionFilterProp: 'label',
        options: contractOptions,
        filterOption: false,
        onSearch: onContractSearch,
        onChange: onContractChange,
        notFoundContent: contractLoading ? <Spin size="small" /> : null,
        loading: contractLoading,
      }}
    />

    <Row gutter={16} style={{ marginBottom: 8 }}>
      <Col span={12}>
        <ProFormText
          name="buyer"
          label="购买方"
          rules={INVOICE_FIELD_RULES.buyer}
          placeholder="请输入购买方名称"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
        />
      </Col>
      <Col span={12}>
        <ProFormText
          name="seller"
          label="销售方"
          rules={INVOICE_FIELD_RULES.seller}
          placeholder="请输入销售方名称"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
        />
      </Col>
    </Row>

    <Row gutter={16} style={{ marginBottom: 8 }}>
      <Col span={12}>
        <ProFormText
          label="发票金额"
          name="invoice_amount"
          rules={INVOICE_FIELD_RULES.invoice_amount}
          placeholder="请输入发票金额（红冲可为负数）"
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
        />
      </Col>
      <Col span={12}>
        <ProFormRadio.Group
          name="tax_rate"
          label="税率(%)"
          options={TAX_RATE_OPTIONS}
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

    <ProFormTextArea
      name="remarks"
      label="备注"
      placeholder="请输入备注信息"
      labelCol={{ span: 4 }}
      wrapperCol={{ span: 20 }}
      fieldProps={{ rows: 3, maxLength: 500, showCount: true }}
    />
  </div>
);

export default InvoiceFormFields;
