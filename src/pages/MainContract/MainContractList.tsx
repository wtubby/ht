import AttachmentIndicator from '@/components/AttachmentIndicator';
import ListToolbar from '@/components/ListToolbar';
import { MODULE_COLORS, UI_COLORS } from '@/constants/colors';
import {
  contractStatusColors,
  getContractStatusColor,
  RECEIVE_AMOUNT_STAT_HINT,
} from '@/constants/statusColors';
import { useRemoveMainContract } from '@/hooks';
import { getMainContracts } from '@/services/wtu/mainContract.api';
import { getErrorMessage } from '@/utils/apiError';
import { formatAmountOrDash, renderAmountWithPercentage } from '@/utils/format';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { App, Tag, Tooltip } from 'antd';
import React, { useRef } from 'react';

// 扩展MainContract类型以包含has_files属性
type MainContractWithFiles = API.MainContract & {
  has_files?: boolean;
};

interface MainContractListProps {
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  onViewDetail: (record: MainContractWithFiles) => void;
  onEdit: (record: MainContractWithFiles) => void;
  onCreate: () => void;
}

const MainContractList: React.FC<MainContractListProps> = ({
  actionRef: externalActionRef,
  onViewDetail,
  onEdit,
  onCreate,
}) => {
  const { message, modal } = App.useApp();
  const internalActionRef = useRef<ActionType>();
  const actionRef = externalActionRef || internalActionRef;
  const searchTextRef = useRef<string>('');

  // 使用 TanStack Query 的删除 mutation
  const removeMutation = useRemoveMainContract();

  const handleRemove = async (selectedRow: MainContractWithFiles) => {
    if (!selectedRow) return;

    try {
      await removeMutation.mutateAsync({ id: selectedRow.id! });
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error(getErrorMessage(error, '删除失败，请重试'));
    }
  };

  const confirmRemove = (record: MainContractWithFiles) => {
    modal.confirm({
      title: '确认删除',
      content: `您确定要删除合同"${record.contract_name}"吗？仅当无分包、收款、销项发票、付款等关联数据时可删除。`,
      onOk: () => handleRemove(record),
    });
  };

  const handleSearch = (value: string) => {
    searchTextRef.current = value;
    actionRef.current?.reload();
  };

  const columns: ProColumns<MainContractWithFiles>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 40,
      align: 'center',
    },
    {
      title: '签约日期',
      dataIndex: 'date_signed',
      valueType: 'date',
      width: 70,
      align: 'center',
    },
    {
      title: '合同状态',
      dataIndex: 'contract_status',
      valueEnum: contractStatusColors,
      width: 60,
      align: 'center',
      render: (_, record) => (
        <Tag color={getContractStatusColor(record.contract_status!)}>{record.contract_status}</Tag>
      ),
    },
    {
      title: '合同名称',
      dataIndex: 'contract_name',
      ellipsis: true,
      width: 260,
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AttachmentIndicator
            visible={record.has_files}
            title="已上传合同文件"
            color={MODULE_COLORS.mainContract.color}
          />
          <a
            onClick={() => onViewDetail(record)}
            style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {text}
          </a>
        </div>
      ),
    },
    {
      title: '发包单位',
      dataIndex: ['partyA', 'company_name'],
      width: 180,
      ellipsis: true,
    },
    {
      title: '开工日期',
      dataIndex: 'date_start',
      valueType: 'date',
      width: 70,
      align: 'center',
    },
    {
      title: '竣工日期',
      dataIndex: 'date_end',
      valueType: 'date',
      width: 70,
      align: 'center',
    },
    {
      title: '合同金额(元)',
      dataIndex: 'amount_contract',
      width: 90,
      align: 'right',
      render: (text) => formatAmountOrDash(text),
    },
    {
      title: '结算金额(元)',
      dataIndex: 'amount_settlement',
      width: 90,
      align: 'right',
      render: (text) => formatAmountOrDash(text),
    },
    {
      title: '收款(元)',
      dataIndex: 'total_received',
      width: 90,
      align: 'right',
      tooltip: RECEIVE_AMOUNT_STAT_HINT,
      render: (text, record) => renderAmountWithPercentage(text, record),
    },
    {
      title: '开票(元)',
      dataIndex: 'total_invoiced',
      width: 90,
      align: 'right',
      render: (text, record) => renderAmountWithPercentage(text, record),
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      width: 50,
      align: 'center',
      render: (_, record) => [
        <Tooltip key="edit" title="编辑">
          <EditOutlined
            style={{ fontSize: '16px', color: UI_COLORS.action, cursor: 'pointer' }}
            onClick={() => onEdit(record)}
          />
        </Tooltip>,
        <Tooltip key="delete" title="删除">
          <DeleteOutlined
            style={{
              fontSize: '16px',
              color: UI_COLORS.actionDanger,
              cursor: 'pointer',
              marginLeft: '12px',
            }}
            onClick={() => confirmRemove(record)}
          />
        </Tooltip>,
      ],
    },
  ];

  return (
    <PageContainer pageHeaderRender={false}>
      <ProTable<MainContractWithFiles, API.PageParams>
        headerTitle="总包合同管理"
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
            placeholder="搜索合同名称"
            createText="新建合同"
            onSearch={handleSearch}
            onCreate={onCreate}
          />,
        ]}
        request={async (params) => {
          const msg = await getMainContracts({
            page: params.current,
            pageSize: params.pageSize,
            contract_name: searchTextRef.current || undefined,
          });

          return {
            data: msg.data,
            success: msg.success,
            total: msg.total,
          };
        }}
        columns={columns}
        scroll={{ x: 1200 }}
        locale={{ emptyText: '还没有总包合同，请先创建单位后再新建总包合同' }}
      />
    </PageContainer>
  );
};

export default MainContractList;
