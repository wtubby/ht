import ListToolbar from '@/components/ListToolbar';
import { UI_COLORS } from '@/constants/colors';
import { getCompanyStatusColor } from '@/constants/statusColors';
import { useRemoveCompany } from '@/hooks';
import { getCompanies } from '@/services/wtu/company.api';
import { getErrorMessage } from '@/utils/apiError';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Button, Tag, Tooltip } from 'antd';
import React, { useCallback, useMemo, useRef } from 'react';
import type { CompanyDetailTabKey } from './CompanyDetail';

interface CompanyListProps {
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  onViewDetail: (record: API.Company, tab?: CompanyDetailTabKey) => void;
  onEdit: (record: API.Company) => void;
  onCreate: () => void;
}

const CompanyList: React.FC<CompanyListProps> = ({
  actionRef: externalActionRef,
  onViewDetail,
  onEdit,
  onCreate,
}) => {
  const { message, modal } = App.useApp();
  const removeMutation = useRemoveCompany();
  const internalActionRef = useRef<ActionType>();
  const actionRef = externalActionRef ?? internalActionRef;
  const searchTextRef = useRef<string>('');

  const handleSearch = (value: string) => {
    searchTextRef.current = value;
    actionRef.current?.reload();
  };

  const handleRemove = useCallback(
    async (selectedRow: API.Company) => {
      const hide = message.loading('正在删除');
      if (!selectedRow) return;
      try {
        await removeMutation.mutateAsync({ id: selectedRow.id! });
        hide();
        message.success('删除成功');
        actionRef.current?.reload();
      } catch (error) {
        hide();
        message.error(getErrorMessage(error, '删除失败，请重试'));
      }
    },
    [removeMutation, message, actionRef],
  );

  const columns = useMemo<ProColumns<API.Company>[]>(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        width: 50,
        align: 'center',
      },
      {
        title: '单位名称',
        dataIndex: 'company_name',
        ellipsis: true,
        width: 250,
        render: (text, record) => <a onClick={() => onViewDetail(record)}>{text}</a>,
      },
      {
        title: '单位类型',
        dataIndex: 'company_type',
        valueEnum: {
          签约单位: { text: '签约单位', status: 'Success' },
          合作单位: { text: '合作单位', status: 'Processing' },
        },
        width: 100,
        align: 'center',
      },
      {
        title: '统一社会信用代码',
        dataIndex: 'credit_code',
        width: 180,
        ellipsis: true,
      },
      {
        title: '法人',
        dataIndex: 'legal_person',
        align: 'center',
        width: 80,
      },
      {
        title: '注资(万元)',
        dataIndex: 'reg_capital',
        align: 'right',
        width: 100,
        render: (text) => (text ? `${text}` : '-'),
      },
      {
        title: '成立时间',
        dataIndex: 'establish_date',
        valueType: 'date',
        align: 'center',
        width: 100,
      },
      {
        title: '地址',
        dataIndex: 'address',
        ellipsis: true,
        width: 260,
      },
      {
        title: '单位状态',
        dataIndex: 'company_status',
        align: 'center',
        valueEnum: {
          正常: { text: '正常', status: 'Success' },
          禁用: { text: '禁用', status: 'Error' },
        },
        width: 80,
        render: (_, record) => (
          <Tag color={getCompanyStatusColor(record.company_status || '')}>
            {record.company_status}
          </Tag>
        ),
      },
      {
        title: '创建人',
        dataIndex: ['creator', 'full_name'],
        width: 100,
      },
      {
        title: '关联合同',
        dataIndex: 'contract_count',
        align: 'center',
        width: 90,
        render: (_, record) => {
          const count = record.contract_count ?? 0;
          if (count === 0) {
            return '-';
          }
          return (
            <Tooltip title="点击查看关联合同">
              <a
                style={{ color: UI_COLORS.actionWarning, fontWeight: 500 }}
                onClick={() => onViewDetail(record, 'contracts')}
              >
                {count}
              </a>
            </Tooltip>
          );
        },
      },
      {
        title: '操作',
        dataIndex: 'option',
        valueType: 'option',
        width: 80,
        render: (_, record) => [
          <Tooltip key="edit" title="编辑">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>,
          <Tooltip
            key="delete"
            title={
              (record.contract_count ?? 0) > 0
                ? `已被 ${record.contract_count} 份合同使用，请改为禁用`
                : '删除'
            }
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              disabled={(record.contract_count ?? 0) > 0}
              onClick={() => {
                modal.confirm({
                  title: '确认删除',
                  content: `您确定要删除单位"${record.company_name}"吗？`,
                  onOk: () => handleRemove(record),
                });
              }}
            />
          </Tooltip>,
        ],
      },
    ],
    [handleRemove, onViewDetail, onEdit, modal],
  );

  return (
    <PageContainer pageHeaderRender={false}>
      <ProTable<API.Company, API.PageParams>
        headerTitle="单位管理"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        toolBarRender={() => [
          <ListToolbar
            key="toolbar"
            placeholder="搜索单位名称"
            createText="新建单位"
            onSearch={handleSearch}
            onCreate={onCreate}
          />,
        ]}
        request={async (params) => {
          const msg = await getCompanies({
            page: params.current,
            pageSize: params.pageSize,
            company_name: searchTextRef.current || undefined,
          });
          return {
            data: msg.data,
            success: msg.success,
            total: msg.total,
          };
        }}
        columns={columns}
        scroll={{ x: 1400 }}
        locale={{ emptyText: '还没有单位，请点击上方「新建单位」开始' }}
      />
    </PageContainer>
  );
};

export default CompanyList;
