import {
  formatRecordDetailTitle,
  RECORD_DETAIL_CARD_STYLE,
  RECORD_DETAIL_DRAWER_BODY_STYLE,
  RECORD_DETAIL_DRAWER_WIDTH,
} from '@/components/RecordDetail/shared';
import { getCompanyStatusColor, getCompanyTypeColor } from '@/constants/statusColors';
import { useCompany } from '@/hooks';
import { formatAmount } from '@/utils/format';
import {
  BankOutlined,
  EditOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Descriptions, Drawer, Spin, Tabs, Tag } from 'antd';
import React, { useEffect, useState } from 'react';
import CompanyBankSection from './CompanyBankSection';
import CompanyContractSection from './CompanyContractSection';

export type CompanyDetailTabKey = 'basic' | 'bank' | 'contracts';

interface CompanyDetailProps {
  visible: boolean;
  currentRecord?: API.Company;
  initialActiveTab?: CompanyDetailTabKey;
  onCancel: () => void;
  onEdit?: () => void;
}

const CompanyDetail: React.FC<CompanyDetailProps> = ({
  visible,
  currentRecord,
  initialActiveTab = 'basic',
  onCancel,
  onEdit,
}) => {
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState<CompanyDetailTabKey>(initialActiveTab);

  const recordId = currentRecord?.id ?? 0;
  const detailEnabled = visible && !!currentRecord?.id;

  const {
    data: detailResponse,
    isLoading,
    isFetching,
    isError,
  } = useCompany(recordId, detailEnabled);
  const typedResponse = detailResponse as { data?: API.Company } | undefined;
  const companyDetail = typedResponse?.data;
  const displayRow = companyDetail
    ? {
        ...companyDetail,
        contract_count: currentRecord?.contract_count ?? companyDetail.contract_count,
      }
    : currentRecord;
  const detailLoading = detailEnabled && (isLoading || isFetching);

  useEffect(() => {
    if (isError) {
      message.error('加载单位详情失败');
    }
  }, [isError, message]);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialActiveTab);
    }
  }, [visible, initialActiveTab]);

  const drawerTitle = formatRecordDetailTitle(displayRow?.company_name, '单位详情');
  const contractCount = displayRow?.contract_count ?? 0;

  return (
    <Drawer
      title={drawerTitle}
      width={RECORD_DETAIL_DRAWER_WIDTH}
      open={visible}
      onClose={onCancel}
      extra={
        onEdit ? (
          <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
            编辑
          </Button>
        ) : undefined
      }
      destroyOnClose
      styles={{ body: RECORD_DETAIL_DRAWER_BODY_STYLE }}
      afterOpenChange={(open) => {
        if (!open) {
          setActiveTab('basic');
        }
      }}
      zIndex={1000}
    >
      {!displayRow ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" spinning={detailLoading} />
        </div>
      ) : (
        <Spin spinning={detailLoading}>
          <Card bordered={false} style={RECORD_DETAIL_CARD_STYLE}>
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as CompanyDetailTabKey)}
              items={[
                {
                  key: 'basic',
                  label: (
                    <span>
                      <InfoCircleOutlined />
                      基本信息
                    </span>
                  ),
                  children: (
                    <Descriptions bordered column={2}>
                      <Descriptions.Item label="单位名称">
                        {displayRow.company_name}
                      </Descriptions.Item>
                      <Descriptions.Item label="单位状态">
                        {displayRow.company_status ? (
                          <Tag color={getCompanyStatusColor(displayRow.company_status)}>
                            {displayRow.company_status}
                          </Tag>
                        ) : (
                          '-'
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="统一社会信用代码">
                        {displayRow.credit_code || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="单位类型">
                        {displayRow.company_type ? (
                          <Tag color={getCompanyTypeColor(displayRow.company_type)}>
                            {displayRow.company_type}
                          </Tag>
                        ) : (
                          '-'
                        )}
                      </Descriptions.Item>
                      <Descriptions.Item label="法定代表人">
                        {displayRow.legal_person || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="注册资金">
                        {displayRow.reg_capital
                          ? `${formatAmount(displayRow.reg_capital)}万元`
                          : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="成立时间">
                        {displayRow.establish_date || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="创建时间">
                        {displayRow.created_at
                          ? new Date(displayRow.created_at).toLocaleDateString()
                          : '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="地址">
                        {displayRow.address || '-'}
                      </Descriptions.Item>
                      <Descriptions.Item label="备注">
                        {displayRow.remarks || '-'}
                      </Descriptions.Item>
                    </Descriptions>
                  ),
                },
                {
                  key: 'bank',
                  label: (
                    <span>
                      <BankOutlined />
                      银行账户
                    </span>
                  ),
                  children: displayRow.id ? (
                    <CompanyBankSection companyId={displayRow.id} tabActive={activeTab === 'bank'} />
                  ) : null,
                },
                {
                  key: 'contracts',
                  label: (
                    <span>
                      <FileTextOutlined />
                      关联合同{contractCount > 0 ? ` (${contractCount})` : ''}
                    </span>
                  ),
                  children: displayRow.id ? (
                    <CompanyContractSection
                      companyId={displayRow.id}
                      tabActive={activeTab === 'contracts'}
                    />
                  ) : null,
                },
              ]}
            />
          </Card>
        </Spin>
      )}
    </Drawer>
  );
};

export default CompanyDetail;
