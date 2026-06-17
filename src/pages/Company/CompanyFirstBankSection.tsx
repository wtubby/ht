import { COLORS } from '@/constants/colors';
import {
  BANK_ACCOUNT_DEFAULT_STATUS,
  BANK_ACCOUNT_FIRST_STATUS_OPTIONS,
  normalizeBankText,
} from '@/utils/companyBankAccount';
import { Col, Form, Input, Row, Select, Switch, Typography } from 'antd';
import React from 'react';

const { Text } = Typography;

const FIELDS_LAYOUT = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};

/** 新建单位时可选的首个银行账户 */
const CompanyFirstBankSection: React.FC = () => (
  <>
    <Form.Item name="includeFirstBankAccount" valuePropName="checked" style={{ marginBottom: 12 }}>
      <Switch checkedChildren="添加" unCheckedChildren="跳过" />
    </Form.Item>
    <Text type="secondary" style={{ display: 'block', marginBottom: 16, marginTop: -8 }}>
      可选：创建单位时同时添加首个银行账户，更多账户请在保存后于详情中管理
    </Text>

    <Form.Item
      noStyle
      shouldUpdate={(prev, cur) => prev.includeFirstBankAccount !== cur.includeFirstBankAccount}
    >
      {({ getFieldValue }) =>
        getFieldValue('includeFirstBankAccount') ? (
          <div
            style={{
              padding: '16px',
              borderRadius: 8,
              background: COLORS.bgSubtle,
              border: `1px dashed ${COLORS.borderMuted}`,
            }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="账户名称"
                  name={['firstBankAccount', 'account_name']}
                  rules={[{ required: true, whitespace: true, message: '请输入账户名称' }]}
                  normalize={(value) => normalizeBankText(value)}
                  {...FIELDS_LAYOUT}
                >
                  <Input placeholder="请输入账户名称" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="账户号码"
                  name={['firstBankAccount', 'account_number']}
                  rules={[
                    { required: true, whitespace: true, message: '请输入账户号码' },
                    { max: 30, message: '银行账号不能超过30个字符' },
                  ]}
                  normalize={(value) => normalizeBankText(value)}
                  {...FIELDS_LAYOUT}
                >
                  <Input placeholder="请输入账户号码" maxLength={30} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="开户银行"
                  name={['firstBankAccount', 'bank_name']}
                  rules={[{ required: true, whitespace: true, message: '请输入开户银行' }]}
                  normalize={(value) => normalizeBankText(value)}
                  {...FIELDS_LAYOUT}
                >
                  <Input placeholder="请输入开户银行" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="账户状态"
                  name={['firstBankAccount', 'account_status']}
                  initialValue={BANK_ACCOUNT_DEFAULT_STATUS}
                  {...FIELDS_LAYOUT}
                >
                  <Select options={[...BANK_ACCOUNT_FIRST_STATUS_OPTIONS]} disabled />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item
                  label="备注"
                  name={['firstBankAccount', 'remarks']}
                  labelCol={{ span: 4 }}
                  wrapperCol={{ span: 20 }}
                >
                  <Input placeholder="选填" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name={['firstBankAccount', 'is_default']}
              valuePropName="checked"
              initialValue={true}
              hidden
            >
              <Switch />
            </Form.Item>
          </div>
        ) : null
      }
    </Form.Item>
  </>
);

export default CompanyFirstBankSection;
