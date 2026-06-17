import { updatePassword } from '@/services/wtu/user.api';
import { getErrorMessage } from '@/utils/apiError';
import { PageContainer } from '@ant-design/pro-components';
import { App, Button, Card, Form, Input } from 'antd';
import React, { useState } from 'react';

const AccountSettings: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) => {
    setLoading(true);
    try {
      await updatePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('密码修改成功');
      form.resetFields();
    } catch (error) {
      message.error(getErrorMessage(error, '密码修改失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="账户安全">
      <Card style={{ maxWidth: 480 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password placeholder="请输入当前密码" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度至少6位' },
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item
            name="confirmNewPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default AccountSettings;
