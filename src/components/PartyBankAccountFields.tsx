import {
  PARTY_BANK_ACCOUNT_FIELDS,
  getEmptyPartyBankAccountFieldValues,
} from '@/hooks/usePartyBankAccountAutoFill';
import { formatAccountLabel } from '@/utils/companyBankAccount';
import type { ProFormInstance } from '@ant-design/pro-components';
import { ProFormSelect, ProFormText } from '@ant-design/pro-components';
import { Col, Row } from 'antd';
import type { Rule } from 'antd/es/form';
import React, { type RefObject } from 'react';

interface PartyBankAccountFieldsProps {
  formRef: RefObject<ProFormInstance | undefined>;
  availableAccounts: API.CompanyBankAccount[];
  allAccounts: API.CompanyBankAccount[];
  accountRules: {
    account_name?: Rule[];
    account_number?: Rule[];
    bank_name?: Rule[];
  };
  selectLabelCol?: { span: number };
  selectWrapperCol?: { span: number };
  rowLabelCol?: { span: number };
  rowWrapperCol?: { span: number };
  bankNameLabelCol?: { span: number };
  bankNameWrapperCol?: { span: number };
}

const PartyBankAccountFields: React.FC<PartyBankAccountFieldsProps> = ({
  formRef,
  availableAccounts,
  allAccounts,
  accountRules,
  selectLabelCol,
  selectWrapperCol,
  rowLabelCol = { span: 10 },
  rowWrapperCol = { span: 14 },
  bankNameLabelCol,
  bankNameWrapperCol,
}) => {
  const handleSelectChange = (value: number | undefined) => {
    if (value) {
      const selectedAccount = availableAccounts.find((account) => account.id === value);
      if (selectedAccount) {
        formRef.current?.setFieldsValue({
          [PARTY_BANK_ACCOUNT_FIELDS.accountName]: selectedAccount.account_name,
          [PARTY_BANK_ACCOUNT_FIELDS.accountNumber]: selectedAccount.account_number,
          [PARTY_BANK_ACCOUNT_FIELDS.bankName]: selectedAccount.bank_name,
        });
      }
      return;
    }
    formRef.current?.setFieldsValue(getEmptyPartyBankAccountFieldValues());
  };

  return (
    <>
      <ProFormSelect
        name={PARTY_BANK_ACCOUNT_FIELDS.select}
        label="收款账户"
        options={availableAccounts.map((account) => ({
          label: formatAccountLabel(account),
          value: account.id,
        }))}
        placeholder="选择账户可快速填入下方账户信息"
        extra={
          allAccounts.length > 0 && availableAccounts.length === 0
            ? '该单位银行账户均非正常状态，请先在单位管理中维护后再选择'
            : undefined
        }
        labelCol={selectLabelCol}
        wrapperCol={selectWrapperCol}
        fieldProps={{
          allowClear: true,
          onChange: handleSelectChange,
        }}
      />

      <Row gutter={16}>
        <Col span={12}>
          <ProFormText
            name={PARTY_BANK_ACCOUNT_FIELDS.accountName}
            label="账户名称"
            placeholder="请输入账户名称"
            rules={accountRules.account_name}
            labelCol={rowLabelCol}
            wrapperCol={rowWrapperCol}
          />
        </Col>
        <Col span={12}>
          <ProFormText
            name={PARTY_BANK_ACCOUNT_FIELDS.accountNumber}
            label="账户号码"
            placeholder="请输入账户号码"
            labelCol={rowLabelCol}
            wrapperCol={rowWrapperCol}
            rules={accountRules.account_number}
            fieldProps={{ maxLength: 30 }}
          />
        </Col>
      </Row>

      <ProFormText
        name={PARTY_BANK_ACCOUNT_FIELDS.bankName}
        label="开户银行"
        placeholder="请输入开户银行"
        rules={accountRules.bank_name}
        labelCol={bankNameLabelCol}
        wrapperCol={bankNameWrapperCol}
      />
    </>
  );
};

export default PartyBankAccountFields;
