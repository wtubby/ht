import { useCompanyBankAccounts, useRefundBond } from '@/hooks';
import {
  filterSelectableAccounts,
  findDefaultSelectableAccount,
  formatAccountLabel,
} from '@/utils/companyBankAccount';
import { RollbackOutlined } from '@ant-design/icons';
import { App, Button, Col, DatePicker, Form, Input, Modal, Row, Select, Spin } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useMemo } from 'react';

interface BondRefundModalProps {
  open: boolean;
  bond?: API.Bond | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const emptyAccountFields = {
  account_name: '',
  account_number: '',
  bank_name: '',
};

const BondRefundModal: React.FC<BondRefundModalProps> = ({ open, bond, onClose, onSuccess }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const refundMutation = useRefundBond();
  const partyCompanyId = open ? bond?.subContract?.partyC?.id : undefined;

  const {
    data: bankAccounts = [],
    isLoading: loadingAccounts,
    isFetching,
    isError,
  } = useCompanyBankAccounts(partyCompanyId, {
    enabled: open && !!partyCompanyId,
  });

  const refunding = refundMutation.isPending;

  const availableBankAccounts = useMemo(
    () => filterSelectableAccounts(bankAccounts),
    [bankAccounts],
  );

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (!partyCompanyId) {
      form.setFieldsValue({
        date_end: dayjs(),
        ...emptyAccountFields,
        remarks: '',
      });
      return;
    }

    if (loadingAccounts || isFetching) return;

    if (isError) {
      message.warning('加载银行账户失败');
      form.setFieldsValue({
        date_end: dayjs(),
        ...emptyAccountFields,
        remarks: '',
      });
      return;
    }

    const defaultAccount = findDefaultSelectableAccount(bankAccounts);
    form.setFieldsValue({
      date_end: dayjs(),
      ...(defaultAccount
        ? {
            payee_bank_account_select: defaultAccount.id,
            account_name: defaultAccount.account_name,
            account_number: defaultAccount.account_number,
            bank_name: defaultAccount.bank_name,
          }
        : emptyAccountFields),
      remarks: '',
    });
  }, [open, partyCompanyId, bankAccounts, loadingAccounts, isFetching, isError, form, message]);

  const handleBankAccountChange = (value?: number) => {
    if (!value) {
      form.setFieldsValue(emptyAccountFields);
      return;
    }

    const account = availableBankAccounts.find((acc) => acc.id === value);
    if (account) {
      form.setFieldsValue({
        account_name: account.account_name,
        account_number: account.account_number,
        bank_name: account.bank_name,
      });
    }
  };

  const handleSubmit = async () => {
    if (!bond?.id) return;

    try {
      const values = await form.validateFields();
      await refundMutation.mutateAsync({
        id: bond.id,
        data: {
          date_end: values.date_end.format('YYYY-MM-DD'),
          account_name: values.account_name,
          account_number: values.account_number,
          bank_name: values.bank_name,
          remarks: values.remarks,
        },
      });

      message.success('保证金退还成功');
      onClose();
      onSuccess?.();
    } catch (error) {
      if ((error as { errorFields?: unknown })?.errorFields) return;
      message.error('退还失败，请重试');
    }
  };

  return (
    <Modal
      title={
        <span>
          <RollbackOutlined style={{ marginRight: 8 }} />
          退还保证金
        </span>
      }
      open={open}
      onCancel={onClose}
      width={720}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="submit" type="primary" loading={refunding} onClick={handleSubmit}>
          确认退还
        </Button>,
      ]}
    >
      <Spin spinning={(!!partyCompanyId && (loadingAccounts || isFetching)) || refunding}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="退还日期"
                name="date_end"
                rules={[{ required: true, message: '请选择退还日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            {availableBankAccounts.length > 0 && (
              <Col span={12}>
                <Form.Item
                  label="账户"
                  name="payee_bank_account_select"
                  rules={[{ required: true, message: '请选择账户' }]}
                  extra={
                    bankAccounts.length > 0 && availableBankAccounts.length === 0
                      ? '该单位银行账户均非正常状态，请先在单位管理中维护后再选择'
                      : undefined
                  }
                >
                  <Select allowClear placeholder="请选择账户" onChange={handleBankAccountChange}>
                    {availableBankAccounts.map((account) => (
                      <Select.Option key={account.id} value={account.id}>
                        {formatAccountLabel(account)}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="账户名称"
                name="account_name"
                rules={[{ required: true, message: '请输入账户名称' }]}
              >
                <Input placeholder="请输入账户名称" disabled={availableBankAccounts.length > 0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="账户号码"
                name="account_number"
                rules={[
                  { required: true, message: '请输入账户号码' },
                  { max: 30, message: '银行账号不能超过30个字符' },
                ]}
              >
                <Input
                  placeholder="请输入账户号码"
                  disabled={availableBankAccounts.length > 0}
                  maxLength={30}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="开户银行"
                name="bank_name"
                rules={[{ required: true, message: '请输入开户银行' }]}
              >
                <Input placeholder="请输入开户银行" disabled={availableBankAccounts.length > 0} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="备注" name="remarks">
            <Input.TextArea rows={2} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default BondRefundModal;
