import {
  addBankAccount,
  setDefaultBankAccount,
  updateBankAccount,
} from '@/services/wtu/bankAccount.api';
import { getErrorMessage } from '@/utils/apiError';
import {
  BANK_ACCOUNT_DEFAULT_STATUS,
  BANK_ACCOUNT_EDIT_STATUS_OPTIONS,
  isDefaultBankAccount,
  normalizeBankText,
  pickBankPayload,
  toEditableBankAccount,
  type BankAccountEditStatus,
  type EditableBankAccount,
} from '@/utils/companyBankAccount';
import { App, Form, Input, Modal, Select, Switch } from 'antd';
import React, { useEffect } from 'react';

export interface CompanyBankFormModalProps {
  open: boolean;
  companyId: number;
  account?: API.CompanyBankAccount | null;
  onClose: () => void;
  onSuccess: () => void;
}

type FormValues = {
  account_name: string;
  account_number: string;
  bank_name: string;
  account_status: BankAccountEditStatus;
  remarks?: string;
  is_default: boolean;
};

const CompanyBankFormModal: React.FC<CompanyBankFormModalProps> = ({
  open,
  companyId,
  account,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const isEdit = !!account?.id;
  const isCurrentDefault = !!account && isDefaultBankAccount(account);
  const accountStatus = Form.useWatch('account_status', form);
  const canSetDefault = !accountStatus || accountStatus === BANK_ACCOUNT_DEFAULT_STATUS;

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }
    if (account) {
      const editable = toEditableBankAccount(account);
      const accountStatus: BankAccountEditStatus =
        editable.account_status === '冻结' ? '冻结' : BANK_ACCOUNT_DEFAULT_STATUS;
      form.setFieldsValue({
        account_name: editable.account_name,
        account_number: editable.account_number,
        bank_name: editable.bank_name,
        account_status: accountStatus,
        remarks: editable.remarks,
        is_default: !!editable.is_default,
      });
    } else {
      form.setFieldsValue({
        account_status: BANK_ACCOUNT_DEFAULT_STATUS,
        is_default: false,
      });
    }
  }, [open, account, form]);

  useEffect(() => {
    if (!canSetDefault) {
      form.setFieldValue('is_default', false);
    }
  }, [canSetDefault, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = pickBankPayload(
        {
          ...values,
          id: account?.id,
          key: account?.id ? `existing_${account.id}` : 'temp',
        } as EditableBankAccount,
        isEdit ? 'update' : 'add',
      );

      if (values.is_default && values.account_status !== BANK_ACCOUNT_DEFAULT_STATUS) {
        message.error('默认银行账户状态必须为“正常”');
        return;
      }

      const shouldSetDefault =
        !isCurrentDefault &&
        values.is_default &&
        values.account_status === BANK_ACCOUNT_DEFAULT_STATUS;
      const payloadForSave =
        isCurrentDefault && values.account_status !== BANK_ACCOUNT_DEFAULT_STATUS
          ? { ...payload, is_default: false }
          : (() => {
              const rest = { ...payload };
              delete rest.is_default;
              return rest;
            })();

      const hide = message.loading(isEdit ? '正在保存' : '正在添加');
      try {
        let accountId = account?.id;
        if (isEdit && account?.id) {
          await updateBankAccount(account.id, payloadForSave);
        } else {
          const response = await addBankAccount(companyId, payloadForSave);
          accountId = response.data?.id;
        }
        if (shouldSetDefault && accountId) {
          await setDefaultBankAccount(accountId);
        }
        hide();
        message.success(isEdit ? '保存成功' : '添加成功');
        onSuccess();
        onClose();
      } catch (error) {
        hide();
        message.error(getErrorMessage(error, isEdit ? '保存失败' : '添加失败'));
      }
    } catch {
      // 表单校验未通过
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑银行账户' : '添加银行账户'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      destroyOnClose
      width={520}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          label="账户名称"
          name="account_name"
          rules={[{ required: true, whitespace: true, message: '请输入账户名称' }]}
        >
          <Input placeholder="请输入账户名称" />
        </Form.Item>
        <Form.Item
          label="账户号码"
          name="account_number"
          rules={[
            { required: true, whitespace: true, message: '请输入账户号码' },
            { max: 30, message: '银行账号不能超过30个字符' },
          ]}
          normalize={(value) => normalizeBankText(value)}
        >
          <Input placeholder="请输入账户号码" maxLength={30} />
        </Form.Item>
        <Form.Item
          label="开户银行"
          name="bank_name"
          rules={[{ required: true, whitespace: true, message: '请输入开户银行' }]}
        >
          <Input placeholder="请输入开户银行" />
        </Form.Item>
        <Form.Item
          label="账户状态"
          name="account_status"
          initialValue={BANK_ACCOUNT_DEFAULT_STATUS}
          tooltip="销户属于高风险操作，请在账户卡片中通过“销户”按钮确认"
        >
          <Select options={[...BANK_ACCOUNT_EDIT_STATUS_OPTIONS]} />
        </Form.Item>
        <Form.Item label="备注" name="remarks">
          <Input.TextArea rows={2} placeholder="选填" />
        </Form.Item>
        {isCurrentDefault ? (
          <Form.Item
            label="默认账户"
            tooltip="当前默认账户不可在此取消；若状态改为冻结，保存时会自动取消默认"
          >
            <Switch checked={canSetDefault} disabled />
          </Form.Item>
        ) : (
          <Form.Item
            label="设为默认账户"
            name="is_default"
            valuePropName="checked"
            tooltip="仅“正常”状态账户可设为默认"
          >
            <Switch disabled={!canSetDefault} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default CompanyBankFormModal;
