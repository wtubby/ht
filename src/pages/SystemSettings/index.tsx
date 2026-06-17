import {
  getSystemSettings,
  updateSystemSettings,
  type SystemSettings,
} from '@/services/wtu/systemSettings.api';
import { getErrorMessage } from '@/utils/apiError';
import { PageContainer } from '@ant-design/pro-components';
import { App, Button, Card, Form, Input, Switch } from 'antd';
import React, { useEffect, useState } from 'react';

type FormValues = {
  system_name: string;
  system_logo: string;
  ocr_enabled: boolean;
  baidu_ocr_api_key: string;
  baidu_ocr_secret_key: string;
};

const SystemSettingsPage: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const setFormValues = (data: SystemSettings) => {
    form.setFieldsValue({
      system_name: data.system_name || '',
      system_logo: data.system_logo || '',
      ocr_enabled: Boolean(data.ocr_enabled),
      baidu_ocr_api_key: data.baidu_ocr_api_key || '',
      baidu_ocr_secret_key: data.baidu_ocr_secret_key || '',
    });
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const resp = await getSystemSettings();
      if (resp?.data) {
        setFormValues(resp.data);
      }
    } catch (error) {
      message.error(getErrorMessage(error, '加载系统设置失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await updateSystemSettings({
        system_name: values.system_name.trim(),
        system_logo: values.system_logo.trim() || null,
        ocr_enabled: values.ocr_enabled,
        baidu_ocr_api_key: values.baidu_ocr_api_key.trim() || null,
        baidu_ocr_secret_key: values.baidu_ocr_secret_key.trim() || null,
      });
      message.success('系统设置已保存');
      await loadSettings();
    } catch (error) {
      message.error(getErrorMessage(error, '保存系统设置失败'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="系统设置" loading={loading}>
      <Card>
        <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="system_name"
            label="系统名称"
            rules={[{ required: true, message: '请输入系统名称' }]}
          >
            <Input maxLength={100} placeholder="例如：项目管理系统" />
          </Form.Item>

          <Form.Item name="system_logo" label="Logo 路径">
            <Input maxLength={500} placeholder="例如：/logo.png 或 /uploads/system/logo.png" />
          </Form.Item>

          <Form.Item name="ocr_enabled" label="启用 OCR" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="baidu_ocr_api_key" label="百度 OCR API Key">
            <Input maxLength={200} placeholder="请输入 API Key" />
          </Form.Item>

          <Form.Item name="baidu_ocr_secret_key" label="百度 OCR Secret Key">
            <Input.Password maxLength={200} placeholder="请输入 Secret Key" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default SystemSettingsPage;
